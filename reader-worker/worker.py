"""
Tree Tree Reader v2 — pluggable parse/enrich worker (FastAPI).

POST /parse   multipart: file (photo / screenshot / audio recording), title (optional)
   -> Learning Source JSON: {id,title,kind,createdAt,pages:[{n,img,w,h,s:[sid]}],
                             sentences:[{id,p,en,zh,t:[[start,end,lemma]]}], words:[{w,zh,ph,freq,pages,ex,forms}]}
   images -> OCR ; audio -> speech-to-text ; then sentences, optional translation, word glosses
POST /enrich  json {words:[{w, sentence}]} -> {entries:{w:{zh,phrases,scene,dlg}}}   (needs an LLM)

Every engine is chosen by ENV (no secrets in code):
  OCR_ENGINE        rapidocr (default, local/free) | tesseract (needs the tesseract binary + pytesseract)
                    | vision (OpenAI-compatible vision model; uses LLM_* vars)
  STT_ENGINE        faster-whisper (default, local/free; WHISPER_LOCAL_MODEL=tiny.en|base.en|small.en)
                    | openai (Whisper-compatible API: WHISPER_BASE_URL, WHISPER_API_KEY, WHISPER_MODEL=whisper-1)
  LLM_BASE_URL / LLM_API_KEY / LLM_MODEL   OpenAI-compatible chat API (translation + /enrich). Optional.
  ECDICT_CSV        path to ecdict.csv (word glosses/phonetics, MIT licensed)
  WORKER_TOKEN      if set, callers must send  Authorization: Bearer <WORKER_TOKEN>
  ALLOW_ORIGIN      CORS origin (default https://treetreeacademy.com)
  MAX_UPLOAD_MB     default 25

Run: pip install fastapi uvicorn python-multipart pillow rapidocr_onnxruntime faster-whisper
     uvicorn worker:app --host 0.0.0.0 --port 8787
"""
import os, re, io, json, base64, csv, time, tempfile, urllib.request
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps
try:
    from us_ipa import us as us_ipa   # CMUdict (pip install cmudict) -> US IPA
except Exception:
    us_ipa = lambda w: ""

app = FastAPI(title="Tree Tree Reader worker v2")
app.add_middleware(CORSMiddleware, allow_origins=[os.getenv("ALLOW_ORIGIN", "https://treetreeacademy.com")],
                   allow_methods=["POST"], allow_headers=["*"])
TOK = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)?")
IRR = {'does':'do','did':'do','done':'do','was':'be','were':'be','is':'be','are':'be','am':'be','been':'be','has':'have','had':'have',
       'teeth':'tooth','feet':'foot','children':'child','people':'people','lives':'life','leaves':'leaf','mice':'mouse','went':'go'}
_D = None
def dic():
    global _D
    if _D is None:
        _D = {}
        p = os.getenv("ECDICT_CSV", "ecdict.csv")
        if os.path.exists(p):
            csv.field_size_limit(10**9)
            for r in csv.DictReader(open(p, encoding="utf-8")):
                w = r["word"]
                if re.fullmatch(r"[A-Za-z][A-Za-z'\-]*", w): _D.setdefault(w.lower(), r)
    return _D
def lemma(w):
    w = w.lower().replace("’", "'")
    if w == "i": return "I"
    if w in IRR: return IRR[w]
    if w.endswith("'s"): w = w[:-2]
    r = dic().get(w)
    if r and r.get("exchange"):
        ex = dict(p.split(":", 1) for p in r["exchange"].split("/") if ":" in p)
        b = ex.get("0")
        if b and b.lower() in dic() and len(b) > 1: return b.lower()
    return w
def gloss(w):
    r = dic().get(w.lower())
    if not r: return ""
    lines = [l for l in r["translation"].replace("\\n", "\n").split("\n") if l.strip() and not l.startswith("[")]
    if not lines: return ""
    m = re.match(r"^([a-z]+\.)\s*(.*)$", lines[0]); pos, body = (m.group(1) + " ", m.group(2)) if m else ("", lines[0])
    return (pos + "；".join([p.strip() for p in re.split("[；;,，]", body) if p.strip()][:3]))[:40]

def _us(w):
    try: return us_ipa(w)
    except Exception: return ""

def auth(authorization):
    tok = os.getenv("WORKER_TOKEN")
    if tok and authorization != "Bearer " + tok: raise HTTPException(401, "unauthorized")

def llm(prompt, image_b64=None):
    base, key, model = os.getenv("LLM_BASE_URL"), os.getenv("LLM_API_KEY"), os.getenv("LLM_MODEL")
    if not (base and key and model): return None
    content = [{"type": "text", "text": prompt}]
    if image_b64: content.append({"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + image_b64}})
    req = urllib.request.Request(base.rstrip("/") + "/chat/completions", method="POST",
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
        data=json.dumps({"model": model, "temperature": 0.3, "messages": [{"role": "user", "content": content if image_b64 else prompt}]}).encode())
    return json.load(urllib.request.urlopen(req, timeout=180))["choices"][0]["message"]["content"]

# ---------------- OCR ----------------
_rapid = None
def ocr_lines(im):
    eng = os.getenv("OCR_ENGINE", "rapidocr")
    if eng == "tesseract":
        import pytesseract
        d = pytesseract.image_to_data(im, output_type=pytesseract.Output.DICT)
        lines = {}
        for i, t in enumerate(d["text"]):
            if t.strip() and float(d["conf"][i]) > 50:
                k = (d["block_num"][i], d["par_num"][i], d["line_num"][i])
                x, y, w, h = d["left"][i], d["top"][i], d["width"][i], d["height"][i]
                L = lines.setdefault(k, [x, y, x + w, y + h, []])
                L[0] = min(L[0], x); L[1] = min(L[1], y); L[2] = max(L[2], x + w); L[3] = max(L[3], y + h); L[4].append(t)
        return [(a, b, c, e, " ".join(ws)) for a, b, c, e, ws in lines.values()]
    if eng == "vision":
        buf = io.BytesIO(); im.save(buf, "JPEG", quality=85)
        txt = llm("Transcribe ALL English text in this image exactly, keeping paragraph breaks (blank line between paragraphs). "
                  "Ignore page numbers and decorative text. Output only the text.", base64.b64encode(buf.getvalue()).decode())
        return [(0, i * 10, 1000, i * 10 + 8, p) if p else None for i, p in enumerate((txt or "").split("\n"))]
    global _rapid
    if _rapid is None:
        from rapidocr_onnxruntime import RapidOCR; _rapid = RapidOCR()
    import numpy as np
    res, _ = _rapid(np.array(im), box_thresh=0.3, unclip_ratio=2.0)
    out = []
    for box, text, conf in (res or []):
        if float(conf) < 0.6: continue
        xs = [p[0] for p in box]; ys = [p[1] for p in box]
        out.append((min(xs), min(ys), max(xs), max(ys), text))
    return out
def paragraphs(rows):
    if rows and rows[0] is None or any(r is None for r in rows):   # vision mode: blank line = paragraph break
        paras, cur = [], []
        for r in rows:
            if r is None:
                if cur: paras.append(" ".join(cur)); cur = []
            else: cur.append(r[4])
        if cur: paras.append(" ".join(cur))
        return paras
    rows = sorted(rows, key=lambda r: r[1]); blocks = []
    for r in rows:
        h = max(1, r[3] - r[1]); best = None; bg = 1e9
        for b in blocks:
            l = b[-1]; g = r[1] - l[3]
            if abs(r[0] - b[0][0]) < 1.5 * h and -0.3 * h < g < 1.1 * h and min(r[2], l[2]) > max(r[0], l[0]) and g < bg: best, bg = b, g
        (best.append(r) if best else blocks.append([r]))
    out = []
    for b in blocks:
        t = ""
        for r in b: t = t[:-1] + r[4] if t.endswith("-") else (t + " " + r[4] if t else r[4])
        out.append(re.sub(r"([,.;:!?])(?=[A-Za-z])", r"\1 ", t))
    return out

# ---------------- speech to text ----------------
_fw = None
def transcribe(data, filename):
    eng = os.getenv("STT_ENGINE", "faster-whisper")
    suffix = os.path.splitext(filename or "a.m4a")[1] or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f: f.write(data); path = f.name
    try:
        if eng == "openai":
            import uuid
            bnd = uuid.uuid4().hex; model = os.getenv("WHISPER_MODEL", "whisper-1")
            body = (f"--{bnd}\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n{model}\r\n"
                    f"--{bnd}\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\nen\r\n"
                    f"--{bnd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"audio{suffix}\"\r\n"
                    f"Content-Type: application/octet-stream\r\n\r\n").encode() + data + f"\r\n--{bnd}--\r\n".encode()
            req = urllib.request.Request(os.environ["WHISPER_BASE_URL"].rstrip("/") + "/audio/transcriptions", data=body, method="POST",
                headers={"Authorization": "Bearer " + os.environ["WHISPER_API_KEY"], "Content-Type": "multipart/form-data; boundary=" + bnd})
            return [json.load(urllib.request.urlopen(req, timeout=300))["text"]]
        global _fw
        if _fw is None:
            from faster_whisper import WhisperModel
            _fw = WhisperModel(os.getenv("WHISPER_LOCAL_MODEL", "tiny.en"), device="cpu", compute_type="int8")
        segs, _ = _fw.transcribe(path, language="en", vad_filter=True)
        return [" ".join(s.text.strip() for s in segs)]
    finally:
        os.unlink(path)

def sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z"“])', re.sub(r"\s+", " ", text)) if len(TOK.findall(s)) >= 2]
def translate(sents):
    if not sents: return []
    out = []
    for i in range(0, len(sents), 40):
        chunk = sents[i:i + 40]
        try:
            txt = llm("把下面的英文句子翻译成适合孩子的简体中文，自然准确。只返回 JSON 数组，长度与输入相同。\n" + json.dumps(chunk, ensure_ascii=False))
            arr = json.loads(txt[txt.index("["): txt.rindex("]") + 1]) if txt else []
        except Exception:
            arr = []
        out += [arr[k] if k < len(arr) else None for k in range(len(chunk))]
    return out

def build_source(title, kind, pages_text, thumbs):
    sents, words, pages = [], {}, []
    flat = [s for pg in pages_text for para in pg for s in sentences(para)]
    zh = translate(flat); zi = 0
    for pi, paras in enumerate(pages_text):
        ids = []
        for para in paras:
            for k, en in enumerate(sentences(para)):
                sid = len(sents); toks = []
                for m in TOK.finditer(en):
                    t = m.group(0)
                    if len(t) == 1 and t.lower() not in ("a", "i"): continue
                    lm = lemma(t); toks.append([m.start(), m.end(), lm])
                    W = words.setdefault(lm, {"w": lm, "zh": gloss(lm), "ph": (dic().get(lm.lower()) or {}).get("phonetic", ""),
                                              "freq": 0, "pages": [], "ex": sid, "forms": [], "us": _us(lm)})
                    W["freq"] += 1
                    if pi + 1 not in W["pages"]: W["pages"].append(pi + 1)
                    if t.lower() not in W["forms"]: W["forms"].append(t.lower())
                sents.append({"id": sid, "p": pi + 1, "en": en, "zh": zh[zi] if zi < len(zh) else None, "para": k == 0, "t": toks}); zi += 1
                ids.append(sid)
        th = thumbs[pi] if pi < len(thumbs) else None
        pages.append({"n": pi + 1, "img": th[0] if th else None, "w": th[1] if th else 0, "h": th[2] if th else 0, "s": ids})
    return {"id": "s" + hex(int(time.time() * 1000))[2:], "title": title, "kind": kind, "createdAt": int(time.time() * 1000),
            "pages": pages, "sentences": sents, "words": sorted(words.values(), key=lambda w: (-w["freq"], w["w"]))}

@app.post("/parse")
async def parse(file: UploadFile | None = File(None), title: str = Form(""), text: str = Form(""),
                kind: str = Form(""), authorization: str | None = Header(None)):
    """Either upload a file, or send corrected/pasted `text` (blank line = new paragraph)."""
    auth(authorization)
    if file is None:
        paras = [p.strip() for p in re.split(r"\n\s*\n", text or "") if p.strip()]
        if not paras: raise HTTPException(400, "no file or text")
        src = build_source(title or "我的文字", kind or "text", [paras], [])
        if not src["sentences"]: raise HTTPException(422, "没有识别到英文文字")
        return src
    data = await file.read()
    if len(data) > int(os.getenv("MAX_UPLOAD_MB", "25")) * 1024 * 1024: raise HTTPException(413, "file too large")
    ct = (file.content_type or "").lower(); name = file.filename or ""
    if ct.startswith("audio/") or ct.startswith("video/") or re.search(r"\.(m4a|mp3|wav|webm|ogg|aac|mp4|caf)$", name, re.I):
        try: text = transcribe(data, name)
        except Exception as e: raise HTTPException(500, f"语音识别失败: {e}")
        src = build_source(title or "我的录音", "audio", [text], [])
    else:
        try: im = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        except Exception: raise HTTPException(400, "unsupported file")
        paras = paragraphs(ocr_lines(im))
        H = min(1200, im.height); Wd = round(im.width * H / im.height); buf = io.BytesIO()
        im.resize((Wd, H), Image.LANCZOS).save(buf, "JPEG", quality=70)
        src = build_source(title or "我的照片", "photo", [paras], [("data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode(), Wd, H)])
    if not src["sentences"]: raise HTTPException(422, "没有识别到英文文字")
    return src

@app.post("/enrich")
async def enrich(payload: dict = Body(...), authorization: str | None = Header(None)):
    """Learning content for words not in the built-in lexicon. Scenes are ALWAYS AI stories (labelled) —
    the model is not allowed to invent quotes or attributions."""
    auth(authorization)
    items = payload.get("words", [])[:20]
    if not items: return {"entries": {}}
    prompt = ("You write learning content for Chinese children learning English. For each item return JSON object keyed by word:\n"
              '{"word":{"zh":"简明中文释义","phrases":[["common collocation/idiom","中文"],["...","..."]],'
              '"scene":["ai","2-3 sentence funny or thought-provoking original story using the word","中文翻译"],'
              '"dlg":["first half of a short dialogue (1-2 lines)","natural correct reply using the word","plausible but wrong reply"]}}\n'
              "Rules: phrases must be real, common English. Do NOT quote songs, films, books or people. Keep it kid-friendly.\n"
              + json.dumps(items, ensure_ascii=False))
    txt = llm(prompt)
    if not txt: raise HTTPException(501, "LLM not configured")
    try: data = json.loads(txt[txt.index("{"): txt.rindex("}") + 1])
    except Exception: raise HTTPException(502, "bad LLM output")
    for v in data.values():
        if isinstance(v, dict) and v.get("scene"): v["scene"] = ["ai"] + list(v["scene"][1:3])
    return {"entries": data}

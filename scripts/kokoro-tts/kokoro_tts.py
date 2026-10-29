#!/usr/bin/env python3
"""Voice everything 树儿读读乐 speaks with Kokoro-82M (Apache-2.0) on the box and upload the clips.

  kokoro_tts.py [--full] [--site https://treetreeacademy.com] [--limit N] [--verify]
  --full    collect ALL speakable text from the store (books, shared, lex, dialogues, progress) — else wants only
  --verify  re-check the local "done" list against the store (repairs a lost/stale cache)

Token: env READER_IMPORT_TOKEN or /workspace/.secrets/READER_IMPORT_TOKEN (never printed).
Model files: $KOKORO_DIR (default /workspace/kokoro): kokoro-v1.0.onnx, voices-v1.0.bin. Idempotent; lock-protected.
"""
import argparse, base64, fcntl, json, os, subprocess, sys, time, urllib.request
import numpy as np

KDIR = os.environ.get("KOKORO_DIR", "/workspace/kokoro")
LOG = os.environ.get("KOKORO_LOG", "/workspace/logs/kokoro-tts.log")
DONE = os.path.join(KDIR, "done.json")
VOICE = {"n": "af_heart", "a": "af_bella", "b": "am_puck"}
SR = 24000

def log(*a):
    line = time.strftime("%Y-%m-%d %H:%M:%S ") + " ".join(str(x) for x in a)
    print(line, flush=True)
    with open(LOG, "a") as f: f.write(line + "\n")

def token():
    t = os.environ.get("READER_IMPORT_TOKEN") or open("/workspace/.secrets/READER_IMPORT_TOKEN").read()
    return t.strip()

def api(site, path, body=None, raw=False, timeout=90):
    req = urllib.request.Request(site + path, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json", "User-Agent": "kokoro-tts/1"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        b = r.read()
        return b if raw else json.loads(b)

def clean(a):
    a = a.astype(np.float32); a -= float(np.mean(a))
    w = 240; n = len(a) // w
    if n:
        e = np.abs(a[: n * w]).reshape(n, w).max(1); idx = np.where(e > 0.012)[0]
        if len(idx):
            s = max(0, idx[0] * w - 1440); t = min(len(a), (idx[-1] + 1) * w + 1440); a = a[s:t]
    rms = float(np.sqrt(np.mean(a * a))) or 1e-6
    g = min(0.11 / rms, 0.89 / (float(np.max(np.abs(a))) or 1e-6)); a = a * g   # consistent loudness, peak <= -1 dBFS
    fi, fo = int(SR * .012), int(SR * .06)
    if len(a) > fi + fo:
        a[:fi] *= np.linspace(0, 1, fi); a[-fo:] *= np.linspace(1, 0, fo) ** 2
    return np.concatenate([np.zeros(int(SR * .03), np.float32), a, np.zeros(int(SR * .08), np.float32)])

def mp3(a):
    pcm = (np.clip(a, -1, 1) * 32767).astype("<i2").tobytes()
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-b:a", "48k", "-f", "mp3", "-"],
                       input=pcm, capture_output=True, check=True)
    return p.stdout

def spoken(t):
    # single words: add a full stop so Kokoro reads them with a natural, falling "dictionary" intonation
    return t + "." if t.replace("'", "").isalpha() else t

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default=os.environ.get("READER_SITE", "https://treetreeacademy.com"))
    ap.add_argument("--full", action="store_true"); ap.add_argument("--verify", action="store_true")
    ap.add_argument("--limit", type=int, default=100000)
    o = ap.parse_args()
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    lock = open(os.path.join(KDIR, ".lock"), "w")
    try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError: log("another run is active; skip"); return
    done = set(json.load(open(DONE))) if os.path.exists(DONE) else set()
    t0 = time.time()
    items = api(o.site, "/api/reader-import/tts?mode=" + ("collect" if o.full else "wants"), timeout=120)["items"]
    if o.verify:
        ks = [x["k"] for x in items]; have = set()
        for i in range(0, len(ks), 1000):
            r = api(o.site, "/api/reader-import/tts", {"check": ks[i:i + 1000]}); have |= {k for k, h in zip(r["keys"], r["have"]) if h}
        done = (done - set(ks)) | have
    todo = [x for x in items if x["k"] not in done][: o.limit]
    log(f"{'full' if o.full else 'wants'}: {len(items)} items, {len(todo)} to voice")
    if not todo:
        json.dump(sorted(done), open(DONE, "w")); return
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(KDIR, "kokoro-v1.0.onnx"), os.path.join(KDIR, "voices-v1.0.bin"))
    batch, bsz, ok, fail = [], 0, 0, 0
    def flush():
        nonlocal batch, bsz, ok
        if not batch: return
        for tries in range(3):
            try: r = api(o.site, "/api/reader-import/tts", {"items": [{"t": x["t"], "v": x["v"], "b64": x["b64"]} for x in batch]}); break
            except Exception as e:
                log("upload retry", tries, type(e).__name__); time.sleep(5 * (tries + 1))
        else: raise SystemExit("upload failed")
        ok += r.get("stored", 0); done.update(x["k"] for x in batch)
        json.dump(sorted(done), open(DONE, "w")); batch, bsz = [], 0
    for i, x in enumerate(todo):
        try:
            sp = 0.9 if x["v"] == "n" and " " not in x["t"] else (0.95 if x["v"] == "n" else 1.0)
            a, sr = k.create(spoken(x["t"]), voice=VOICE[x["v"]], speed=sp, lang="en-us")
            b = base64.b64encode(mp3(clean(a))).decode()
        except Exception as e:
            fail += 1; log("fail", repr(x["t"][:40]), type(e).__name__); continue
        batch.append({**x, "b64": b}); bsz += len(b)
        if len(batch) >= 60 or bsz > 2_500_000: flush()
        if i and i % 200 == 0: log(f"  {i}/{len(todo)} voiced, {time.time() - t0:.0f}s")
    flush()
    log(f"done: {ok} stored, {fail} failed, {time.time() - t0:.0f}s")

if __name__ == "__main__":
    main()

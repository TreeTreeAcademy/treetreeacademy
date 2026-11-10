#!/usr/bin/env python3
"""Drop Kokoro clips that already have a Gemini copy, and dialogue clips not needed
for the newest book's words. Everything was backed up first. No book text is printed."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import kvapi
from kk import kk_key, tts_key, talk_key, kk_norm

ROOT = Path("/workspace/backups/upstash-20261110")
LOG = ROOT / "audio-free-log.json"

def talk_paths():
    return list((ROOT / "reader" / "talk").rglob("*")) if (ROOT / "reader" / "talk").exists() else []

def load_json_key(k):
    p = ROOT / Path(*k.split(":"))
    return json.loads(p.read_text()) if p.exists() else None

def clip_keys_for_talk(t):
    ks = []
    if t.get("a") and t["a"].get("en"):
        ks.append(kk_key(t["a"]["en"], "a"))
    if t.get("ok") and t["ok"].get("en"):
        ks.append(kk_key(t["ok"]["en"], "b"))
    for w in t.get("wrong") or []:
        if w and w.get("en"):
            ks.append(kk_key(w["en"], "b"))
    return ks

def newest_book():
    idx = load_json_key("reader:mybooks:sasha")
    items = idx if isinstance(idx, list) else []
    if not items:
        raise SystemExit("no books")
    # already newest-first
    b = items[0]
    body = load_json_key(f"reader:mybook:sasha:{b['id']}")
    words = []
    for w in (body or {}).get("words") or []:
        ww = str(w.get("w") or "").strip()
        if ww:
            words.append(ww)
    return b["id"], b.get("pages"), b.get("words"), b.get("createdAt"), words

def main():
    bid, pages, nwords, created, words = newest_book()
    print(f"newest id={bid} pages={pages} words={nwords} n_word_list={len(words)}", flush=True)

    keep_talk = set()
    for w in words:
        keep_talk.add(talk_key(w.strip().lower()))

    all_talk_clips, keep_clips = set(), set()
    talk_files = 0
    for p in (ROOT / "reader" / "talk").rglob("*"):
        if not p.is_file():
            continue
        # path reader/talk/v2/hash
        rel = p.relative_to(ROOT)
        k = ":".join(rel.parts)
        try:
            t = json.loads(p.read_text())
        except Exception:
            continue
        talk_files += 1
        ks = clip_keys_for_talk(t)
        all_talk_clips.update(ks)
        if k in keep_talk:
            keep_clips.update(ks)
    drop_talk = sorted(all_talk_clips - keep_clips)
    print(f"talk files {talk_files} talk-clip-keys {len(all_talk_clips)} keep {len(keep_clips)} drop {len(drop_talk)}", flush=True)

    # Gemini overlaps via collect (need text, not printed)
    import urllib.request, os
    tok = open("/workspace/.secrets/READER_IMPORT_TOKEN").read().strip()
    req = urllib.request.Request(
        os.environ.get("READER_SITE", "https://treetreeacademy.com") + "/api/reader-import/tts?mode=collect",
        headers={"Authorization": "Bearer " + tok},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        items = json.load(r)["items"]
    pairs = []
    for it in items:
        t, v = it.get("t") or "", it.get("v") or "n"
        pairs.append((tts_key(t, v), kk_key(t, v)))
    # unique
    seen=set(); uniq=[]
    for a,b in pairs:
        if (a,b) in seen: continue
        seen.add((a,b)); uniq.append((a,b))
    have_g, have_k = set(), set()
    ts, ks = [a for a,_ in uniq], [b for _,b in uniq]
    for i in range(0, len(ts), 1500):
        eg = kvapi.exists(ts[i:i+1500])
        ek = kvapi.exists(ks[i:i+1500])
        for k,h in zip(eg["keys"], eg["have"]):
            if h: have_g.add(k)
        for k,h in zip(ek["keys"], ek["have"]):
            if h: have_k.add(k)
    drop_kk = sorted({kk for tt,kk in uniq if tt in have_g and kk in have_k})
    print(f"gemini+kokoro overlaps to drop {len(drop_kk)}", flush=True)

    drop = sorted(set(drop_talk) | set(drop_kk))
    # only delete keys that exist in the backup (safety)
    backed = set(json.loads((ROOT/"manifest.json").read_text())["files"])
    missing = [k for k in drop if k not in backed]
    drop = [k for k in drop if k in backed]
    print(f"delete {len(drop)} (not in backup skipped {len(missing)})", flush=True)

    # batch delete
    deleted = 0
    for i in range(0, len(drop), 400):
        r = kvapi.delete(drop[i:i+400])
        deleted += r.get("del") or 0
        print(f"  del {deleted}/{len(drop)}", flush=True)

    log = {
        "newest": {"id": bid, "pages": pages, "words": nwords, "createdAt": created, "wordList": len(words)},
        "talkFiles": talk_files,
        "talkClips": len(all_talk_clips),
        "keepTalkClips": len(keep_clips),
        "dropTalk": len(drop_talk),
        "dropGeminiOverlap": len(drop_kk),
        "deleted": deleted,
        "keys": drop,  # keys only, no text
    }
    LOG.write_text(json.dumps(log))
    print("wrote", LOG, "deleted", deleted, flush=True)

if __name__ == "__main__":
    main()

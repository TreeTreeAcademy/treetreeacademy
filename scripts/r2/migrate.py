#!/usr/bin/env python3
"""Copy KV page images and TTS clips to private R2, then optionally swap KV values for tiny pointers.
JSON book/talk/roots records stay in Upstash. The app reads R2 first and falls back to KV, so this
can be turned on the moment credentials exist.

  python3 scripts/r2/migrate.py            # dry-run counts
  python3 scripts/r2/migrate.py --copy     # upload objects; leave KV payloads in place
  python3 scripts/r2/migrate.py --swap     # after --copy, replace KV audio/images with {r2,t,size}

Never prints credentials, book text, or object bodies. Does not sign up for Cloudflare.
Requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (and the import token).
"""
import argparse, base64, json, os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "kv-compact"))
import kvapi
import r2client

IMG_RE = re.compile(r"^reader:mybookimg:([^:]+):([^:]+):(\d+)$")
KK_RE = re.compile(r"^reader:kk:v1:([0-9a-f]{24})$")
TTS_RE = re.compile(r"^reader:tts:v3:([0-9a-f]{24})$")

def ext_for(t: str) -> str:
    t = (t or "").lower()
    if "webp" in t: return "webp"
    if "png" in t: return "png"
    return "jpg"

def already_pointer(s: str):
    if not s or not s.startswith("{"):
        return None
    try:
        j = json.loads(s)
    except Exception:
        return None
    return j if isinstance(j, dict) and j.get("r2") else None

def chunks(xs, n):
    for i in range(0, len(xs), n):
        yield xs[i:i+n]

def list_keys(match):
    r = kvapi.keys(match, 100000)
    return r.get("keys") or r.get("items") or r.get("list") or []

def load_values(ks):
    out = {}
    for batch in chunks(ks, 20):
        r = kvapi.get(batch)
        for k, v in zip(r.get("keys") or batch, r.get("vals") or []):
            if v is not None:
                out[k] = v
    return out

def migrate_images(mode: str, stats: dict):
    keys = [k for k in list_keys("reader:mybookimg:*") if IMG_RE.match(k)]
    stats["images"] = {"keys": len(keys), "copied": 0, "swapped": 0, "skipped": 0, "errors": 0}
    if mode == "dry":
        return
    for batch_keys in chunks(keys, 10):
        vals = load_values(batch_keys)
        for k, raw in vals.items():
            m = IMG_RE.match(k)
            if not m or raw is None:
                continue
            user, book, n = m.group(1), m.group(2), int(m.group(3))
            try:
                rec = json.loads(raw) if isinstance(raw, str) else raw
            except Exception:
                stats["images"]["errors"] += 1
                continue
            if rec.get("r2"):
                stats["images"]["skipped"] += 1
                continue
            b64 = rec.get("b")
            if not b64:
                stats["images"]["skipped"] += 1
                continue
            typ = rec.get("t") or "image/jpeg"
            path = f"books/{user}/{book}/p{n:03d}.{ext_for(typ)}"
            try:
                body = base64.b64decode(b64)
                if mode in ("copy", "swap"):
                    if not r2client.head(path):
                        r2client.put(path, body, typ)
                    stats["images"]["copied"] += 1
                if mode == "swap":
                    pointer = json.dumps({"r2": path, "t": typ, "size": len(body)}, separators=(",", ":"))
                    kvapi.set_many([(k, pointer)])
                    stats["images"]["swapped"] += 1
            except Exception as e:
                stats["images"]["errors"] += 1
                print("image error", k, type(e).__name__, file=sys.stderr)

def migrate_clips(kind: str, match: str, rx, mode: str, stats: dict):
    keys = [k for k in list_keys(match) if rx.match(k)]
    stats[kind] = {"keys": len(keys), "copied": 0, "swapped": 0, "skipped": 0, "errors": 0}
    if mode == "dry":
        return
    prefix = f"clips/{kind}/"
    for batch_keys in chunks(keys, 20):
        vals = load_values(batch_keys)
        for k, raw in vals.items():
            m = rx.match(k)
            if not m or raw is None:
                continue
            h = m.group(1)
            path = prefix + h
            if already_pointer(raw if isinstance(raw, str) else ""):
                stats[kind]["skipped"] += 1
                continue
            if not isinstance(raw, str) or raw.startswith("{"):
                stats[kind]["skipped"] += 1
                continue
            try:
                body = base64.b64decode(raw)
                if mode in ("copy", "swap"):
                    if not r2client.head(path):
                        r2client.put(path, body, "audio/mpeg")
                    stats[kind]["copied"] += 1
                if mode == "swap":
                    pointer = json.dumps({"r2": path, "size": len(body)}, separators=(",", ":"))
                    kvapi.set_many([(k, pointer)])
                    stats[kind]["swapped"] += 1
            except Exception as e:
                stats[kind]["errors"] += 1
                print("clip error", kind, k, type(e).__name__, file=sys.stderr)

def main():
    ap = argparse.ArgumentParser(description="Migrate images and audio from Upstash KV to private R2")
    ap.add_argument("--copy", action="store_true", help="upload objects to R2; keep KV payloads")
    ap.add_argument("--swap", action="store_true", help="upload if needed, then replace KV values with pointers")
    args = ap.parse_args()
    mode = "swap" if args.swap else "copy" if args.copy else "dry"
    if mode != "dry" and not r2client.configured():
        print("Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.", file=sys.stderr)
        sys.exit(2)
    if mode == "dry":
        print("dry-run (no writes). Pass --copy or --swap when credentials exist.")
    stats = {}
    migrate_images(mode, stats)
    migrate_clips("kk", "reader:kk:v1:*", KK_RE, mode, stats)
    migrate_clips("tts", "reader:tts:v3:*", TTS_RE, mode, stats)
    print(json.dumps({"mode": mode, "stats": stats}, indent=2))

if __name__ == "__main__":
    main()

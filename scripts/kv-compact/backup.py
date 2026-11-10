#!/usr/bin/env python3
"""Backup reader:* media/json to the box. No book text is printed."""
import hashlib, json, os, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import kvapi

ROOT = Path(os.environ.get("KV_BACKUP", "/workspace/backups/upstash-20261110"))
PREFIXES = [
    "reader:mybookimg:*",
    "reader:kk:v1:*",
    "reader:tts:v3:*",
    "reader:mybook:*",
    "reader:mybooks:*",
    "reader:talk:*",
]
def rel(k):
    return Path(*k.split(":"))

def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    man = {"started": time.time(), "prefixes": {}, "files": {}}
    man_path = ROOT / "manifest.json"
    if man_path.exists():
        man = json.loads(man_path.read_text())
    have = set(man.get("files", {}))
    for pref in PREFIXES:
        r = kvapi.keys(pref, lens=True)
        keys = r["keys"]
        lens = r.get("lens") or {}
        man["prefixes"][pref] = {"n": len(keys), "bytes": sum(lens.get(k) or 0 for k in keys)}
        print(f"{pref} n={len(keys)} bytes={man['prefixes'][pref]['bytes']}", flush=True)
        i = 0
        while i < len(keys):
            batch = []
            est = 0
            while i < len(keys) and len(batch) < 40:
                k = keys[i]
                n = lens.get(k) or 0
                if batch and est + n > 2_800_000:
                    break
                batch.append(k); est += n; i += 1
            need = [k for k in batch if k not in have]
            if not need:
                continue
            g = kvapi.get(need)
            for k, v in zip(g["keys"], g["vals"]):
                if v is None:
                    print("skip-empty-or-cap", k, "len", lens.get(k), flush=True)
                    # will retry smaller
                    continue
                p = ROOT / rel(k)
                p.parent.mkdir(parents=True, exist_ok=True)
                raw = v.encode("utf-8")
                p.write_bytes(raw)
                man["files"][k] = {"bytes": len(v), "sha256": hashlib.sha256(raw).hexdigest(), "path": str(p.relative_to(ROOT))}
                have.add(k)
            man_path.write_text(json.dumps(man))
            if i % 200 < 40:
                print(f"  {pref} {len(have)} files", flush=True)
    man["finished"] = time.time()
    man_path.write_text(json.dumps(man))
    print("done files", len(man["files"]), "sec", round(man["finished"]-man["started"]), flush=True)

if __name__ == "__main__":
    main()

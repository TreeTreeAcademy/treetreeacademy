#!/usr/bin/env python3
"""Recompress backed-up page images to WebP q75 and write them back to KV."""
import base64, io, json, sys, time
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
import kvapi

ROOT = Path("/workspace/backups/upstash-20261110")
LOG = Path("/workspace/backups/upstash-20261110/recompress-log.json")

def load_raw(k):
    rec = json.loads((ROOT / Path(*k.split(":"))).read_text())
    return rec, base64.b64decode(rec["b"])

def to_webp(raw, q=75):
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    buf = io.BytesIO()
    im.save(buf, format="WEBP", quality=q, method=6)
    return buf.getvalue()

def main():
    man = json.loads((ROOT / "manifest.json").read_text())
    keys = [k for k in man["files"] if k.startswith("reader:mybookimg:")]
    keys.sort()
    log = {"items": [], "before": 0, "after": 0, "before_kv": 0, "after_kv": 0}
    if LOG.exists():
        log = json.loads(LOG.read_text())
    done = {x["k"] for x in log["items"] if x.get("ok")}
    batch, batch_meta = [], []
    def flush():
        nonlocal batch, batch_meta
        if not batch:
            return
        r = kvapi.set_many(batch)
        if r.get("set") != len(batch):
            raise SystemExit(f"set failed {r}")
        batch, batch_meta = [], []
    for i, k in enumerate(keys, 1):
        if k in done:
            continue
        rec, raw = load_raw(k)
        webp = to_webp(raw)
        # keep original if webp is not meaningfully smaller (rare busy covers)
        if len(webp) >= len(raw) * 0.95:
            used, typ, raw_out = raw, rec.get("t") or "image/jpeg", raw
            skipped = True
        else:
            used, typ, raw_out, skipped = webp, "image/webp", webp, False
        new = json.dumps({"t": typ, "b": base64.b64encode(raw_out).decode()}, separators=(",", ":"))
        old_kv = man["files"][k]["bytes"]
        log["items"].append({"k": k, "ok": True, "raw0": len(raw), "raw1": len(used), "kv0": old_kv, "kv1": len(new), "type": typ, "skipped": skipped})
        log["before"] += len(raw); log["after"] += len(used)
        log["before_kv"] += old_kv; log["after_kv"] += len(new)
        batch.append((k, new)); batch_meta.append(k)
        if len(batch) >= 6 or sum(len(v) for _, v in batch) > 2_500_000:
            flush(); LOG.write_text(json.dumps(log))
            print(f"{i}/{len(keys)} kv {log['before_kv']} -> {log['after_kv']}", flush=True)
    flush(); LOG.write_text(json.dumps(log))
    print("done", "pages", len(log["items"]), "rawMB", round(log["before"]/1048576,2), "->", round(log["after"]/1048576,2),
          "kvMB", round(log["before_kv"]/1048576,2), "->", round(log["after_kv"]/1048576,2), flush=True)

if __name__ == "__main__":
    main()

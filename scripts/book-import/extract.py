#!/usr/bin/env python3
"""Split a (scanned) book PDF into page images + text layer for scripts/book-import/import-book.ts.

usage: extract.py BOOK.pdf OUTDIR [--max-side 2000] [--max-kb 900] [--store-side 0] [--store-kb 0] [--pages 1-6] [--crop-art]

Writes OUTDIR/manifest.json and OUTDIR/img/pNNN.jpg (OCR/display image, <= max-side px, <= max-kb KB).
If --store-side is given, also OUTDIR/store/pNNN.jpg (smaller copy for KV storage).
Text layer: PyMuPDF blocks in reading order (Google Drive / Pixel scans carry an invisible OCR layer).
--crop-art: for our own bilingual PDFs (English page art + Chinese strip/corner) keep only the largest embedded image
(the original English page): the picture is cropped to it and text outside it (the Chinese strip) is ignored.
Never commit the outputs (copyrighted book content).
"""
import argparse, hashlib, json, os, re, sys
import pymupdf  # PyMuPDF

def parse_range(s, n):
    if not s:
        return list(range(1, n + 1))
    out = set()
    for part in s.split(","):
        a, _, b = part.partition("-")
        a = int(a); b = int(b) if b else a
        out.update(range(max(1, a), min(n, b) + 1))
    return sorted(out)

def art_rect(page):
    """Bounding box of the largest image on the page if it is the page art (>= 30% of the page), else None."""
    best, area = None, 0.0
    for info in page.get_image_info():
        r = pymupdf.Rect(info["bbox"]) & page.rect
        if r.get_area() > area:
            best, area = r, r.get_area()
    return best if best is not None and area >= 0.3 * page.rect.get_area() else None

def jpeg_under(page, max_side, max_kb, clip=None):
    """Render page so the long side is <= max_side and the JPEG is <= max_kb (lower quality, then size)."""
    r = clip or page.rect
    side = max_side
    while True:
        zoom = side / max(r.width, r.height)
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), colorspace=pymupdf.csRGB, alpha=False, clip=clip)
        for q in (82, 74, 66, 58, 50):
            data = pix.tobytes("jpeg", jpg_quality=q)
            if len(data) <= max_kb * 1024:
                return data, pix.width, pix.height, q
        side = int(side * 0.85)
        if side < 600:
            return data, pix.width, pix.height, q

def text_blocks(page, clip=None):
    blocks = []
    for b in page.get_text("blocks", sort=False):
        x0, y0, x1, y1, txt, _no, btype = b[:7]
        if btype != 0:
            continue
        if clip is not None and not clip.contains(pymupdf.Point((x0 + x1) / 2, (y0 + y1) / 2)):
            continue
        t = re.sub(r"-\n(?=[a-z])", "", txt)          # join words hyphenated across lines
        t = re.sub(r"\s*\n\s*", " ", t).strip()
        if t:
            blocks.append({"t": t, "bbox": [round(x0), round(y0), round(x1), round(y1)]})
    return blocks

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf"); ap.add_argument("out")
    ap.add_argument("--max-side", type=int, default=2000); ap.add_argument("--max-kb", type=int, default=900)
    ap.add_argument("--store-side", type=int, default=0); ap.add_argument("--store-kb", type=int, default=0)
    ap.add_argument("--pages", default="")
    ap.add_argument("--crop-art", action="store_true")
    a = ap.parse_args()
    doc = pymupdf.open(a.pdf)
    os.makedirs(os.path.join(a.out, "img"), exist_ok=True)
    if a.store_side:
        os.makedirs(os.path.join(a.out, "store"), exist_ok=True)
    pages = []
    for n in parse_range(a.pages, doc.page_count):
        pg = doc[n - 1]
        name = f"p{n:03d}.jpg"
        clip = art_rect(pg) if a.crop_art else None
        data, w, h, q = jpeg_under(pg, a.max_side, a.max_kb, clip)
        with open(os.path.join(a.out, "img", name), "wb") as f:
            f.write(data)
        rec = {"n": n, "img": f"img/{name}", "w": w, "h": h, "bytes": len(data), "q": q, "blocks": text_blocks(pg, clip)}
        if clip is not None:
            rec["clip"] = [round(clip.x0), round(clip.y0), round(clip.x1), round(clip.y1)]
        if a.store_side:
            sd, sw, sh, sq = jpeg_under(pg, a.store_side, a.store_kb or 400, clip)
            with open(os.path.join(a.out, "store", name), "wb") as f:
                f.write(sd)
            rec.update({"store": f"store/{name}", "sw": sw, "sh": sh, "sbytes": len(sd)})
        pages.append(rec)
        print(f"\r  拆分 PDF：第 {n}/{doc.page_count} 页", end="", file=sys.stderr, flush=True)
    print(file=sys.stderr)
    meta = doc.metadata or {}
    h = hashlib.sha256()
    with open(a.pdf, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    man = {"file": os.path.basename(a.pdf), "sha256": h.hexdigest(), "pageCount": doc.page_count, "title": (meta.get("title") or "").strip(),
           "producer": meta.get("producer") or "", "cropArt": bool(a.crop_art), "pages": pages}
    with open(os.path.join(a.out, "manifest.json"), "w") as f:
        json.dump(man, f, ensure_ascii=False)
    with_text = sum(1 for p in pages if sum(len(b["t"]) for b in p["blocks"]) > 20)
    print(json.dumps({"pages": len(pages), "pagesWithTextLayer": with_text, "imgBytes": sum(p["bytes"] for p in pages),
                      "storeBytes": sum(p.get("sbytes", 0) for p in pages)}))

if __name__ == "__main__":
    main()

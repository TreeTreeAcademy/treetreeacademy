#!/usr/bin/env bash
# Import a whole-book PDF (e.g. a Google Drive / Pixel scan) into one reader's 树儿读读乐 account.
#
#   import_book.sh <google-drive-link | file.pdf> --user sasha [--title "The Brain Book"] [--title-zh 大脑之书]
#                  [--site https://treetreeacademy.com] [--dry-run] [--pages 1-6] [--rate 12] [--mode auto|text|ocr]
#                  [--crop-art] [--reuse prepared/book.json [--page-offset auto|N]]
#   --crop-art  our own bilingual PDFs: keep only the English page art (drop the Chinese strip/corner)
#   --reuse     take sentences/translations/words from an already hand-checked book.json (no Gemini calls);
#               the PDF supplies the page pictures, and its English text layer (if any) is checked against it
#
# Needs: python3 + PyMuPDF, gdown (public Drive links), node + tsx, GEMINI_API_KEY in env,
#        READER_IMPORT_TOKEN in env or /workspace/.secrets/READER_IMPORT_TOKEN (not needed for --dry-run).
# Work files (PDF, page images, checkpoints) go to $BOOK_IMPORT_DIR (default /workspace/book-imports/<sha>/) —
# copyrighted content: never commit them. Re-running the same command resumes where it stopped.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
ROOT="${BOOK_IMPORT_DIR:-/workspace/book-imports}"
TSX="${TSX:-$(command -v tsx || echo /workspace/.tools/node_modules/.bin/tsx)}"

[ $# -ge 1 ] || { sed -n '2,10p' "$0"; exit 1; }
SRC="$1"; shift
PAGES=""; CROP=""; PASS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --pages) PAGES="$2"; shift 2 ;;
    --crop-art) CROP="--crop-art"; shift ;;
    *) PASS+=("$1"); shift ;;
  esac
done
mkdir -p "$ROOT/_downloads"

# 1) get the PDF
if [[ "$SRC" =~ ^https?:// ]]; then
  FID="$(python3 - "$SRC" <<'PY'
import re,sys
u=sys.argv[1]
m=re.search(r"/d/([A-Za-z0-9_-]{10,})",u) or re.search(r"[?&]id=([A-Za-z0-9_-]{10,})",u)
print(m.group(1) if m else "")
PY
)"
  [ -n "$FID" ] || { echo "⛔ 看不懂这个链接里的 Drive 文件 ID：$SRC"; exit 1; }
  PDF="$ROOT/_downloads/$FID.pdf"
  if [ ! -s "$PDF" ]; then
    echo "⬇️  下载 Drive 文件 $FID …"
    if ! python3 -m gdown --quiet "https://drive.google.com/uc?id=$FID" -O "$PDF.part" 2>"$ROOT/_downloads/$FID.err"; then
      rm -f "$PDF.part"
      echo "⛔ 公开下载失败（文件可能没有设为「知道链接的任何人可查看」）。"
      echo "   办法：用 Google Drive 连接器（DownloadFile, file id: $FID）下载到 $PDF ，再用同一个链接重新运行（或直接传本地路径）。"
      exit 4
    fi
    mv "$PDF.part" "$PDF"
  fi
else
  PDF="$SRC"
fi
[ -s "$PDF" ] || { echo "⛔ 找不到 PDF：$PDF"; exit 1; }
head -c 5 "$PDF" | grep -q '%PDF' || { echo "⛔ 这不是 PDF 文件（可能下载到的是网页）：$PDF"; exit 1; }

# 2) split pages (skipped when already done)
SHA="$(sha256sum "$PDF" | cut -c1-12)"
WORK="$ROOT/$SHA${PAGES:+-p${PAGES//[^0-9-]/_}}${CROP:+-art}"
if [ ! -s "$WORK/manifest.json" ]; then
  echo "✂️  拆分 PDF（$(du -h "$PDF" | cut -f1)）→ $WORK"
  python3 "$HERE/extract.py" "$PDF" "$WORK" --max-side 2000 --max-kb 900 --store-side 1200 --store-kb 300 ${PAGES:+--pages "$PAGES"} $CROP
fi

# 3) AI + assemble + upload
cd "$REPO"
"$TSX" "$HERE/import-book.ts" --work "$WORK" "${PASS[@]}"
# 4) natural voice for the new book (Kokoro on the box; non-fatal — the 30-min catch-up job retries)
case " ${PASS[*]} " in *" --dry-run "*) ;; *)
  KPY="${KOKORO_PY:-/workspace/kokoro/v/bin/python}"
  if [ -x "$KPY" ]; then echo "🔊 生成真人发音（Kokoro）…"; "$KPY" "$REPO/scripts/kokoro-tts/kokoro_tts.py" --full ${SITE:+--site "$SITE"} || echo "⚠️  发音生成没完成，后台任务会自动补上"; fi ;;
esac

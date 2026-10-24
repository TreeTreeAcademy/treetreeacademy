# 树儿学院 · 学习中心 (Tree Tree Reader v2)

Login-only English learning app at **/reader** (entry: 导航「登录学习」).

Flow: **学习来源** (full original text, tap any word ⭐) → **学习区** (① Anki flip card → ② collocation/idiom MCQ → ③ usage scene with labelled source) → auto **复习区** (连连看 matching rounds → missed words go to listening dialogues with A–D options until all pass) → auto **成就仓** (parking-lot grid of mastered words + summary; select words to re-enter 学习区/复习区). All speech is US English (`en-US`, browser speech synthesis).

## What lives where

| Path | What | Public? |
|---|---|---|
| `public/reader/` | static app (index.html, app.js, app.css, config.js, lexicon.js, logo) | served **only after login** (middleware) |
| `public/reader/lexicon.js` | curated content for ~130 words: phrases, scenes, dialogues. AI stories are original and labelled 「故事由 AI 创作」; quotes are short, verified, linked (Wikipedia / Project Gutenberg) | in repo |
| `middleware.ts`, `lib/reader/*` | auth (signed httpOnly cookie), worker proxy | in repo |
| `app/login`, `app/api/reader/*` | login page, login/logout/me, books proxy, parse/enrich proxy, progress sync | in repo |
| `reader-worker/` | FastAPI worker: OCR (photo/screenshot), speech-to-text (audio), optional LLM translation + AI content | in repo; deploy separately |
| **book scans + book text** (`catalog.json`, `<id>/book.json`, `<id>/img/*.jpg`) | copyrighted picture-book content | **NOT in this repo** – private store, see below |

> ⚠️ This repository is public. Never commit book scans or book text. `.gitignore` blocks `public/reader/books/` and `reader-assets/`.

## Vercel environment variables

| Variable | Required | Value |
|---|---|---|
| `READER_USERS` | yes | `name:scrypt$salt$hash;name2:...` — create each entry with `node scripts/reader-hash-password.mjs <name> <password>` (passwords are never stored in plain text) |
| `READER_SESSION_SECRET` | yes | 32+ random chars (`openssl rand -base64 32`). Changing it logs everyone out |
| `READER_ASSETS_BASE_URL` | for built-in books | private base URL of the book assets folder, e.g. `https://raw.githubusercontent.com/TreeTreeAcademy/treetree-reader-assets/main/books` (PRIVATE repo) or a private S3/R2 prefix |
| `READER_ASSETS_TOKEN` | with a private repo/bucket | read-only token sent as `Authorization: Bearer …` (e.g. fine-grained GitHub PAT with *Contents: read* on that one private repo) |
| `READER_ASSETS_DIR` | alt. (self-host/dev) | local folder instead of a URL |
| `READER_WORKER_URL` | for uploads / AI | URL of the deployed `reader-worker` |
| `READER_WORKER_TOKEN` | with worker | same value as the worker's `WORKER_TOKEN` |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | optional | Upstash / Vercel KV (already used by /plan). Enables cross-device progress sync at `/api/reader/progress` (key `reader:progress:<user>`) |

Without the books variables the app still works (empty shelf + uploads). Without the worker, uploads show a clear "not configured" message. Without KV, progress stays in the browser (`localStorage` key `tt2.<user>.state`, uploaded sources in IndexedDB `tt2-<user>`).

## Auth details
* `middleware.ts` guards `/reader`, `/reader/*` and `/api/reader/*` (except `/api/reader/login`). Pages redirect to `/login?next=…`; APIs return 401.
* Cookie `tt_reader` = `base64url(user).expiry.HMAC-SHA256` (Web Crypto), `HttpOnly; Secure; SameSite=Lax`, 30 days. Every API route re-verifies it.
* Login: scrypt hash check with constant-time compare, best-effort throttle (5 failures / 10 min per IP per instance), `next` restricted to `/reader…`.

## Worker (uploads → Learning Source)
`reader-worker/worker.py` — `pip install -r reader-worker/requirements.txt`, then `uvicorn worker:app --port 8787`.
Needs `ecdict.csv` (MIT, https://github.com/skywind3000/ECDICT) next to it or `ECDICT_CSV=/path`. Needs a long-running host (Fly.io, Railway, Render, a small VM) — not Vercel functions (models + ~200 MB deps).

| Worker env | Default | Notes |
|---|---|---|
| `WORKER_TOKEN` | – | bearer token required from the Next.js proxy |
| `OCR_ENGINE` | `rapidocr` | `rapidocr` (local, free, ONNX) · `tesseract` (needs binary + pytesseract) · `vision` (OpenAI-compatible vision model via `LLM_*`) |
| `STT_ENGINE` | `faster-whisper` | local CPU, `WHISPER_LOCAL_MODEL=tiny.en` (fast) / `base.en` / `small.en` (better) · `openai` → `WHISPER_BASE_URL`, `WHISPER_API_KEY`, `WHISPER_MODEL=whisper-1` |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | – | optional OpenAI-compatible chat API: Chinese translation of uploaded sentences + `/enrich` (phrases, AI story, dialogue for words not in lexicon.js). The prompt forbids quotes; the worker forces every scene to type `ai` |
| `MAX_UPLOAD_MB` | 25 | Vercel itself caps request bodies at ~4.5 MB; the app shrinks photos to ≤2000 px JPEG before upload. For long recordings, call the worker directly (CORS `ALLOW_ORIGIN`) or trim audio |

## Local run
```bash
node scripts/reader-hash-password.mjs demo 'choose-a-password'   # -> READER_USERS entry
export READER_USERS='demo:scrypt$…$…' READER_SESSION_SECRET=$(openssl rand -base64 32)
export READER_ASSETS_DIR=/path/to/treetree-reader-assets/books READER_WORKER_URL=http://127.0.0.1:8787 READER_WORKER_TOKEN=dev
(cd reader-worker && WORKER_TOKEN=dev ECDICT_CSV=/path/ecdict.csv uvicorn worker:app --port 8787 &)
npm run build && npm start   # open http://localhost:3000/reader
```

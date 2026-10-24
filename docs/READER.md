# 树儿学院 · 学习中心 (Tree Tree Reader v3 – Gemini)

Login-only English learning app at **/reader** (entry: 导航「登录学习」).

Flow: **学习来源** (full original text, tap any word ⭐) → **学习区** (① Anki flip card → ② collocation/idiom MCQ → ③ usage scene with labelled source) → auto **复习区** (连连看 matching rounds → missed words go to listening dialogues with A–D options until all pass) → auto **成就仓** (parking-lot grid of mastered words + summary; select words to re-enter 学习区/复习区). All speech is US English (`en-US`, browser speech synthesis).

## What lives where

| Path | What | Public? |
|---|---|---|
| `public/reader/` | static app (index.html, app.js, app.css, config.js, lexicon.js, logo) | served **only after login** (middleware) |
| `public/reader/lexicon.js` | curated content for ~130 words: phrases, scenes, dialogues. AI stories are original and labelled 「故事由 AI 创作」; quotes are short, verified, linked (Wikipedia / Project Gutenberg) | in repo |
| `middleware.ts`, `lib/reader/*` | auth (signed httpOnly cookie), Gemini client (`ai.ts`), parse/enrich logic, US IPA (`text.ts`, CMU dict), store (Upstash or local file), daily limits, shared sources, Blob helpers, optional worker proxy | in repo |
| `app/login`, `app/api/reader/*` | login page, login/logout/me, books proxy, **parse** (photo/screenshot OCR, audio transcription, text → sentences + 中文 + glossary, all via Gemini), **enrich** (AI phrases/story/dialogue, shared per-word cache), **upload** (Vercel Blob client-upload token), **shared** (admin “publish to all families”), progress sync | in repo |
| `public/reader/vendor/blob-client.js` | bundled `@vercel/blob/client` upload() (`npm run build:blob-client` → `node scripts/build-reader-blob-client.mjs`) | in repo |
| `reader-worker/` | **optional fallback** FastAPI worker (local OCR/Whisper). Only used when `GEMINI_API_KEY` is not set | in repo; deploy separately |
| **book scans + book text** (`catalog.json`, `<id>/book.json`, `<id>/img/*.jpg`) | copyrighted picture-book content | **NOT in this repo** – private store, see below |

> ⚠️ This repository is public. Never commit book scans or book text. `.gitignore` blocks `public/reader/books/` and `reader-assets/`.

## Vercel environment variables

| Variable | Required | Value |
|---|---|---|
| `READER_USERS` | yes | `name:scrypt$salt$hash;name2:...` — create each entry with `node scripts/reader-hash-password.mjs <name> <password>`. Append `:admin` to an entry to make that account an admin |
| `READER_ADMINS` | optional | comma list of admin user names (alternative to `:admin`). Admins can 「📢 发布给所有家庭」 and get higher daily limits |
| `READER_SESSION_SECRET` | yes | 32+ random chars (`openssl rand -base64 32`). Changing it logs everyone out |
| `GEMINI_API_KEY` | yes (for uploads/AI) | Google AI Studio key. Server-side only, never sent to the browser, never logged |
| `GEMINI_MODEL` | optional | default `gemini-3.5-flash-lite` |
| `GEMINI_FALLBACK_MODELS` | optional | comma list tried when the main model is unknown/retired or its daily quota is used up. Default `gemini-3.1-flash-lite,gemini-2.5-flash-lite,gemini-3.6-flash,gemini-2.5-flash` |
| `GEMINI_MAX_RETRIES` / `GEMINI_RETRY_BUDGET_MS` / `GEMINI_TIMEOUT_MS` | optional | 429 back-off (default 4 retries within 45 s, honouring Google's `retryDelay`) / per-call timeout (90 s; audio 240 s) |
| `GEMINI_INLINE_MAX_MB` | optional | media up to this size is sent inline (default 14), bigger goes through the Gemini Files API |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) | **recommended** | Upstash Redis. Holds the shared AI word cache (`reader:lex:v1:<word>`), daily counters (`reader:lim:*`), published sources (`reader:shared:*`) and progress sync. Without it Vercel falls back to per-instance memory (cache/limits/shared sources are then NOT reliable) |
| `BLOB_READ_WRITE_TOKEN` | optional | Vercel Blob (private store). Enables uploads > 4.2 MB (long recordings, big photos): the browser uploads straight to Blob, `/api/reader/parse` reads it, sends it to Gemini, then deletes it. Without it, big files get a friendly "too big" message |
| `MAX_UPLOAD_MB` | optional | max file size accepted by parse/upload (default 25) |
| `READER_DAILY_UPLOADS` / `READER_DAILY_WORDS` | optional | per-user daily limits (default 30 uploads / 150 newly generated AI words; cached words are free) |
| `READER_ADMIN_DAILY_UPLOADS` / `READER_ADMIN_DAILY_WORDS` | optional | admin limits (default 300 / 1000) |
| `READER_ASSETS_BASE_URL` | for built-in books | private base URL of the book assets folder (PRIVATE repo / bucket) |
| `READER_ASSETS_TOKEN` | with a private repo/bucket | read-only token sent as `Authorization: Bearer …` |
| `READER_ASSETS_DIR` | alt. (self-host/dev) | local folder instead of a URL |
| `READER_WORKER_URL`, `READER_WORKER_TOKEN` | optional fallback | self-hosted `reader-worker`; only used when `GEMINI_API_KEY` is absent |
| `READER_LOCAL_STORE` | dev only | JSON file used as the store when no Upstash is configured and not on Vercel (default `.reader-data/store.json`, git-ignored) |

Free-tier notes: Gemini free tier has per-minute and per-day request caps per model. 429s are retried with back-off; a per-day 429 switches to the next fallback model; when everything is exhausted the user sees 「今天的免费 AI 额度已经用完了…」 or 「AI 服务现在有点忙…」. Free-tier prompts may be used by Google to improve products – switch on billing in AI Studio before real families use it.

## AI pipeline (Gemini, no worker needed)
* **Photo / screenshot** → Gemini reads the English text (OCR), splits paragraphs/sentences, translates each sentence to 中文 and returns a glossary (form → lemma → 中文). The browser shrinks photos to ≤2000 px and makes the page thumbnail itself; several photos selected together become one multi-page source.
* **Audio** (m4a/mp3/wav/webm, recorded or uploaded) → Gemini transcribes English speech into sentences + 中文.
* **Text** → sentences split locally, Gemini translates + glossary.
* US phonetics come from the CMU Pronouncing Dictionary (`cmu-pronouncing-dictionary`, ISC) converted to IPA – not from the model.
* **Enrich**: words missing from `lexicon.js` get AI phrases / story / dialogue, generated once and cached for all families; every scene is forced to type `ai` (shown as 「故事由 AI 创作」). Only newly generated words count toward the daily limit.
* Structured output: `responseMimeType: application/json` + JSON schema.

## Publish to all families (admins)
An admin opens an uploaded source → 「📢 发布给所有家庭」. Page images are PUT one by one to `/api/reader/shared/<id>/img/<n>` (each < 3 MB), then the source JSON is POSTed. Every logged-in family sees it on the home page with the label 「共享」; admins can 「🗑 取消发布」. ⚠️ Publishing scans of commercial books to other families is redistribution – only publish content you have the right to share.

## Auth details
* `middleware.ts` guards `/reader`, `/reader/*` and `/api/reader/*` (except `/api/reader/login`). Pages redirect to `/login?next=…`; APIs return 401.
* Cookie `tt_reader` = `base64url(user).expiry.HMAC-SHA256` (Web Crypto), `HttpOnly; Secure; SameSite=Lax`, 30 days. Every API route re-verifies it.
* Login: scrypt hash check with constant-time compare, best-effort throttle (5 failures / 10 min per IP per instance), `next` restricted to `/reader…`.

## Optional fallback worker (only without GEMINI_API_KEY)
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
export READER_ASSETS_DIR=/path/to/treetree-reader-assets/books READER_ADMINS=demo
export GEMINI_API_KEY=…            # from your shell / secret manager – never commit it
npm run build && npm start   # open http://localhost:3000/reader
```

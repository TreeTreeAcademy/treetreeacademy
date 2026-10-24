> **v3:** the Next.js app now calls Gemini directly (`GEMINI_API_KEY`, see docs/READER.md). This worker is only an optional fallback used when no Gemini key is configured.

# reader-worker
Parse uploads (photo / screenshot → OCR, audio → speech-to-text) into a 树儿学院 Learning Source, and (optionally) generate AI learning content. See `../docs/READER.md` for all env vars. Requires `ecdict.csv` (not committed; MIT, https://github.com/skywind3000/ECDICT).

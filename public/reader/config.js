// 树儿读读乐 TreeTree Read & Grow runtime config — PUBLIC file, NO SECRETS.
// Inside treetreeacademy.com everything goes through auth-protected Next.js routes under /api/reader/*.
window.TT_CONFIG = {
  booksBase: "/api/reader/books/",        // catalog.json + <id>/book.json + <id>/img/* (private store, proxied after login)
  parseEndpoint: "/api/reader/parse",     // upload photo/screenshot/audio -> Learning Source JSON
  enrichEndpoint: "/api/reader/enrich",   // optional AI content for words not in lexicon.js
  quizEndpoint: "/api/reader/quizopts",
  talkEndpoint: "/api/reader/talk",       // 复习区 听对话选回答 (AI dialogues, cached)   // 译文选择题 distractors (AI, cached; falls back to other sentences offline)
  ttsEndpoint: "/api/reader/tts",         // natural Gemini TTS mp3 (cached); falls back to speechSynthesis
  progressEndpoint: "/api/reader/progress", // optional server sync (KV); falls back to localStorage only
  meEndpoint: "/api/reader/me",           // -> {user, admin, ai, blob, limits}
  sharedEndpoint: "/api/reader/shared",   // sources an admin published to all families
  mybooksEndpoint: "/api/reader/mybooks", // whole books imported for this reader (KV + private Blob images)
  blobUploadEndpoint: "/api/reader/upload", // Vercel Blob client-upload token route (files > maxUploadMB)
  blobClientUrl: "/reader/vendor/blob-client.js",
  logoutUrl: "/api/reader/logout",
  loginUrl: "/login?next=/reader/",
  maxUploadMB: 4.2                        // Vercel function body limit is ~4.5 MB
};

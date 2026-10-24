// Tree Tree Reader v2 runtime config — PUBLIC file, NO SECRETS.
// Inside treetreeacademy.com everything goes through auth-protected Next.js routes under /api/reader/*.
window.TT_CONFIG = {
  booksBase: "/api/reader/books/",        // catalog.json + <id>/book.json + <id>/img/* (private store, proxied after login)
  parseEndpoint: "/api/reader/parse",     // upload photo/screenshot/audio -> Learning Source JSON
  enrichEndpoint: "/api/reader/enrich",   // optional AI content for words not in lexicon.js
  progressEndpoint: "/api/reader/progress", // optional server sync (KV); falls back to localStorage only
  meEndpoint: "/api/reader/me",           // -> {user, admin, ai, blob, limits}
  sharedEndpoint: "/api/reader/shared",   // sources an admin published to all families
  blobUploadEndpoint: "/api/reader/upload", // Vercel Blob client-upload token route (files > maxUploadMB)
  blobClientUrl: "/reader/vendor/blob-client.js",
  logoutUrl: "/api/reader/logout",
  loginUrl: "/login?next=/reader/",
  maxUploadMB: 4.2                        // Vercel function body limit is ~4.5 MB
};

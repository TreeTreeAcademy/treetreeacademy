// Per-reader books imported from whole-book PDFs (box-side importer: scripts/import-book.ts).
// Book data lives in the reader KV. Page images and TTS clips go to private Cloudflare R2 when
// READER_R2_ENABLED=1 (served only through this app). Else a private Vercel Blob store if connected,
// else KV (Upstash free tier = 250 MB total). Never expose a public r2.dev URL.
//   reader:mybooks:<user>                 JSON [{id,title,titleZh,pages,sentences,words,cover,createdAt,imgStore,imgBytes}]
//   reader:mybook:<user>:<id>             source JSON (page img -> /api/reader/mybooks/<id>/img/<n>)
//   reader:mybookimg:<user>:<id>:<n>      KV image: {"t":"image/jpeg","b":"<base64>"}  OR  {"blob":"<private blob url>","t":...}
// Images are only ever served through the authenticated route, and only to the book's owner.
import { kvDel, kvExists, kvGet, kvLen, kvKeys, kvMGet, kvSet, kvStats } from "@/lib/reader/store";
import { blobConfigured, safeUser } from "@/lib/reader/blob";
import { r2Configured, r2Get, r2Put, r2ImageKey } from "@/lib/reader/r2";

export const BOOK_ID_RE = /^[a-z0-9][a-z0-9_-]{2,40}$/;
export const USER_RE = /^[a-z0-9][a-z0-9_.-]{0,40}$/;
export const MAX_IMG_BYTES = 3_000_000; // raw JPEG per page (request bodies must stay < 4.5 MB)
export const MAX_KV_IMG_BYTES = 1_200_000; // keep KV records small
const kIdx = (u: string) => `reader:mybooks:${u}`;
const kBook = (u: string, id: string) => `reader:mybook:${u}:${id}`;
const kImg = (u: string, id: string, n: number) => `reader:mybookimg:${u}:${id}:${n}`;
export const imgUrl = (id: string, n: number) => `/api/reader/mybooks/${id}/img/${n}`;
export const blobPath = (u: string, id: string, n: number) => `reader-books/${safeUser(u)}/${id}/p${String(n).padStart(3, "0")}.jpg`;

export type BookItem = {
  id: string; title: string; titleZh?: string; pages: number; sentences: number; words: number;
  cover: string | null; createdAt: number; imgStore: "blob" | "r2" | "kv" | "none"; imgBytes: number;
};

export async function listBooks(user: string): Promise<BookItem[]> {
  try { return JSON.parse((await kvGet(kIdx(user))) || "[]"); } catch { return []; }
}
export async function getBook(user: string, id: string): Promise<string | null> {
  return kvGet(kBook(user, id));
}
/** Books in the index whose body is actually present (never list a dangling card). */
export async function listLiveBooks(user: string): Promise<BookItem[]> {
  const items = await listBooks(user);
  if (!items.length) return items;
  const ok = await kvExists(items.map((x) => kBook(user, x.id)));
  return items.filter((_, i) => ok[i]);
}
/** Page numbers that have an image stored, in order. */
export async function listStoredImages(user: string, id: string, max = 40): Promise<number[]> {
  const keys = Array.from({ length: max }, (_, i) => kImg(user, id, i + 1));
  const ex = await kvExists(keys);
  return ex.map((e, i) => (e ? i + 1 : 0)).filter((n) => n);
}


/** Store one page image; returns where it went. */
export async function putImage(user: string, id: string, n: number, bytes: Uint8Array, type: string) {
  if (r2Configured()) {
    const ext = type.includes("webp") ? "webp" : type.includes("png") ? "png" : "jpg";
    const path = r2ImageKey(safeUser(user), id, n, ext);
    await r2Put(path, bytes, type);
    const rec = JSON.stringify({ r2: path, t: type, size: bytes.length });
    await kvSet(kImg(user, id, n), rec);
    if ((await kvLen([kImg(user, id, n)]))[0] !== rec.length) throw new Error("image pointer did not save");
    return { store: "r2" as const, size: bytes.length };
  }
  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    const r = await put(blobPath(user, id, n), Buffer.from(bytes), {
      access: "private", contentType: type, addRandomSuffix: false, allowOverwrite: true,
    } as any);
    const rec = JSON.stringify({ blob: r.url, t: type, size: bytes.length });
    await kvSet(kImg(user, id, n), rec);
    if ((await kvLen([kImg(user, id, n)]))[0] !== rec.length) throw new Error("image pointer did not save");
    return { store: "blob" as const, size: bytes.length };
  }
  if (bytes.length > MAX_KV_IMG_BYTES) throw new Error("image too large for KV");
  const rec = JSON.stringify({ t: type, b: Buffer.from(bytes).toString("base64") });
  await kvSet(kImg(user, id, n), rec);
  const lens = await kvLen([kImg(user, id, n)]);
  if (lens[0] !== rec.length) throw new Error("image did not save");
  await addUsage(rec.length);
  return { store: "kv" as const, size: bytes.length };
}

export async function getImage(user: string, id: string, n: number): Promise<{ bytes: Uint8Array | ReadableStream<Uint8Array>; type: string } | null> {
  const raw = await kvGet(kImg(user, id, n));
  if (!raw) return null;
  let rec: any;
  try { rec = JSON.parse(raw); } catch { return null; }
  if (rec.r2 && r2Configured()) {
    const o = await r2Get(rec.r2);
    if (o) return { bytes: o.bytes, type: rec.t || o.type || "image/jpeg" };
  }
  if (rec.b) return { bytes: new Uint8Array(Buffer.from(rec.b, "base64")), type: rec.t || "image/jpeg" };
  if (rec.blob) {
    if (!blobConfigured()) return null;
    const { get } = await import("@vercel/blob");
    const r = await get(rec.blob, { access: "private" });
    if (!r || !r.stream) return null;
    return { bytes: r.stream as ReadableStream<Uint8Array>, type: rec.t || "image/jpeg" };
  }
  return null;
}

/** Save the assembled source + update the owner's index. Pages must already have their images stored. */
export async function saveBook(user: string, src: any, extra: { imgStore: BookItem["imgStore"]; imgBytes: number }) {
  const id = String(src.id);
  const pages = src.pages as any[];
  const have = await kvExists(pages.map((p) => kImg(user, id, Number(p.n))));
  pages.forEach((p, i) => { p.img = have[i] ? imgUrl(id, Number(p.n)) : null; });
  const clean = {
    id, title: String(src.title || "未命名").slice(0, 100), titleZh: String(src.titleZh || "").slice(0, 100), kind: "book",
    createdAt: Number(src.createdAt) || Date.now(), importedAt: Date.now(), source: String(src.source || "").slice(0, 200),
    pages, sentences: src.sentences, words: src.words,
  };
  const body = JSON.stringify(clean);
  await kvSet(kBook(user, id), body);
  const lens = await kvLen([kBook(user, id)]);
  if (lens[0] !== body.length) throw new Error("book body did not save");
  const prevItems = await listBooks(user);
  // re-import with fewer pages: drop image keys (and blobs) beyond the new last page
  const prev = prevItems.find((x) => x.id === id);
  const maxN = pages.reduce((m, p) => Math.max(m, Number(p.n) || 0), 0);
  if (prev && prev.pages > maxN) await dropImages(user, id, maxN + 1, prev.pages + 5);
  const items = prevItems.filter((x) => x.id !== id);
  items.unshift({
    id, title: clean.title, titleZh: clean.titleZh, pages: pages.length, sentences: clean.sentences.length, words: clean.words.length,
    cover: pages[0]?.img || null, createdAt: clean.importedAt, imgStore: extra.imgStore, imgBytes: extra.imgBytes,
  });
  await kvSet(kIdx(user), JSON.stringify(items));
  return { id, bytes: body.length, pages: pages.length, images: have.filter(Boolean).length };
}

async function dropImages(user: string, id: string, from: number, to: number) {
  const keys = Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => kImg(user, id, from + i));
  // which exist first (cheap), then read only those, a few at a time (KV-stored images are ~400 KB each)
  const ex: boolean[] = [];
  for (let i = 0; i < keys.length; i += 200) ex.push(...(await kvExists(keys.slice(i, i + 200))));
  const recs: (string | null)[] = keys.map(() => null);
  const idx = keys.map((_, i) => i).filter((i) => ex[i]);
  for (let i = 0; i < idx.length; i += 8) {
    const part = idx.slice(i, i + 8);
    const vals = await kvMGet(part.map((j) => keys[j]));
    part.forEach((j, q) => { recs[j] = vals[q] ?? (ex[j] ? "{}" : null); });
  }
  const blobs = recs.map((r) => { try { return r ? JSON.parse(r).blob : null; } catch { return null; } }).filter(Boolean) as string[];
  if (blobs.length && blobConfigured()) { try { const { del } = await import("@vercel/blob"); await del(blobs); } catch { /* best effort */ } }
  const live = keys.filter((_, i) => recs[i]);
  for (let i = 0; i < live.length; i += 200) await kvDel(...live.slice(i, i + 200));
  return live.length;
}

export async function deleteBook(user: string, id: string) {
  const items = await listBooks(user);
  const it = items.find((x) => x.id === id);
  const n = it ? it.pages + 5 : 1000; // unknown (half-imported) book: scan generously
  const images = await dropImages(user, id, 1, n);
  await kvDel(kBook(user, id));
  await kvSet(kIdx(user), JSON.stringify(items.filter((x) => x.id !== id)));
  return { removed: !!it, images };
}


// ---------- in-app batch upload (browser -> account): ids, KV budget, sanity checks ----------
export const BATCH_ID_RE = /^up-[a-z0-9]{6,30}$/;
export const BATCH_MAX_PAGES = 40;
/** KV is the only image store when no Blob store is connected: stop well before the Upstash free-tier limit. */
export const kvBudgetBytes = () => Number(process.env.READER_KV_BUDGET_MB || 245) * 1048576;
const USED_KEY = "reader:kv:used-bytes";
export async function rememberUsage(bytes: number) {
  if (bytes < 0) return;
  try { await kvSet(USED_KEY, String(bytes)); } catch { /* best effort */ }
}
export async function addUsage(delta: number) {
  if (!delta) return;
  try { const cur = Number((await kvGet(USED_KEY)) || 0); await kvSet(USED_KEY, String(Math.max(0, cur + delta))); } catch { /* best effort */ }
}
export async function kvHeadroom() {
  const st = await kvStats();
  const budget = kvBudgetBytes();
  let used = st.usedBytes;
  try {
    const cached = Number((await kvGet(USED_KEY)) || 0);
    if (cached > 0) used = Math.max(used || 0, cached);
  } catch { /* keep INFO */ }
  return { usedBytes: used, budgetBytes: budget, freeBytes: used == null ? null : Math.max(0, budget - used) };
}
export const isJpeg = (b: Uint8Array) => b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/** Validate a client-assembled multi-page source (strings are always escaped when shown; img is rewritten by saveBook). */
export function checkBatchSource(src: any): string | null {
  if (!src || typeof src !== "object") return "bad source";
  const { pages, sentences, words } = src;
  if (!Array.isArray(pages) || !Array.isArray(sentences) || !Array.isArray(words)) return "bad source";
  if (pages.length < 1 || pages.length > BATCH_MAX_PAGES) return `pages must be 1-${BATCH_MAX_PAGES}`;
  if (sentences.length > 4000 || words.length > 8000) return "source too large";
  pages.forEach((p: any, i: number) => { if (Number(p?.n) !== i + 1 || !Array.isArray(p?.s)) throw new Error("bad page"); });
  const ok = sentences.every((s: any, i: number) => s && s.id === i && typeof s.en === "string" && s.en.length < 2000 && Array.isArray(s.t) && Number.isInteger(s.p) && s.p >= 1 && s.p <= pages.length
    && (s.zh == null || (typeof s.zh === "string" && s.zh.length < 2000)));
  if (!ok) return "bad sentences";
  if (!pages.every((p: any) => p.s.every((i: any) => Number.isInteger(i) && i >= 0 && i < sentences.length))) return "bad page sentences";
  if (!words.every((w: any) => w && typeof w.w === "string" && w.w.length < 60 && Array.isArray(w.pages))) return "bad words";
  return null;
}

/** Metadata-only inventory of uploaded books and leftover page images. Never includes book text. */
export async function auditMyBooks() {
  const idxKeys = await kvKeys("reader:mybooks:*", 200);
  const bookKeys = await kvKeys("reader:mybook:*", 20000);
  const imgKeys = await kvKeys("reader:mybookimg:*", 50000);
  const users = idxKeys.map((k) => k.slice("reader:mybooks:".length));
  const indexes: Record<string, { id: string; pages: number; sentences: number; words: number; createdAt: number; bodyBytes: number | null; hasBody: boolean; images: number[] }[]> = {};
  const listed = new Set<string>();
  for (const u of users) {
    const items = await listBooks(u);
    const ids = items.map((x) => x.id);
    const bodies = ids.map((id) => kBook(u, id));
    const has = bodies.length ? await kvExists(bodies) : [];
    const lens = bodies.length ? await kvLen(bodies) : [];
    const rows = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      listed.add(u + ":" + it.id);
      rows.push({
        id: it.id, pages: it.pages, sentences: it.sentences, words: it.words, createdAt: it.createdAt,
        bodyBytes: lens[i], hasBody: !!has[i], images: await listStoredImages(u, it.id, Math.max(40, (it.pages || 0) + 5)),
      });
    }
    indexes[u] = rows;
  }
  const parseBookKey = (k: string) => {
    const rest = k.slice("reader:mybook:".length);
    const i = rest.indexOf(":");
    return i < 0 ? null : { user: rest.slice(0, i), id: rest.slice(i + 1) };
  };
  const parseImgKey = (k: string) => {
    const rest = k.slice("reader:mybookimg:".length);
    const m = rest.match(/^([^:]+):(.+):(\d+)$/);
    return m ? { user: m[1], id: m[2], n: Number(m[3]) } : null;
  };
  const bodyOrphans: { user: string; id: string; bytes: number | null }[] = [];
  const bookLens = bookKeys.length ? await kvLen(bookKeys) : [];
  for (let i = 0; i < bookKeys.length; i++) {
    const p = parseBookKey(bookKeys[i]);
    if (!p) continue;
    if (!listed.has(p.user + ":" + p.id)) bodyOrphans.push({ user: p.user, id: p.id, bytes: bookLens[i] });
  }
  const imgBy: Record<string, number[]> = {};
  for (const k of imgKeys) {
    const p = parseImgKey(k);
    if (!p) continue;
    const id = p.user + ":" + p.id;
    (imgBy[id] ||= []).push(p.n);
  }
  const imageOrphans: { user: string; id: string; images: number[] }[] = [];
  for (const [uid, nums] of Object.entries(imgBy)) {
    const [user, id] = uid.split(":");
    if (!listed.has(uid) && !bodyOrphans.some((x) => x.user === user && x.id === id)) {
      imageOrphans.push({ user, id, images: nums.sort((a, b) => a - b) });
    }
  }
  // also attach images to body orphans
  const bodyOrphans2 = bodyOrphans.map((x) => ({ ...x, images: (imgBy[x.user + ":" + x.id] || []).sort((a, b) => a - b) }));
  return {
    users, bookBodies: bookKeys.length, imageKeys: imgKeys.length,
    indexes, bodyOrphans: bodyOrphans2, imageOrphans,
  };
}

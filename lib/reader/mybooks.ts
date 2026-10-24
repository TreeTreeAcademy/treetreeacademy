// Per-reader books imported from whole-book PDFs (box-side importer: scripts/import-book.ts).
// Book data lives in the reader KV; page images in a PRIVATE Vercel Blob store when one is connected
// (BLOB_READ_WRITE_TOKEN), otherwise in KV (smaller images; Upstash free tier = 250 MB total).
//   reader:mybooks:<user>                 JSON [{id,title,titleZh,pages,sentences,words,cover,createdAt,imgStore,imgBytes}]
//   reader:mybook:<user>:<id>             source JSON (page img -> /api/reader/mybooks/<id>/img/<n>)
//   reader:mybookimg:<user>:<id>:<n>      KV image: {"t":"image/jpeg","b":"<base64>"}  OR  {"blob":"<private blob url>","t":...}
// Images are only ever served through the authenticated route, and only to the book's owner.
import { kvDel, kvExists, kvGet, kvMGet, kvSet } from "@/lib/reader/store";
import { blobConfigured, safeUser } from "@/lib/reader/blob";

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
  cover: string | null; createdAt: number; imgStore: "blob" | "kv" | "none"; imgBytes: number;
};

export async function listBooks(user: string): Promise<BookItem[]> {
  try { return JSON.parse((await kvGet(kIdx(user))) || "[]"); } catch { return []; }
}
export async function getBook(user: string, id: string): Promise<string | null> {
  return kvGet(kBook(user, id));
}

/** Store one page image; returns where it went. */
export async function putImage(user: string, id: string, n: number, bytes: Uint8Array, type: string) {
  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    const r = await put(blobPath(user, id, n), Buffer.from(bytes), {
      access: "private", contentType: type, addRandomSuffix: false, allowOverwrite: true,
    } as any);
    await kvSet(kImg(user, id, n), JSON.stringify({ blob: r.url, t: type, size: bytes.length }));
    return { store: "blob" as const, size: bytes.length };
  }
  if (bytes.length > MAX_KV_IMG_BYTES) throw new Error("image too large for KV");
  await kvSet(kImg(user, id, n), JSON.stringify({ t: type, b: Buffer.from(bytes).toString("base64") }));
  return { store: "kv" as const, size: bytes.length };
}

export async function getImage(user: string, id: string, n: number): Promise<{ bytes: Uint8Array | ReadableStream<Uint8Array>; type: string } | null> {
  const raw = await kvGet(kImg(user, id, n));
  if (!raw) return null;
  let rec: any;
  try { rec = JSON.parse(raw); } catch { return null; }
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

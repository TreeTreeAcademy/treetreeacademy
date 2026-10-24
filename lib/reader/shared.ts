// "Publish to all families": admin-published learning sources stored in the reader store.
//   reader:shared:index        JSON [{id,title,kind,pages,sentences,words,cover,createdAt,by}]
//   reader:shared:src:<id>     source JSON (page img -> /api/reader/shared/<id>/img/<n>)
//   reader:shared:img:<id>:<n> page image as data URL (each sent in its own request, < 4.5 MB)
import { kvDel, kvGet, kvSet } from "@/lib/reader/store";

export const ID_RE = /^[a-z0-9][a-z0-9_-]{2,40}$/;
export const IMG_MAX = 3_000_000; // chars of data URL per page
export const kSrc = (id: string) => `reader:shared:src:${id}`;
export const kImg = (id: string, n: number) => `reader:shared:img:${id}:${n}`;
const kIdx = "reader:shared:index";
export const imgUrl = (id: string, n: number) => `/api/reader/shared/${id}/img/${n}`;

export type IndexItem = { id: string; title: string; kind: string; pages: number; sentences: number; words: number; cover: string | null; createdAt: number; by: string };

export async function listShared(): Promise<IndexItem[]> {
  try { return JSON.parse((await kvGet(kIdx)) || "[]"); } catch { return []; }
}
export async function saveIndex(items: IndexItem[]) { await kvSet(kIdx, JSON.stringify(items)); }

export async function removeShared(id: string) {
  const items = await listShared();
  const it = items.find((x) => x.id === id);
  await saveIndex(items.filter((x) => x.id !== id));
  const n = it?.pages || 0;
  await kvDel(kSrc(id), ...Array.from({ length: Math.max(n, 1) + 2 }, (_, i) => kImg(id, i + 1)));
}

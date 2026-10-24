// Optional Vercel Blob (private) for uploads larger than the ~4.5 MB function body limit.
// Needs BLOB_READ_WRITE_TOKEN (created when you connect a Blob store to the Vercel project). Without it the app
// simply asks users to send smaller files.
import { AIError } from "@/lib/reader/ai";

export const blobConfigured = () => !!process.env.BLOB_READ_WRITE_TOKEN;
export const safeUser = (u: string) => u.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 40) || "user";
export const blobPrefix = (u: string) => `reader-uploads/${safeUser(u)}/`;

export async function readPrivateBlob(url: string, prefix: string, maxBytes: number): Promise<Uint8Array> {
  if (!blobConfigured()) throw new AIError(501, "blob_not_configured", "大文件上传还没有开通（需要 Vercel Blob）。");
  let u: URL | null = null;
  try { u = new URL(url); } catch { /* invalid */ }
  // only our own store, only this user's folder
  if (!u || u.protocol !== "https:" || !u.hostname.endsWith(".blob.vercel-storage.com") || !decodeURIComponent(u.pathname).slice(1).startsWith(prefix)) {
    throw new AIError(400, "bad_blob", "上传文件的位置不对，请重新上传。");
  }
  const { get } = await import("@vercel/blob");
  const r = await get(url, { access: "private" });
  if (!r || !r.stream) throw new AIError(404, "blob_missing", "找不到刚上传的文件，请重新上传。");
  const chunks: Uint8Array[] = []; let n = 0;
  const reader = (r.stream as ReadableStream<Uint8Array>).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > maxBytes) { reader.cancel(); throw new AIError(413, "too_large", "文件太大了。"); }
    chunks.push(value);
  }
  const out = new Uint8Array(n); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

export async function deleteBlob(url: string) {
  if (!blobConfigured()) return;
  try { const { del } = await import("@vercel/blob"); await del(url); } catch { /* best effort */ }
}

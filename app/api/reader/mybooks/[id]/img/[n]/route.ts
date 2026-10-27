// Page image of one of this reader's books (private: KV or private Vercel Blob; owner only).
//   GET -> the image.   PUT (raw JPEG body) -> store one page image for a batch-upload book id (up-xxxx), refusing when
//   the KV budget would be exceeded.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { BATCH_ID_RE, BATCH_MAX_PAGES, BOOK_ID_RE, MAX_IMG_BYTES, MAX_KV_IMG_BYTES, getImage, isJpeg, kvHeadroom, putImage } from "@/lib/reader/mybooks";
import { blobConfigured } from "@/lib/reader/blob";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string; n: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const { id, n } = await ctx.params;
  const num = Number(n);
  if (!BOOK_ID_RE.test(id) || !Number.isInteger(num) || num < 1 || num > 2000) return new Response("bad path", { status: 400 });
  const img = await getImage(user, id, num);
  if (!img) return new Response("not found", { status: 404 });
  return new Response(img.bytes as any, { headers: { "Content-Type": img.type, "Cache-Control": "private, max-age=604800" } });
}

export async function PUT(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const { id, n } = await ctx.params;
  const num = Number(n);
  if (!BATCH_ID_RE.test(id) || !Number.isInteger(num) || num < 1 || num > BATCH_MAX_PAGES) return Response.json({ error: "bad_path" }, { status: 400 });
  const bytes = new Uint8Array(await req.arrayBuffer());
  const cap = blobConfigured() ? MAX_IMG_BYTES : MAX_KV_IMG_BYTES;
  if (bytes.length > cap) return Response.json({ error: "too_large", detail: "这张图太大了。" }, { status: 413 });
  if (!isJpeg(bytes)) return Response.json({ error: "bad_image", detail: "只能存 JPEG 图片。" }, { status: 415 });
  if (!blobConfigured()) {
    const h = await kvHeadroom();
    if (h.freeBytes != null && h.freeBytes < bytes.length * 1.5 + 2_000_000) {
      return Response.json({ error: "kv_full", detail: "网站的图片存储空间快满了，暂时存不下这本书的页面图片。请告诉管理员。" }, { status: 507, headers: { "Cache-Control": "no-store" } });
    }
  }
  const r = await putImage(user, id, num, bytes, "image/jpeg");
  return Response.json({ ok: true, store: r.store, size: r.size }, { headers: { "Cache-Control": "no-store" } });
}

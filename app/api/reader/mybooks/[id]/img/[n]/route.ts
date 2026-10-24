// Page image of one of this reader's imported books (private: KV or private Vercel Blob; owner only).
import { requireUser, unauthorized } from "@/lib/reader/session";
import { BOOK_ID_RE, getImage } from "@/lib/reader/mybooks";
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

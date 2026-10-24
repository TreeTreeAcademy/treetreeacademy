// GET -> one of this reader's imported books (source JSON); DELETE -> remove it (book data + page images).
import { requireUser, unauthorized } from "@/lib/reader/session";
import { BOOK_ID_RE, deleteBook, getBook } from "@/lib/reader/mybooks";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!BOOK_ID_RE.test(id)) return new Response("bad id", { status: 400 });
  const body = await getBook(user, id);
  if (!body) return Response.json({ error: "not found" }, { status: 404 });
  return new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": "private, no-cache" } });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!BOOK_ID_RE.test(id)) return new Response("bad id", { status: 400 });
  return Response.json({ ok: true, ...(await deleteBook(user, id)) });
}

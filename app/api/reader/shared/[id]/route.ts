// GET -> one published source; DELETE -> unpublish (admins only)
import { requireUser, unauthorized } from "@/lib/reader/session";
import { isAdmin } from "@/lib/reader/users";
import { ID_RE, kSrc, removeShared } from "@/lib/reader/shared";
import { kvGet } from "@/lib/reader/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireUser(req))) return unauthorized();
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return new Response("bad id", { status: 400 });
  const s = await kvGet(kSrc(id));
  if (!s) return Response.json({ error: "not found" }, { status: 404 });
  return new Response(s, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, max-age=60" } });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return Response.json({ error: "forbidden", detail: "只有管理员可以取消发布。" }, { status: 403 });
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return new Response("bad id", { status: 400 });
  await removeShared(id);
  return Response.json({ ok: true });
}

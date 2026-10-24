// Page images of published sources. GET (any reader) serves the image; PUT (admins) stores a data URL.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { isAdmin } from "@/lib/reader/users";
import { ID_RE, IMG_MAX, kImg } from "@/lib/reader/shared";
import { kvGet, kvSet } from "@/lib/reader/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string; n: string }> };
const DATA_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

async function args(ctx: Ctx) {
  const { id, n } = await ctx.params;
  const num = Number(n);
  return ID_RE.test(id) && Number.isInteger(num) && num > 0 && num <= 500 ? { id, num } : null;
}

export async function GET(req: Request, ctx: Ctx) {
  if (!(await requireUser(req))) return unauthorized();
  const a = await args(ctx);
  if (!a) return new Response("bad path", { status: 400 });
  const m = DATA_RE.exec((await kvGet(kImg(a.id, a.num))) || "");
  if (!m) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(Buffer.from(m[2], "base64")), { headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=86400" } });
}

export async function PUT(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return Response.json({ error: "forbidden" }, { status: 403 });
  const a = await args(ctx);
  if (!a) return new Response("bad path", { status: 400 });
  const body = (await req.text()).trim();
  if (body.length > IMG_MAX || !DATA_RE.test(body)) return Response.json({ error: "bad image", detail: "图片格式不对或太大。" }, { status: 400 });
  await kvSet(kImg(a.id, a.num), body);
  return Response.json({ ok: true });
}

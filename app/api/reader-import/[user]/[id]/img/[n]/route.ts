// PUT raw JPEG/PNG/WebP page image (< 3 MB) for a reader's book -> private Blob (if connected) or KV.
import { importAuthorized, importDenied } from "@/lib/reader/importauth";
import { BOOK_ID_RE, MAX_IMG_BYTES, USER_RE, putImage } from "@/lib/reader/mybooks";
import { userExists } from "@/lib/reader/users";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ user: string; id: string; n: string }> };
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function PUT(req: Request, ctx: Ctx) {
  if (!importAuthorized(req)) return importDenied();
  const p = await ctx.params;
  const user = p.user.toLowerCase(), num = Number(p.n);
  if (!USER_RE.test(user) || !userExists(user) || !BOOK_ID_RE.test(p.id) || !Number.isInteger(num) || num < 1 || num > 2000) {
    return Response.json({ error: "bad path" }, { status: 400 });
  }
  const type = (req.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!TYPES.has(type)) return Response.json({ error: "bad type" }, { status: 415 });
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMG_BYTES) return Response.json({ error: "bad size" }, { status: 413 });
  try {
    return Response.json({ ok: true, ...(await putImage(user, p.id, num, bytes, type)) });
  } catch (e: any) {
    console.warn("[reader-import] image store failed", e?.message);
    return Response.json({ error: "store_failed", detail: String(e?.message || "").slice(0, 200) }, { status: 502 });
  }
}

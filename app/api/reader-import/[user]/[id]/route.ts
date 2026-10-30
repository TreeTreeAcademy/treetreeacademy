// PUT -> save an assembled book source for a reader (images must be PUT first); DELETE -> remove it.
// Bearer READER_IMPORT_TOKEN. Not under /api/reader/* so the cookie middleware does not apply.
import { importAuthorized, importDenied } from "@/lib/reader/importauth";
import { BOOK_ID_RE, USER_RE, deleteBook, saveBook } from "@/lib/reader/mybooks";
import { userExists } from "@/lib/reader/users";
import { ensureRoots } from "@/lib/reader/roots";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
type Ctx = { params: Promise<{ user: string; id: string }> };

async function args(ctx: Ctx) {
  const p = await ctx.params;
  const user = p.user.toLowerCase();
  return USER_RE.test(user) && userExists(user) && BOOK_ID_RE.test(p.id) ? { user, id: p.id } : null;
}

export async function PUT(req: Request, ctx: Ctx) {
  if (!importAuthorized(req)) return importDenied();
  const a = await args(ctx);
  if (!a) return Response.json({ error: "bad reader or id" }, { status: 400 });
  const text = await req.text();
  if (text.length > 4_400_000) return Response.json({ error: "book too large" }, { status: 413 });
  let j: any;
  try { j = JSON.parse(text); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  const src = j.source;
  if (!src || !Array.isArray(src.pages) || !Array.isArray(src.sentences) || !Array.isArray(src.words)) return Response.json({ error: "bad source" }, { status: 400 });
  src.id = a.id;
  const imgStore = ["blob", "kv", "none"].includes(j.imgStore) ? j.imgStore : "none";
  const saved = await saveBook(a.user, src, { imgStore, imgBytes: Number(j.imgBytes) || 0 });
  // 词根词缀 notes for the new book's words (best effort; the rest are generated lazily / by the box pass)
  const roots = await ensureRoots(src.words.map((w: any) => String(w?.w || "")), 20000, 2).catch(() => null);
  return Response.json({ ok: true, ...saved, roots: roots ? { calls: roots.calls, missing: roots.missing } : null });
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!importAuthorized(req)) return importDenied();
  const a = await args(ctx);
  if (!a) return Response.json({ error: "bad reader or id" }, { status: 400 });
  return Response.json({ ok: true, ...(await deleteBook(a.user, a.id)) });
}

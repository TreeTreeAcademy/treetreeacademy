// GET -> a reader's imported books (importer check). Bearer READER_IMPORT_TOKEN.
import { importAuthorized, importDenied } from "@/lib/reader/importauth";
import { USER_RE, listBooks } from "@/lib/reader/mybooks";
import { userExists } from "@/lib/reader/users";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ user: string }> };
export async function GET(req: Request, ctx: Ctx) {
  if (!importAuthorized(req)) return importDenied();
  const user = (await ctx.params).user.toLowerCase();
  if (!USER_RE.test(user) || !userExists(user)) return Response.json({ error: "no such reader" }, { status: 404 });
  return Response.json(await listBooks(user), { headers: { "Cache-Control": "no-store" } });
}

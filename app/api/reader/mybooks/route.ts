// GET -> this reader's imported books (whole-book PDFs imported for them).
import { requireUser, unauthorized } from "@/lib/reader/session";
import { listBooks } from "@/lib/reader/mybooks";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  return Response.json(await listBooks(user), { headers: { "Cache-Control": "no-store" } });
}

import { requireUser, unauthorized } from "@/lib/reader/session";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
}

// Upload (photo / screenshot / audio / text) -> Learning Source JSON, via the worker.
// Note: Vercel limits request bodies to ~4.5 MB; the app shrinks photos client-side before upload.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { forward } from "@/lib/reader/worker";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  if (!(await requireUser(req))) return unauthorized();
  return forward("/parse", await req.arrayBuffer(), req.headers.get("content-type"));
}

// AI learning content for words not in the curated lexicon (stories are always labelled 故事由 AI 创作).
import { requireUser, unauthorized } from "@/lib/reader/session";
import { forward } from "@/lib/reader/worker";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  if (!(await requireUser(req))) return unauthorized();
  const text = await req.text();
  if (text.length > 20000) return Response.json({ error: "too large" }, { status: 413 });
  return forward("/enrich", text, "application/json");
}

import { requireUser, unauthorized } from "@/lib/reader/session";
import { isAdmin } from "@/lib/reader/users";
import { aiConfigured, currentModel } from "@/lib/reader/ai";
import { workerConfigured } from "@/lib/reader/worker";
import { blobConfigured } from "@/lib/reader/blob";
import { maxFor, used } from "@/lib/reader/limits";
import { storeKind } from "@/lib/reader/store";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const [up, wd] = await Promise.all([used("uploads", user).catch(() => 0), used("words", user).catch(() => 0)]);
  return Response.json({
    user, admin: isAdmin(user),
    ai: aiConfigured() ? { provider: "gemini", model: currentModel() } : workerConfigured() ? { provider: "worker" } : null,
    blob: blobConfigured(), store: storeKind(),
    limits: { uploads: { used: up, max: maxFor("uploads", user) }, words: { used: wd, max: maxFor("words", user) } },
  }, { headers: { "Cache-Control": "no-store" } });
}

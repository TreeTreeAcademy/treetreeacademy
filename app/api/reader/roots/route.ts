// 词根词缀 notes for 学习区. POST {words:[...]} (≤25) -> {roots:{w:{n,k}}}. Cached for everyone; missing ones generated lazily.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { ensureRoots } from "@/lib/reader/roots";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const text = await req.text();
  if (text.length > 5000) return Response.json({ error: "too large" }, { status: 413 });
  let words: string[] = [];
  try { words = (JSON.parse(text).words || []).filter((x: any) => typeof x === "string").slice(0, 25); } catch { /* empty */ }
  if (!words.length) return Response.json({ roots: {} });
  const r = await ensureRoots(words, 25000);
  const roots: Record<string, string> = {};
  for (const [w, v] of Object.entries(r.roots)) if (v) roots[w] = v.n || "";
  return Response.json({ roots, partial: r.missing > 0 || undefined, detail: r.err || undefined });
}

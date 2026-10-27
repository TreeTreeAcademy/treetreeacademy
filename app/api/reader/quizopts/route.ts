// Distractors for the ⑤用法场景 译文选择题. Shared cache across ALL families; new sets are generated
// in ONE Gemini call per request (max 10 sentences) and counted against READER_DAILY_QUIZ (default 200/day).
import { requireUser, unauthorized } from "@/lib/reader/session";
import { aiConfigured, aiErrorResponse } from "@/lib/reader/ai";
import { cachedQuiz, generateQuiz, type QuizItem } from "@/lib/reader/quiz";
import { consume, maxFor, remaining } from "@/lib/reader/limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const text = await req.text();
  if (text.length > 20000) return Response.json({ error: "too large" }, { status: 413 });
  let items: QuizItem[] = [];
  try {
    items = (JSON.parse(text).items || [])
      .filter((x: any) => typeof x?.w === "string" && typeof x?.en === "string" && typeof x?.zh === "string" && x.en.trim() && x.zh.trim())
      .map((x: any) => ({ w: x.w.slice(0, 41), en: x.en.slice(0, 400), zh: x.zh.slice(0, 300) })).slice(0, 10);
  } catch { /* empty */ }
  if (!items.length) return Response.json({ opts: {} });
  const opts = await cachedQuiz(items);
  const need = items.filter((x) => !opts[x.w]);
  const meta: any = { cached: Object.keys(opts).length, generated: 0 };
  if (!need.length) return Response.json({ opts, _ai: meta });
  if (!aiConfigured()) return Response.json({ opts, partial: true, detail: "ai_not_configured", _ai: meta });
  const left = await remaining("quiz", user);
  if (left <= 0) return Response.json({ opts, partial: true, detail: "daily_limit", _ai: meta });
  try {
    const r = await generateQuiz(need.slice(0, left));
    Object.assign(opts, r.opts);
    meta.generated = Object.keys(r.opts).length; meta.model = r.model; meta.ms = r.ms;
    await consume("quiz", user, meta.generated);
    return Response.json({ opts, _ai: meta });
  } catch (e) {
    // quota / busy: the client falls back to translations of other sentences
    const res = await aiErrorResponse(e).json().catch(() => ({} as any));
    return Response.json({ opts, partial: true, detail: res.detail || "ai_error", _ai: meta });
  }
}

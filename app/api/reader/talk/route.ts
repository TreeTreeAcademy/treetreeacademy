// 复习区 听对话选回答: AI dialogues for groups of review words. Shared cache; new ones count against READER_DAILY_QUIZ.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { aiConfigured, aiErrorResponse } from "@/lib/reader/ai";
import { cachedTalk, generateTalk, talkId } from "@/lib/reader/talk";
import { consume, remaining } from "@/lib/reader/limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const text = await req.text();
  if (text.length > 20000) return Response.json({ error: "too large" }, { status: 413 });
  let groups: { id: string; words: string[]; hint: string }[] = [];
  try {
    groups = (JSON.parse(text).groups || [])
      .map((g: any) => {
        const words = (Array.isArray(g?.words) ? g.words : []).filter((w: any) => typeof w === "string" && w.trim()).map((w: string) => w.trim().slice(0, 41)).slice(0, 3);
        return { id: talkId(words), words, hint: typeof g?.hint === "string" ? g.hint : "" };
      })
      .filter((g: any) => g.words.length).slice(0, 8);
  } catch { /* empty */ }
  if (!groups.length) return Response.json({ talks: {} });
  const talks = await cachedTalk(groups.map((g) => g.id));
  const need = groups.filter((g) => !talks[g.id]);
  const meta: any = { cached: Object.keys(talks).length, generated: 0 };
  if (!need.length) return Response.json({ talks, _ai: meta });
  if (!aiConfigured()) return Response.json({ talks, partial: true, detail: "ai_not_configured", _ai: meta });
  const left = await remaining("quiz", user);
  if (left <= 0) return Response.json({ talks, partial: true, detail: "daily_limit", _ai: meta });
  try {
    const r = await generateTalk(need.slice(0, left));
    Object.assign(talks, r.talks);
    meta.generated = Object.keys(r.talks).length; meta.model = r.model; meta.ms = r.ms;
    await consume("quiz", user, meta.generated);
    return Response.json({ talks, _ai: meta });
  } catch (e) {
    const res = await aiErrorResponse(e).json().catch(() => ({} as any));
    return Response.json({ talks, partial: true, detail: res.detail || "ai_error", _ai: meta });
  }
}

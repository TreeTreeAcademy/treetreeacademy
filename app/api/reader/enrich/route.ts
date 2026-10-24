// AI learning content for words not in the curated lexicon. Shared cache across ALL families:
// a word is generated once, then served from the store. Scenes are always labelled 故事由 AI 创作.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { forward, workerConfigured } from "@/lib/reader/worker";
import { aiConfigured, aiErrorResponse } from "@/lib/reader/ai";
import { cachedEntries, generateEntries, validWord, type Entry } from "@/lib/reader/enrich";
import { consume, limitResponse, maxFor, remaining } from "@/lib/reader/limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;
const BATCH = 10;

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const text = await req.text();
  if (text.length > 20000) return Response.json({ error: "too large" }, { status: 413 });
  if (!aiConfigured()) {
    if (workerConfigured()) return forward("/enrich", text, "application/json");
    return Response.json({ error: "ai_not_configured", detail: "还没有配置 AI（GEMINI_API_KEY）。" }, { status: 501 });
  }
  let items: { w: string; sentence?: string }[] = [];
  try { items = (JSON.parse(text).words || []).map((x: any) => (typeof x === "string" ? { w: x } : x)).filter((x: any) => validWord(x?.w)).slice(0, 30); } catch { /* empty */ }
  if (!items.length) return Response.json({ entries: {} });
  items = items.map((x) => ({ w: x.w.trim(), sentence: typeof x.sentence === "string" ? x.sentence : "" }));

  const entries: Record<string, Entry> = await cachedEntries(items.map((x) => x.w));
  const cached = Object.keys(entries).length;
  let need = items.filter((x) => !entries[x.w]);
  const meta: any = { cached, generated: 0 };
  if (need.length) {
    const left = await remaining("words", user);
    if (left <= 0) {
      if (cached) return Response.json({ entries, partial: true, detail: limitDetail(maxFor("words", user)), _ai: meta });
      return limitResponse("words", maxFor("words", user));
    }
    if (need.length > left) meta.detail = limitDetail(maxFor("words", user));
    need = need.slice(0, left);
    try {
      for (let i = 0; i < need.length; i += BATCH) {
        const r = await generateEntries(need.slice(i, i + BATCH));
        Object.assign(entries, r.entries);
        meta.generated += Object.keys(r.entries).length; meta.model = r.model; meta.ms = (meta.ms || 0) + r.ms; meta.retries = (meta.retries || 0) + r.retries;
        await consume("words", user, Object.keys(r.entries).length);
      }
    } catch (e) {
      if (Object.keys(entries).length) {
        const res = await aiErrorResponse(e).json();
        return Response.json({ entries, partial: true, detail: res.detail, _ai: meta });
      }
      return aiErrorResponse(e);
    }
  }
  for (const v of Object.values(entries)) if (v?.scene) v.scene[0] = "ai";
  if (meta.detail) return Response.json({ entries, partial: true, detail: meta.detail, _ai: meta });
  return Response.json({ entries, _ai: meta });
}
const limitDetail = (max: number) => `今天新生成的 AI 单词内容（${max} 个）已经用完了，明天再来吧！`;

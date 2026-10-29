// GET  /api/reader/tts?t=<text>&v=a|b|n  → audio/mpeg (natural Gemini TTS, shared KV cache). 204 = use speechSynthesis.
// POST /api/reader/tts {v, items:[...]}  → pre-generate many short items (words) in ONE TTS request; {ready:[...]}.
// New requests count against READER_DAILY_TTS (default 60/day, admin 300). Cached clips are free.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { cachedTts, generateTts, generateTtsBatch, normText, purgeOld, ttsKey, VOICES } from "@/lib/reader/tts";
import { kvExists } from "@/lib/reader/store";
import { kkKey, kkNorm, kokoroClip, recordWant } from "@/lib/reader/kokoro";
import { consume, remaining } from "@/lib/reader/limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const audio = (b: Buffer, src = "gemini") => new Response(new Uint8Array(b), { headers: { "Content-Type": "audio/mpeg", "x-tts-src": src, "Cache-Control": src === "kokoro" ? "private, max-age=86400" : "private, max-age=31536000, immutable" } });
const none = (why: string) => new Response(null, { status: 204, headers: { "x-tts": why, "Cache-Control": "no-store" } });

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  await purgeOld();
  const u = new URL(req.url);
  const t = normText(u.searchParams.get("t") || ""), v = u.searchParams.get("v") || "n";
  if (!t || !/[a-z]/i.test(t) || !VOICES[v]) return none("bad");
  // 1) saved Gemini clip  2) saved Kokoro clip (instant)  3) live Gemini (only when neither exists)
  const hit = (await cachedTts(t, v)) || (kkNorm(t) !== t ? await cachedTts(kkNorm(t), v) : null);
  if (hit) return audio(hit);
  const kk = await kokoroClip(t, v);
  if (kk) return audio(kk, "kokoro");
  await recordWant(t, v);
  if (u.searchParams.get("c") === "1") return none("miss");
  if (!process.env.GEMINI_API_KEY) return none("ai_not_configured");
  if ((await remaining("tts", user)) <= 0) return none("daily_limit");
  try {
    const r = await generateTts(t, v);
    await consume("tts", user, 1);
    return audio(r.mp3);
  } catch (e: any) {
    return none(e?.constructor?.name === "TtsQuota" ? "quota" : "error");
  }
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  await purgeOld();
  let body: any = {};
  try { body = JSON.parse((await req.text()).slice(0, 20000)); } catch { /* empty */ }
  const v = VOICES[body?.v] ? body.v : "n";
  const items: string[] = [...new Set<string>((Array.isArray(body?.items) ? body.items : []).map((x: any) => normText(String(x || ""))).filter((x: string) => x && x.length <= 40 && /[a-z]/i.test(x)))].slice(0, 16);
  if (!items.length) return Response.json({ ready: [] });
  const kkHave = await kvExists(items.map((x) => kkKey(x, v)));
  items.forEach((x, i) => { if (!kkHave[i]) recordWant(x, v); });
  const gHave = await kvExists(items.map((x) => ttsKey(x, v)));
  const have = items.map((_, i) => kkHave[i] || gHave[i]);
  const ready = items.filter((_, i) => have[i]), need = items.filter((_, i) => !have[i]);
  if (!need.length || !process.env.GEMINI_API_KEY) return Response.json({ ready, missing: need });
  if ((await remaining("tts", user)) <= 0) return Response.json({ ready, missing: need, detail: "daily_limit" });
  try {
    const r = await generateTtsBatch(need, v);
    await consume("tts", user, 1);
    return Response.json({ ready: [...ready, ...r.done], missing: need.filter((x) => !r.done.includes(x)), model: r.model });
  } catch (e: any) {
    return Response.json({ ready, missing: need, detail: e?.constructor?.name === "TtsQuota" ? "quota" : String(e?.message || "error").slice(0, 40) });
  }
}

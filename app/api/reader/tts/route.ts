// GET /api/reader/tts?t=<text>&v=a|b|n  → audio/mpeg (natural Gemini TTS, shared KV cache). 204 = use speechSynthesis.
// New clips count against READER_DAILY_TTS (default 60/day, admin 300). Cached clips are free.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { cachedTts, generateTts, normText, purgeV1, VOICES } from "@/lib/reader/tts";
import { consume, remaining } from "@/lib/reader/limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const audio = (b: Buffer) => new Response(new Uint8Array(b), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=31536000, immutable" } });
const none = (why: string) => new Response(null, { status: 204, headers: { "x-tts": why, "Cache-Control": "no-store" } });

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const u = new URL(req.url);
  const t = normText(u.searchParams.get("t") || ""), v = u.searchParams.get("v") || "n";
  if (!t || !/[a-z]/i.test(t) || !VOICES[v]) return none("bad");
  await purgeV1();
  const hit = await cachedTts(t, v);
  if (hit) return audio(hit);
  if (u.searchParams.get("c") === "1") return none("miss"); // cache-only probe
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

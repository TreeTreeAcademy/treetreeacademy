// Natural neural TTS (Gemini TTS) → small mono MP3, cached for ALL families in KV (reader:tts:v1:<hash>).
// Gemini TTS daily quotas are tiny and per model, so we walk a chain of TTS models and remember (per UTC-ish day)
// which ones hit their daily limit. Callers fall back to the browser's speechSynthesis on any failure.
//   READER_TTS_MODELS  comma list override
import { createHash } from "node:crypto";
import { Mp3Encoder } from "@breezystack/lamejs";
import { kvDelMatch, kvGet, kvSet } from "@/lib/reader/store";

// Only the bare text is sent to the TTS model: any instruction in the prompt can be read aloud.
export const VOICES: Record<string, { name: string }> = { a: { name: "Puck" }, b: { name: "Leda" }, n: { name: "Kore" } };
const base = () => (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const chain = () => (process.env.READER_TTS_MODELS || "gemini-3.8-flash-lite-tts,gemini-3.8-flash-tts,gemini-2.5-flash-preview-tts,gemini-3.1-flash-tts-preview,gemini-2.5-pro-preview-tts").split(",").map((s) => s.trim()).filter(Boolean);
const day = () => new Date(Date.now() - 8 * 3600e3).toISOString().slice(0, 10); // Gemini RPD resets at midnight Pacific
const exKey = (m: string) => `reader:ttsx:${m}:${day()}`;

export const normText = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 300);
export const ttsKey = (text: string, v: string) => "reader:tts:v2:" + createHash("sha1").update(v + "\n" + normText(text)).digest("hex").slice(0, 24);

export async function cachedTts(text: string, v: string): Promise<Buffer | null> {
  const s = await kvGet(ttsKey(text, v));
  return s ? Buffer.from(s, "base64") : null;
}

function pcmFrom(b64: string, mime: string): { pcm: Int16Array; rate: number } {
  let buf = Buffer.from(b64, "base64"), rate = Number((/rate=(\d+)/.exec(mime) || [])[1] || 24000);
  if (buf.subarray(0, 4).toString() === "RIFF") {
    rate = buf.readUInt32LE(24);
    let o = 12; while (o + 8 <= buf.length && buf.subarray(o, o + 4).toString() !== "data") o += 8 + buf.readUInt32LE(o + 4);
    buf = buf.subarray(o + 8);
  }
  const pcm = new Int16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + (buf.length & ~1)));
  return { pcm, rate };
}
/** Clean PCM: remove DC offset, trim silence (keep ~60ms), 12ms fade-in, 60ms fade-out, plus 80ms of true silence
 *  at the end so the MP3 frame padding never cuts a waveform mid-swing (the "click / shutdown" noise). */
function clean(p: Int16Array, rate: number): Int16Array {
  let dc = 0; for (let i = 0; i < p.length; i++) dc += p[i]; dc = p.length ? dc / p.length : 0;
  const th = 400; let s = 0, e = p.length - 1;
  while (s < p.length && Math.abs(p[s] - dc) < th) s++;
  while (e > s && Math.abs(p[e] - dc) < th) e--;
  const pad = Math.round(rate * 0.06);
  s = Math.max(0, s - pad); e = Math.min(p.length - 1, e + pad);
  const n = e - s + 1, fi = Math.round(rate * 0.012), fo = Math.round(rate * 0.06), tail = Math.round(rate * 0.08);
  const out = new Int16Array(n + tail);
  for (let i = 0; i < n; i++) {
    let g = 1; if (i < fi) g = i / fi; const r = n - 1 - i; if (r < fo) g = Math.min(g, r / fo);
    out[i] = Math.max(-32768, Math.min(32767, Math.round((p[s + i] - dc) * g * 0.9)));
  }
  return out;
}
function toMp3(pcm: Int16Array, rate: number): Buffer {
  const enc = new Mp3Encoder(1, rate, 40), out: Uint8Array[] = [];
  for (let i = 0; i < pcm.length; i += 1152) { const d = enc.encodeBuffer(pcm.subarray(i, i + 1152)); if (d.length) out.push(d); }
  const f = enc.flush(); if (f.length) out.push(f);
  return Buffer.concat(out.map((u) => Buffer.from(u)));
}

export class TtsQuota extends Error {}

export async function generateTts(text: string, v: string): Promise<{ mp3: Buffer; model: string }> {
  const voice = VOICES[v] || VOICES.n, t = normText(text);
  void purgeV1();
  let lastErr: any = null;
  for (const m of chain()) {
    if (await kvGet(exKey(m))) continue;
    const r = await fetch(`${base()}/models/${m}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY || "" },
      body: JSON.stringify({ contents: [{ parts: [{ text: t }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.name } } } } }),
    }).catch((e) => { lastErr = e; return null; });
    if (!r) continue;
    if (r.status === 429) { // per-day → mark model exhausted; per-minute → try next model
      const body = await r.text();
      if (/PerDay|per day|daily/i.test(body)) await kvSet(exKey(m), "1", 2 * 86400);
      lastErr = new TtsQuota(m); continue;
    }
    if (!r.ok) { lastErr = new Error(`tts ${m} ${r.status}`); continue; }
    const j: any = await r.json();
    const part = j?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
    if (!part) { lastErr = new Error(`tts ${m} empty`); continue; }
    const { pcm, rate } = pcmFrom(part.inlineData.data, part.inlineData.mimeType || "");
    const mp3 = toMp3(clean(pcm, rate), rate);
    if (mp3.length < 500) { lastErr = new Error("tts short"); continue; }
    await kvSet(ttsKey(t, v), mp3.toString("base64"));
    return { mp3, model: m };
  }
  throw lastErr || new TtsQuota("all");
}

/** One-time cleanup of v1 clips (they had the style instruction spoken aloud). */
let purged = false;
export async function purgeV1() {
  if (purged) return; purged = true;
  try { if (await kvGet("reader:ttsv1purged")) return; const n = await kvDelMatch("reader:tts:v1:*"); await kvSet("reader:ttsv1purged", String(n)); } catch { purged = false; }
}

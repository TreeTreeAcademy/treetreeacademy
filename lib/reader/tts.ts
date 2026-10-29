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
export const ttsKey = (text: string, v: string) => "reader:tts:v3:" + createHash("sha1").update(v + "\n" + normText(text)).digest("hex").slice(0, 24);

export async function cachedTts(text: string, v: string): Promise<Buffer | null> {
  const s = await kvGet(ttsKey(text, v));
  return s ? Buffer.from(s, "base64") : null;
}

function pcmFrom(b64: string, mime: string): { pcm: Int16Array; rate: number } {
  let buf = Buffer.from(b64, "base64"), rate = Number((/rate=(\d+)/.exec(mime) || [])[1] || 24000);
  if (buf.subarray(0, 4).toString() === "RIFF") {
    rate = buf.readUInt32LE(24);
    let o = 12; while (o + 8 <= buf.length && buf.subarray(o, o + 4).toString() !== "data") o += 8 + buf.readUInt32LE(o + 4);
    // honour the data chunk size: Gemini WAVs carry ~6 KB of non-audio bytes AFTER the samples, which decoded as a
    // loud ~120 ms burst at the end of every clip (the "machine shutting down" noise)
    const size = o + 8 <= buf.length ? buf.readUInt32LE(o + 4) : 0;
    buf = buf.subarray(o + 8, size > 0 && o + 8 + size <= buf.length ? o + 8 + size : buf.length);
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

async function callTts(text: string, v: string): Promise<{ pcm: Int16Array; rate: number; model: string }> {
  const voice = VOICES[v] || VOICES.n;
  let lastErr: any = null;
  for (const m of chain()) {
    if (await kvGet(exKey(m))) continue;
    const r = await fetch(`${base()}/models/${m}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY || "" },
      body: JSON.stringify({ contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.name } } } } }),
    }).catch((e) => { lastErr = e; return null; });
    if (!r) continue;
    if (r.status === 429) {
      const body = await r.text();
      if (/PerDay|per day|daily/i.test(body)) await kvSet(exKey(m), "1", 2 * 86400);
      lastErr = new TtsQuota(m); continue;
    }
    if (!r.ok) { lastErr = new Error(`tts ${m} ${r.status}`); continue; }
    const j: any = await r.json();
    const part = j?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data);
    if (!part) { lastErr = new Error(`tts ${m} empty`); continue; }
    return { ...pcmFrom(part.inlineData.data, part.inlineData.mimeType || ""), model: m };
  }
  throw lastErr || new TtsQuota("all");
}

export async function generateTts(text: string, v: string): Promise<{ mp3: Buffer; model: string }> {
  const t = normText(text);
  void purgeOld();
  const { pcm, rate, model } = await callTts(t, v);
  const mp3 = toMp3(clean(pcm, rate), rate);
  if (mp3.length < 500) throw new Error("tts short");
  await kvSet(ttsKey(t, v), mp3.toString("base64"));
  return { mp3, model };
}

/** Many short items (words / short phrases) in ONE request: read as a list with pauses, then split at the N-1
 *  longest silences. Only cached when every piece looks right (duration roughly proportional to its length). */
export async function generateTtsBatch(items: string[], v: string): Promise<{ done: string[]; model: string }> {
  const list = items.map(normText).filter(Boolean);
  if (list.length < 2) { if (list[0]) await generateTts(list[0], v); return { done: list, model: "" }; }
  const { pcm, rate, model } = await callTts(list.map((x) => x.replace(/[.!?…]+$/, "") + ".").join("\n"), v);
  let dc = 0; for (let i = 0; i < pcm.length; i++) dc += pcm[i]; dc /= pcm.length || 1;
  const win = Math.round(rate * 0.01), loud: boolean[] = [];
  for (let i = 0; i < pcm.length; i += win) { let mx = 0; for (let k = i; k < Math.min(pcm.length, i + win); k++) mx = Math.max(mx, Math.abs(pcm[k] - dc)); loud.push(mx > 600); }
  let s0 = loud.indexOf(true), e0 = loud.lastIndexOf(true);
  if (s0 < 0) throw new Error("batch silent");
  const gaps: { a: number; b: number }[] = [];
  for (let i = s0; i <= e0; i++) if (!loud[i]) { let j = i; while (j <= e0 && !loud[j]) j++; gaps.push({ a: i, b: j }); i = j; }
  const cuts = gaps.filter((g) => g.b - g.a >= 18).sort((x, y) => (y.b - y.a) - (x.b - x.a)).slice(0, list.length - 1).sort((x, y) => x.a - y.a);
  if (cuts.length !== list.length - 1) throw new Error("batch split");
  const bounds: [number, number][] = []; let st = s0;
  for (const c of cuts) { bounds.push([st, c.a]); st = c.b; }
  bounds.push([st, e0 + 1]);
  const dur = bounds.map(([a, b]) => b - a), chars = list.map((x) => Math.max(3, x.replace(/[^a-z]/gi, "").length));
  const per = dur.reduce((x, y) => x + y, 0) / chars.reduce((x, y) => x + y, 0);
  if (dur.some((d, i) => d < 15 || d / (chars[i] * per) < 0.35 || d / (chars[i] * per) > 2.8)) throw new Error("batch shape");
  const done: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const a = Math.max(0, bounds[i][0] * win - Math.round(rate * 0.05)), b = Math.min(pcm.length, bounds[i][1] * win + Math.round(rate * 0.08));
    const mp3 = toMp3(clean(pcm.subarray(a, b), rate), rate);
    if (mp3.length < 400) continue;
    await kvSet(ttsKey(list[i], v), mp3.toString("base64")); done.push(list[i]);
  }
  return { done, model };
}

/** One-time cleanup of old clips: v1 had the style prompt spoken aloud, v1/v2 had the trailing noise burst. */
let purged = false;
export async function purgeOld() {
  if (purged) return; purged = true;
  try {
    if (await kvGet("reader:ttsv2purged")) return;
    const n = (await kvDelMatch("reader:tts:v1:*")) + (await kvDelMatch("reader:tts:v2:*"));
    await kvSet("reader:ttsv2purged", String(n));
  } catch { purged = false; }
}

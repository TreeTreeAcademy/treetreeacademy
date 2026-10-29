// Pre-generated natural voice clips (Kokoro-82M, Apache-2.0), made on the box by scripts/kokoro-tts and uploaded
// through /api/reader-import/tts (Bearer READER_IMPORT_TOKEN). The reader's TTS route serves these FIRST.
//   reader:kk:v1:<hash>   base64 MP3 (voice n = af_heart words/sentences, a = af_bella, b = am_puck)
//   reader:kkw:<hash>     JSON {t,v}: "wanted" — the reader asked for a clip we don't have yet (box job voices it)
// Content for the backfill is read from the store at runtime (books, shared sources, lex, dialogues, progress);
// nothing about the books lives in git.
import { createHash } from "node:crypto";
import { kvGet, kvKeys, kvMGet, kvSetNx } from "@/lib/reader/store";
import { listUsers } from "@/lib/reader/users";
import { listBooks, getBook } from "@/lib/reader/mybooks";
import { listShared, kSrc } from "@/lib/reader/shared";

export const KK_VOICES: Record<string, string> = { n: "af_heart", a: "af_bella", b: "am_puck" };
/** Canonical text: single words are case/punctuation-insensitive ("Gust," == "gust"). */
export function kkNorm(t: string): string {
  const s = String(t || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const m = s.match(/^["“'‘(]*([A-Za-z]+(?:['’][A-Za-z]+)?)["”'’).,!?;:]*$/);
  return m ? m[1].toLowerCase().replace(/’/g, "'") : s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}
export const kkKey = (t: string, v: string) => "reader:kk:v1:" + createHash("sha1").update(v + "\n" + kkNorm(t)).digest("hex").slice(0, 24);
const wantKey = (t: string, v: string) => "reader:kkw:" + kkKey(t, v).slice(13);

export async function kokoroClip(t: string, v: string): Promise<Buffer | null> {
  if (!KK_VOICES[v]) return null;
  const s = await kvGet(kkKey(t, v));
  return s ? Buffer.from(s, "base64") : null;
}
export async function recordWant(t: string, v: string) {
  const n = kkNorm(t);
  if (!KK_VOICES[v] || !n || !/[a-z]/i.test(n) || /[\u3000-\u9fff]/.test(n)) return;
  try { await kvSetNx(wantKey(n, v), JSON.stringify({ t: n, v }), 30 * 86400); } catch { /* best effort */ }
}
export async function listWants(): Promise<{ t: string; v: string }[]> {
  const ks = await kvKeys("reader:kkw:*", 5000);
  const out: { t: string; v: string }[] = [];
  for (let i = 0; i < ks.length; i += 200) {
    (await kvMGet(ks.slice(i, i + 200))).forEach((x) => { try { const j = JSON.parse(x || ""); if (j.t && KK_VOICES[j.v]) out.push(j); } catch { /* skip */ } });
  }
  return out;
}
export const wantKeyOf = wantKey;

// ---------- content collection ----------
const TOK = /[A-Za-z]+(?:['’][A-Za-z]+)?/g;
const english = (s: unknown): s is string => typeof s === "string" && /[a-z]/i.test(s) && !/[\u3000-\u9fff\uff00-\uffef]/.test(s) && !/^(https?:|\/|data:)/.test(s) && s.length <= 300;
type Bag = Map<string, { t: string; v: string }>;
function add(bag: Bag, t: string, v = "n", words = true) {
  const n = kkNorm(t); if (!n || !english(n)) return;
  bag.set(v + "\n" + n, { t: n, v });
  if (words) for (const m of n.match(TOK) || []) { const w = kkNorm(m); bag.set("n\n" + w, { t: w, v: "n" }); }
}
/** Walk any JSON and voice the English strings at text-like keys. */
function walk(bag: Bag, x: any, depth = 0) {
  if (depth > 12 || x == null) return;
  if (Array.isArray(x)) { x.forEach((y) => (typeof y === "string" ? english(y) && /\s/.test(y) && add(bag, y) : walk(bag, y, depth + 1))); return; }
  if (typeof x !== "object") return;
  for (const [k, v] of Object.entries(x)) {
    if (typeof v === "string") { if (/^(en|w|word|say|text|story_en|a|ok)$/i.test(k) && english(v)) add(bag, v); }
    else walk(bag, v, depth + 1);
  }
}
function talk(bag: Bag, t: any) {
  if (!t) return;
  if (t.a?.en) add(bag, t.a.en, "a");
  if (t.ok?.en) add(bag, t.ok.en, "b");
  for (const w of t.wrong || []) if (w?.en) add(bag, w.en, "b");
}
async function scanVals(match: string, fn: (v: any) => void) {
  const ks = await kvKeys(match, 20000);
  for (let i = 0; i < ks.length; i += 100) (await kvMGet(ks.slice(i, i + 100))).forEach((s) => { try { s && fn(JSON.parse(s)); } catch { /* skip */ } });
  return ks.length;
}
/** Everything the reader may speak, from the store. */
export async function collectAll(): Promise<{ items: { t: string; v: string }[]; sources: Record<string, number> }> {
  const bag: Bag = new Map(); const src: Record<string, number> = {};
  for (const u of listUsers()) {
    for (const b of await listBooks(u)) {
      const raw = await getBook(u, b.id); if (!raw) continue;
      try { const j = JSON.parse(raw); (j.sentences || []).forEach((s: any) => s?.en && add(bag, s.en)); (j.words || []).forEach((w: any) => { if (w?.w) { add(bag, w.w); add(bag, "Great job! " + w.w, "n", false); } }); src.books = (src.books || 0) + 1; } catch { /* skip */ }
    }
    const p = await kvGet(`reader:progress:${u}`);
    if (p) { try { const j = JSON.parse(p); walk(bag, j); for (const t of Object.values(j?.tk2 || {})) talk(bag, t); src.progress = (src.progress || 0) + 1; } catch { /* skip */ } }
  }
  for (const it of await listShared()) { const raw = await kvGet(kSrc(it.id)); if (raw) { try { walk(bag, JSON.parse(raw)); src.shared = (src.shared || 0) + 1; } catch { /* skip */ } } }
  src.lex = await scanVals("reader:lex:v1:*", (j) => walk(bag, j));
  src.talk = await scanVals("reader:talk:v2:*", (j) => { (Array.isArray(j) ? j : [j]).forEach((t) => talk(bag, t)); });
  for (const w of await listWants()) bag.set(w.v + "\n" + w.t, w);
  return { items: [...bag.values()], sources: src };
}

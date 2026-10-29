// 复习区 ③听对话选回答: short fun two-character dialogues built from the learner's review words.
// Generated once per word group (sorted, lower-cased) and cached for ALL families (store key reader:talk:v1:<hash>).
import { createHash } from "node:crypto";
import { generateJSON } from "@/lib/reader/ai";
import { kvMGet, kvSet } from "@/lib/reader/store";

export type TalkLine = { en: string; zh: string };
export type Talk = { an: string; ae: string; bn: string; be: string; a: TalkLine; ok: TalkLine; wrong: TalkLine[] };
export const talkId = (words: string[]) => words.map((w) => w.trim().toLowerCase()).filter(Boolean).sort().join("|");
export const talkKey = (id: string) => "reader:talk:v1:" + createHash("sha1").update(id).digest("hex").slice(0, 24);

const LINE = { type: "object", properties: { en: { type: "string" }, zh: { type: "string" } }, required: ["en", "zh"] };
const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          i: { type: "integer" },
          a_name: { type: "string" }, a_emoji: { type: "string" },
          b_name: { type: "string" }, b_emoji: { type: "string" },
          a: LINE, reply: LINE,
          wrong: { type: "array", items: LINE },
        },
        required: ["i", "a_name", "a_emoji", "b_name", "b_emoji", "a", "reply", "wrong"],
      },
    },
  },
  required: ["items"],
};

const PROMPT = `You write a listening game for children (6-12) learning English. For EACH item you get 1-3 English words (words) with a Chinese hint.
Create a tiny, FUNNY, kid-friendly two-character dialogue moment:
- Two playful characters (animals, kids, robots, a grandma, a dragon...), each with a short English name (a_name, b_name) and ONE emoji (a_emoji, b_emoji). Vary characters between items.
- a.en: ONE natural spoken sentence (6-16 words) said by character A that uses ALL the given words naturally (inflected forms OK). Usually a question or a surprising statement that invites a reply. Simple vocabulary apart from the target words.
- reply.en: the ONE best, natural, witty reply by character B (3-14 words) that clearly fits A's line.
- wrong: exactly 3 replies that sound like plausible English but do NOT fit A's line (answer a different question, wrong yes/no logic, wrong time/person/thing, or off-topic). Similar length and style to reply; never also-correct; no rude content.
- zh for every line: 信达雅 Simplified Chinese — faithful, fluent, lively, natural for kids. Not word-for-word.
- Do not add explanations.
Items:\n`;

function clean(t: any): TalkLine | null {
  const en = String(t?.en || "").trim().slice(0, 240), zh = String(t?.zh || "").trim().slice(0, 200);
  return en && zh ? { en, zh } : null;
}

export async function cachedTalk(ids: string[]) {
  const vals = await kvMGet(ids.map(talkKey));
  const out: Record<string, Talk> = {};
  ids.forEach((id, i) => { if (vals[i]) { try { const t = JSON.parse(vals[i]!); if (t?.a && t?.ok && t?.wrong?.length >= 3) out[id] = t; } catch { /* ignore */ } } });
  return out;
}

export async function generateTalk(items: { id: string; words: string[]; hint: string }[]) {
  const r = await generateJSON<{ items: any[] }>(
    [{ text: PROMPT + JSON.stringify(items.map((x, i) => ({ i, words: x.words, hint: x.hint.slice(0, 120) }))) }],
    SCHEMA, { temperature: 0.9, maxOutputTokens: 6000 });
  const out: Record<string, Talk> = {};
  for (const e of r.data.items || []) {
    const it = items[e?.i as number];
    if (!it) continue;
    const a = clean(e.a), ok = clean(e.reply);
    if (!a || !ok) continue;
    const seen = new Set([ok.en.toLowerCase()]);
    const wrong = (e.wrong || []).map(clean).filter((x: TalkLine | null): x is TalkLine => !!x && !seen.has(x.en.toLowerCase()) && !!seen.add(x.en.toLowerCase())).slice(0, 3);
    if (wrong.length < 3) continue;
    const t: Talk = {
      an: String(e.a_name || "Momo").slice(0, 20), ae: String(e.a_emoji || "🐼").slice(0, 8),
      bn: String(e.b_name || "Pip").slice(0, 20), be: String(e.b_emoji || "🐰").slice(0, 8), a, ok, wrong,
    };
    out[it.id] = t;
    await kvSet(talkKey(it.id), JSON.stringify(t));
  }
  return { talks: out, model: r.model, ms: r.ms };
}

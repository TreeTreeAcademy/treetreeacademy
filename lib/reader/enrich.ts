// AI learning content per word, cached for ALL families (store key reader:lex:v1:<word>).
// Scenes are always original AI stories: scene[0] is forced to "ai" so the app shows 故事由 AI 创作.
import { generateJSON } from "@/lib/reader/ai";
import { kvMGet, kvSet } from "@/lib/reader/store";

export type Entry = { zh: string; phrases: [string, string][]; scene: ["ai", string, string]; sd?: string[]; dlg: [string, string, string] };
const ck = (w: string) => `reader:lex:v1:${w.toLowerCase()}`;
const WORD_RE = /^[A-Za-z][A-Za-z'\- ]{0,40}$/;

const SCHEMA = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          zh: { type: "string", description: "简明中文释义（含词性），例如 'n. 海狸'" },
          phrases: { type: "array", items: { type: "object", properties: { en: { type: "string" }, zh: { type: "string" } }, required: ["en", "zh"] } },
          story_en: { type: "string", description: "2-3 sentence ORIGINAL funny or thought-provoking mini story using the word" },
          story_zh: { type: "string" },
          story_wrong_zh: { type: "array", items: { type: "string" }, description: "exactly 3 WRONG Chinese translations of story_en, see rules" },
          dlg_prompt: { type: "string", description: "first line of a short everyday dialogue" },
          dlg_right: { type: "string", description: "natural, correct reply that uses the word" },
          dlg_wrong: { type: "string", description: "plausible but wrong / unnatural reply" },
        },
        required: ["word", "zh", "phrases", "story_en", "story_zh", "story_wrong_zh", "dlg_prompt", "dlg_right", "dlg_wrong"],
      },
    },
  },
  required: ["entries"],
};

const PROMPT = `You write learning content for Chinese children (6-12) learning English. For EACH word below return one entry:
- zh: concise Simplified Chinese meaning with part of speech (use the example sentence to pick the sense).
- phrases: exactly 2 real, common English collocations or idioms with the word, each with Chinese.
- story_en / story_zh: a 2-3 sentence ORIGINAL mini story (funny or thought-provoking) using the word, plus Chinese translation.
- story_wrong_zh: exactly 3 WRONG but plausible Chinese translations of story_en, for a multiple-choice quiz. Each has the same length and style as story_zh and changes ONE meaningful thing so that it CONTRADICTS story_en while still reading as a sensible sentence: a wrong meaning of the target word (NOT a synonym), a wrong who-does-what (a different person/animal/action that still makes sense), or a negation/opposite/role swap. Never a typo, never a synonym or rewording (that would also be correct), never identical to story_zh.
- dlg_prompt / dlg_right / dlg_wrong: a 1-line question or remark, a natural correct reply using the word, and a plausible but wrong reply.
Rules: simple, kid-friendly English. Do NOT quote or imitate songs, films, books or real people; no brand names; no invented facts or attributions.
Words (with the sentence where the child met them):\n`;

export async function cachedEntries(words: string[]) {
  const vals = await kvMGet(words.map(ck));
  const out: Record<string, Entry> = {};
  words.forEach((w, i) => { if (vals[i]) { try { out[w] = JSON.parse(vals[i]!); } catch { /* ignore */ } } });
  return out;
}

export async function generateEntries(items: { w: string; sentence?: string }[]) {
  const r = await generateJSON<{ entries: any[] }>(
    [{ text: PROMPT + JSON.stringify(items.map((x) => ({ word: x.w, sentence: (x.sentence || "").slice(0, 300) }))) }],
    SCHEMA, { temperature: 0.7, maxOutputTokens: 8192 });
  const out: Record<string, Entry> = {};
  const want = new Map(items.map((x) => [x.w.toLowerCase(), x.w]));
  for (const e of r.data.entries || []) {
    const w = want.get(String(e?.word || "").toLowerCase().trim());
    if (!w || !e.dlg_right || !e.dlg_wrong || !e.dlg_prompt) continue;
    const entry: Entry = {
      zh: String(e.zh || "").slice(0, 60),
      phrases: (e.phrases || []).slice(0, 3).filter((p: any) => p?.en).map((p: any) => [String(p.en), String(p.zh || "")] as [string, string]),
      scene: ["ai", String(e.story_en || ""), String(e.story_zh || "")], // ALWAYS labelled as AI-created
      ...(cleanWrong(e.story_wrong_zh, String(e.story_zh || "")).length >= 2 ? { sd: cleanWrong(e.story_wrong_zh, String(e.story_zh || "")) } : {}),
      dlg: [String(e.dlg_prompt), String(e.dlg_right), String(e.dlg_wrong)],
    };
    out[w] = entry;
    await kvSet(ck(w), JSON.stringify(entry));
  }
  return { entries: out, model: r.model, ms: r.ms, retries: r.retries, usage: r.usage };
}

/** Keep only usable quiz distractors: non-empty, distinct, not the right answer, similar length. */
export function cleanWrong(list: unknown, right: string): string[] {
  const r = right.replace(/\s+/g, "");
  const out: string[] = [];
  for (const x of Array.isArray(list) ? list : []) {
    const t = String(x || "").trim().slice(0, 300);
    const n = t.replace(/\s+/g, "").length;
    if (!t || t.replace(/\s+/g, "") === r || out.includes(t)) continue;
    if (r.length && (n < r.length * 0.5 || n > r.length * 1.7)) continue;
    out.push(t);
    if (out.length >= 3) break;
  }
  return out;
}

export const validWord = (w: unknown): w is string => typeof w === "string" && WORD_RE.test(w.trim());

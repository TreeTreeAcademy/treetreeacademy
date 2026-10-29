// 译文选择题 distractors: wrong-but-plausible Chinese translations of a scene sentence.
// Generated once per (English sentence, correct translation) and cached for ALL families (store key reader:quiz:v1:<hash>).
import { createHash } from "node:crypto";
import { generateJSON } from "@/lib/reader/ai";
import { cleanWrong } from "@/lib/reader/enrich";
import { kvMGet, kvSet } from "@/lib/reader/store";

export type QuizItem = { w: string; en: string; zh: string };
export const quizKey = (en: string, zh: string) => "reader:quiz:v1:" + createHash("sha1").update(en.trim() + "\n" + zh.trim()).digest("hex").slice(0, 24);

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          i: { type: "integer" },
          wrong: {
            type: "array",
            items: {
              type: "object",
              properties: { kind: { type: "string", enum: ["word_meaning", "who_does_what", "negation_or_opposite"] }, zh: { type: "string" } },
              required: ["kind", "zh"],
            },
          },
        },
        required: ["i", "wrong"],
      },
    },
  },
  required: ["items"],
};

const PROMPT = `You write multiple-choice distractors for a Chinese-translation quiz for children (6-12) learning English.
For EACH item you get an English sentence (en), its correct Simplified Chinese translation (zh) and the target word (w).
Return exactly 3 WRONG Chinese translations ("wrong": {kind, zh}) for each item, one of each kind. Rules:
- Same length, tone and style as the correct zh (the correct answer must NOT be the longest or the most detailed).
- Each wrong option changes ONE clear, meaningful thing so that it now CONTRADICTS the English sentence: word_meaning = the target word or another key word gets a wrong, clearly different meaning (NOT a synonym, NOT a paraphrase: a child who knows the word must be able to tell it is wrong); who_does_what = subject/object/person/animal swapped or wrong action; negation_or_opposite = negation, opposite, or wrong role/number/time.
- Every wrong option must still read as a sensible, natural sentence a child could believe (swap in a different person/animal/object that makes sense; never swap things so the sentence becomes absurd).
- Each wrong option must differ from the correct zh AND from the other wrong options in a clearly visible way: change the meaning of the target word AND at least one other clause/detail, so at least ~30% of the characters differ. Options that differ by only one or two characters are NOT allowed. For a long, multi-sentence zh, rewrite the sentence that contains the target word substantially.
- A rewording, synonym or alternative natural translation of the correct sentence is NOT allowed (it would also be correct).
- Fluent, natural Chinese. Never a typo or a wrong character, never a nonsense sentence, never also-correct, never identical to zh.
- Do not add explanations.
Items:\n`;

export async function cachedQuiz(items: QuizItem[]) {
  const vals = await kvMGet(items.map((x) => quizKey(x.en, x.zh)));
  const out: Record<string, string[]> = {};
  items.forEach((x, i) => { if (vals[i]) { try { const a = cleanWrong(JSON.parse(vals[i]!), x.zh); if (a.length >= 2) out[x.w] = a; } catch { /* ignore */ } } });
  return out;
}

export async function generateQuiz(items: QuizItem[]) {
  const r = await generateJSON<{ items: { i: number; wrong: string[] }[] }>(
    [{ text: PROMPT + JSON.stringify(items.map((x, i) => ({ i, w: x.w, en: x.en.slice(0, 400), zh: x.zh.slice(0, 300) }))) }],
    SCHEMA, { temperature: 0.5, maxOutputTokens: 4096 });
  const out: Record<string, string[]> = {};
  for (const e of r.data.items || []) {
    const it = items[e?.i as number];
    if (!it) continue;
    const wrong = cleanWrong((e.wrong || []).map((x: any) => (typeof x === "string" ? x : x?.zh)), it.zh);
    if (wrong.length < 2) continue;
    out[it.w] = wrong;
    await kvSet(quizKey(it.en, it.zh), JSON.stringify(wrong));
  }
  return { opts: out, model: r.model, ms: r.ms, retries: r.retries };
}

// 词根词缀 memory notes for 学习区 ①单词卡 / ②拼写补全. One small cached value per word:
//   reader:roots:v1:<word> = {"n":"<note or empty>","k":"affix|compound|family|none"}   (empty note = honestly nothing useful)
// Generated with the text (flash-lite) chain, ≤25 words per call; global cap READER_DAILY_ROOTS_CALLS (default 40 calls/UTC day).
import { generateJSON } from "@/lib/reader/ai";
import { kvGet, kvIncr, kvMGet, kvSet } from "@/lib/reader/store";

export const rootsKey = (w: string) => "reader:roots:v1:" + w.toLowerCase().trim();
export const normWord = (w: string) => String(w || "").toLowerCase().trim().replace(/[’]/g, "'");
const WORD_RE = /^[a-z][a-z' -]{0,39}$/;
export const okWord = (w: string) => WORD_RE.test(w);

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          i: { type: "integer" },
          kind: { type: "string", enum: ["affix", "compound", "family", "none"] },
          parts: { type: "array", items: { type: "string" } },
          note: { type: "string" },
          confident: { type: "boolean" },
        },
        required: ["i", "kind", "parts", "note", "confident"],
      },
    },
  },
  required: ["items"],
};

const PROMPT = `You write short word-formation memory notes (词根词缀) for Chinese children (8-12) learning English.
For EACH English word return:
- kind: "affix" = the word really contains a standard prefix/suffix/root (e.g. foliage, unhappy, careful, quickly, teacher, invisible);
  "compound" = it is a compound of two English words (butterfly, sunflower, raincoat);
  "family" = a simple base word with no affixes, but it has a well-known word family worth noting (e.g. grow → growth, grown-up);
  "none" = nothing useful or you are not sure.
- parts: the morphemes/words exactly as written in the note (e.g. ["foli-","-age"], ["butter","fly"]). Each part (without hyphens) must be spelled as it appears in the word. Empty for family/none.
- note: ONE line in Simplified Chinese, English morphemes kept in English, ≤ 60 characters. Formats:
  affix:    foli-（拉丁语 folium，叶子）+ -age（表示集合、总称）→ 一大片叶子
  compound: butter（黄油）+ fly（飞虫）→ 蝴蝶
  family:   同族词：growth（成长）、grown-up（大人）
  none:     "" (empty string)
- confident: true ONLY if this is real, standard etymology found in dictionaries (Etymonline, Merriam-Webster, Oxford). 
STRICT RULES: Never invent etymology or folk etymology. Do not split a word into fake pieces (e.g. "carpet" is NOT car+pet, "hello" is NOT hell+o, "island" is NOT is+land). Inflections like -s/-ed/-ing only count if they really are the suffix in this word. Name the source language only when you are sure. Family words must be genuinely derived from the same root (NOT plurals, past tenses or -ing forms, NOT a homonym with a different origin such as bear the animal vs bear = carry, NOT made-up words); otherwise use "none".
For Latin/Greek roots give the real source word (e.g. "-pear（拉丁语 parere，出现）"); never translate a meaningless fragment (e.g. appear is NOT ap- + pear "梨", delight has nothing to do with light, every is NOT ever + y). Proper names / invented names → "none".
If in any doubt, use kind "none" with an empty note. Do not add anything else.
Words:\n`;

export type Root = { n: string; k: string };

function validate(word: string, e: any): Root | null {
  if (!e || typeof e.note !== "string") return null;
  const k = ["affix", "compound", "family", "none"].includes(e.kind) ? e.kind : "none";
  let n = e.note.replace(/\s+/g, " ").trim();
  if (k === "none" || e.confident !== true || !n) return { n: "", k: "none" };
  if (n.length > 90 || !/[\u4e00-\u9fff]/.test(n)) return { n: "", k: "none" };
  const w = word.replace(/[^a-z]/g, "");
  if (k === "affix" || k === "compound") {
    const parts: string[] = (Array.isArray(e.parts) ? e.parts : []).map((p: any) => String(p).toLowerCase().replace(/[^a-z]/g, "")).filter(Boolean);
    if (parts.length < 2 && k === "compound") return { n: "", k: "none" };
    if (!parts.length) return { n: "", k: "none" };
    // at least one part must literally occur in the word, and every part must be named in the note
    if (!parts.some((p) => w.includes(p))) return { n: "", k: "none" };
    if (!parts.every((p) => n.toLowerCase().replace(/[^a-z]/g, " ").includes(p) || n.toLowerCase().includes(p))) return { n: "", k: "none" };
    if (k === "compound" && parts.join("") !== w) return { n: "", k: "none" };
  }
  if (k === "family" && !/[a-z]{2,}/i.test(n)) return { n: "", k: "none" };
  return { n, k };
}

export async function cachedRoots(words: string[]): Promise<Record<string, Root | null>> {
  const vals = await kvMGet(words.map(rootsKey));
  const out: Record<string, Root | null> = {};
  words.forEach((w, i) => { const v = vals[i]; if (v) { try { out[w] = JSON.parse(v); } catch { out[w] = null; } } });
  return out;
}

const dayKey = () => "reader:lim:rootscalls:" + new Date().toISOString().slice(0, 10);
export async function rootsCallsLeft() {
  const max = Number(process.env.READER_DAILY_ROOTS_CALLS || 40);
  return Math.max(0, max - Number((await kvGet(dayKey())) || 0));
}

export async function generateRoots(words: string[]) {
  const ws = words.slice(0, 25);
  if (!ws.length) return { roots: {}, model: "", ms: 0 };
  await kvIncr(dayKey(), 1, 2 * 86400);
  const r = await generateJSON<{ items: any[] }>([{ text: PROMPT + JSON.stringify(ws.map((w, i) => ({ i, w }))) }], SCHEMA,
    { temperature: 0.1, maxOutputTokens: 4096 });
  const roots: Record<string, Root> = {};
  for (const e of r.data.items || []) {
    const w = ws[e?.i as number]; if (!w || roots[w]) continue;
    const v = validate(w, e); if (!v) continue;
    roots[w] = v; await kvSet(rootsKey(w), JSON.stringify(v));
  }
  return { roots, model: r.model, ms: r.ms };
}

// cached-first; generates the missing ones while the daily call budget lasts. Never throws.
export async function ensureRoots(words: string[], budgetMs = 40000, maxCalls = 99) {
  const uniq = [...new Set(words.map(normWord).filter(okWord))];
  const have = await cachedRoots(uniq);
  let need = uniq.filter((w) => !have[w]);
  const t0 = Date.now(); let calls = 0, err = "";
  while (need.length && calls < maxCalls && Date.now() - t0 < budgetMs && process.env.GEMINI_API_KEY) {
    if ((await rootsCallsLeft()) <= 0) { err = "daily_limit"; break; }
    const batch = need.slice(0, 25);
    try { const r = await generateRoots(batch); Object.assign(have, r.roots); calls++; }
    catch (e: any) { err = e?.code || "ai_error"; break; }
    need = need.slice(25);
  }
  return { roots: have, calls, err, missing: uniq.filter((w) => !have[w]).length };
}

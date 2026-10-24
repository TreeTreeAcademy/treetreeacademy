// Upload -> Learning Source via Gemini (photo / screenshot OCR, audio transcription, pasted text).
import { generateJSON, uploadFile, deleteFile, AIError, type Part } from "@/lib/reader/ai";
import { buildSource, splitParas, splitSentences, type Gloss } from "@/lib/reader/text";

const GLOSS = {
  type: "array",
  description: "Every distinct English word form in the text (lowercase except 'I'), once each.",
  items: {
    type: "object",
    properties: {
      form: { type: "string", description: "word exactly as it appears, lowercase" },
      lemma: { type: "string", description: "dictionary base form, e.g. swam->swim, beavers->beaver, better->good" },
      zh: { type: "string", description: "short Simplified Chinese gloss for THIS context with part of speech, e.g. 'n. 河狸', 'v. 游泳'" },
    },
    required: ["form", "lemma", "zh"],
  },
};
const SENT = {
  type: "object",
  properties: { en: { type: "string" }, zh: { type: "string", description: "信达雅 Simplified Chinese translation, natural to read aloud to a young child" } },
  required: ["en", "zh"],
};
const MEDIA_SCHEMA = {
  type: "object",
  properties: {
    has_english: { type: "boolean" },
    title: { type: "string", description: "short English title if the page/recording clearly shows one, else empty" },
    paragraphs: { type: "array", items: { type: "object", properties: { sentences: { type: "array", items: SENT } }, required: ["sentences"] } },
    glossary: GLOSS,
  },
  required: ["has_english", "paragraphs", "glossary"],
};
const TEXT_SCHEMA = {
  type: "object",
  properties: {
    translations: { type: "array", items: { type: "string" }, description: "one Chinese translation per input sentence, same order and count" },
    glossary: GLOSS,
  },
  required: ["translations", "glossary"],
};

/** Chinese translation style shared by every prompt (photo, audio, text, whole-book import, polishing). */
export const ZH_STYLE = `Chinese translation style — 信、达、雅:
- 信 Faithful: keep every piece of meaning; add nothing, drop nothing; numbers, names and facts stay exact.
- 达 Fluent: write natural Mainland Simplified Chinese the way a good Chinese picture-book translator would, not word-for-word.
  Avoid translationese: no chains of 的, no needless 被/它/他们/一个, no English word order, no "……的时候" pile-ups; split or merge clauses when Chinese reads better.
- 雅 Pleasant: warm, lively and easy to read aloud to children aged 3–5 (short sentences, everyday words, correct measure words, a little rhythm); keep the tone of the original (wonder, humour, questions, exclamations).
- Science and nature terms must be the standard Chinese names: beaver = 河狸 (never 海狸), cerebral cortex = 大脑皮层, neuron = 神经元, wetland = 湿地, rodent = 啮齿动物. Keep proper names in their common Chinese form (add the English in brackets only if there is no common form).
- Headings, labels and captions: short phrases without a full stop. Questions end with ？, exclamations with ！. Use Chinese punctuation (，。！？“”).`;
const COMMON = `You prepare reading material for Chinese children (3–5 years old, read together with a parent) learning English.
Split text into paragraphs and sentences. Translate every sentence into Simplified Chinese.
${ZH_STYLE}
Glossary: list EVERY distinct English word form once (lowercase except "I"), with its dictionary lemma and a short Chinese gloss for its meaning here ("词性. 释义", max ~8 Chinese characters).
Never add words that are not in the source. Return JSON only.`;
const PHOTO = `${COMMON}
Task: read ALL the English text in this image (picture-book page, textbook, worksheet or screenshot) in natural reading order: titles and headings, body text, captions, labels on pictures and diagrams, speech/thought bubbles, fact boxes and sidebars.
Keep the exact original wording, spelling and punctuation; join words hyphenated across line breaks and lines that belong to one sentence. Do not repeat the same text twice. Skip page numbers, running headers/footers, ISBN/publisher lines, lone scale marks that are not part of a sentence and purely decorative lettering.
If the image contains no English text, set has_english=false and return empty arrays.`;
const AUDIO = `${COMMON}
Task: transcribe the ENGLISH speech in this recording verbatim (a child, parent or teacher reading or talking). Use normal punctuation and capitalization.
Leave out filler sounds (um, uh), background noise and any non-English speech. If there is no intelligible English speech, set has_english=false and return empty arrays.`;

type MediaOut = { has_english: boolean; title?: string; paragraphs: { sentences: { en: string; zh: string }[] }[]; glossary: Gloss[] };
export type ParseMeta = { model: string; ms: number; retries: number; usage?: any };

const INLINE_MAX = Number(process.env.GEMINI_INLINE_MAX_MB || 14) * 1048576; // base64 grows ~33%; request limit is 20 MB

/** One Gemini call: image/audio -> raw paragraphs (en+zh) + glossary (no source building). */
export async function readMedia(bytes: Uint8Array, mime: string, kind: "photo" | "audio") {
  let parts: Part[];
  let fileName: string | null = null;
  if (bytes.length <= INLINE_MAX) {
    parts = [{ inline_data: { mime_type: mime, data: Buffer.from(bytes).toString("base64") } }];
  } else {
    const f = await uploadFile(bytes, mime);
    fileName = f.name;
    parts = [{ file_data: { mime_type: mime, file_uri: f.uri } }];
  }
  parts.push({ text: kind === "audio" ? AUDIO : PHOTO });
  try {
    const r = await generateJSON<MediaOut>(parts, MEDIA_SCHEMA, { maxOutputTokens: 16384, temperature: 0.1, timeoutMs: kind === "audio" ? 240000 : 90000 });
    const paras = (r.data.paragraphs || []).map((p) => (p.sentences || []).filter((s) => s && s.en && s.en.trim())).filter((p) => p.length);
    return { hasEnglish: !!r.data.has_english && paras.length > 0, title: r.data.title || "", paras, glossary: r.data.glossary || [],
      meta: { model: r.model, ms: r.ms, retries: r.retries, usage: r.usage } as ParseMeta };
  } finally {
    if (fileName) await deleteFile(fileName);
  }
}

export async function parseMedia(bytes: Uint8Array, mime: string, kind: "photo" | "audio", title: string) {
  const m = await readMedia(bytes, mime, kind);
  if (!m.hasEnglish) throw new AIError(422, "no_english", kind === "audio" ? "没有听到清楚的英文，请在安静的地方再录一次。" : "没有识别到英文文字，请拍清楚一点再试。");
  const src = await buildSource(title || (kind === "audio" ? "我的录音" : "我的照片"), kind, [{ paras: m.paras }], m.glossary);
  if (!src.sentences.length) throw new AIError(422, "no_english", "没有识别到英文文字。");
  if (!title && m.title) src.title = m.title.slice(0, 80);
  return { src, meta: m.meta };
}

/** One Gemini call: already-split English sentences (e.g. from a PDF text layer) -> Chinese translations + glossary. */
export async function translateSentences(sentences: string[]) {
  const r = await generateJSON<{ translations: string[]; glossary: Gloss[] }>(
    [{ text: `${COMMON}\nTranslate each of these sentences (keep the same order and count) and build the glossary.\n${JSON.stringify(sentences)}` }],
    TEXT_SCHEMA, { maxOutputTokens: 32768, temperature: 0.1, timeoutMs: 180000 });
  const zh = r.data.translations || [];
  return { zh: sentences.map((_, i) => (typeof zh[i] === "string" ? zh[i] : null)), glossary: r.data.glossary || [],
    meta: { model: r.model, ms: r.ms, retries: r.retries, usage: r.usage } as ParseMeta };
}

export async function parseText(text: string, title: string, kind: string) {
  const paras = splitParas(text).map(splitSentences).filter((p) => p.length);
  const flat = paras.flat();
  if (!flat.length) throw new AIError(422, "no_english", "没有识别到英文句子。");
  if (flat.length > 400) throw new AIError(413, "too_long", "文字太长了（超过 400 句），请分成几段上传。");
  const r = await generateJSON<{ translations: string[]; glossary: Gloss[] }>(
    [{ text: `${COMMON}\nTranslate each of these sentences (keep the same order and count) and build the glossary.\n${JSON.stringify(flat)}` }],
    TEXT_SCHEMA, { maxOutputTokens: 16384, temperature: 0.1 });
  let i = 0;
  const zh = r.data.translations || [];
  const pageParas = paras.map((p) => p.map((en) => ({ en, zh: zh[i++] || null })));
  const src = await buildSource(title || "我的文字", kind || "text", [{ paras: pageParas }], r.data.glossary || []);
  return { src, meta: { model: r.model, ms: r.ms, retries: r.retries, usage: r.usage } as ParseMeta };
}

const PAGE_SCHEMA = {
  type: "object",
  properties: {
    blocks: {
      type: "array",
      description: "every piece of English text on the page, in reading order",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["title", "heading", "body", "caption", "label", "bubble", "box", "other"] },
          text: { type: "string", description: "exact English wording; lines of one sentence/paragraph joined with spaces" },
        },
        required: ["kind", "text"],
      },
    },
  },
  required: ["blocks"],
};
const PAGE_PROMPT = `This is one page of an English children's non-fiction / picture book (a photo or scan of the printed page).
Transcribe ALL English text on the page, complete and in natural reading order (top to bottom, left to right; a heading before its text; a speech bubble where it sits):
titles, headings, every paragraph of body text, captions, labels on pictures and diagrams (each label as its own block), speech and thought bubbles, fact boxes, sidebars, timelines and lists.
Rules:
- Exact original wording, spelling, capitalization and punctuation. Join a paragraph's lines into one block; join words hyphenated at line ends.
- Each distinct piece of text exactly once — never repeat a block (a bubble is not also body text).
- Big display text and fun facts in large type ARE text: keep them as one block even when split over many lines with mixed font sizes (e.g. "The cerebral cortex is only 0.1 in (2.5 mm) thick.").
- Leave out: page numbers, running headers/footers, publisher/ISBN/copyright lines, lone ruler or scale marks that are not part of a sentence, stray single letters, and any Chinese text.
- If a word is partly hidden by a finger or the binding, write the obvious word; never invent text that is not there.
Return JSON only.`;

/** One Gemini vision call: a book page image -> its English text blocks in reading order (no translation). */
export async function extractPageBlocks(bytes: Uint8Array, mime = "image/jpeg") {
  const r = await generateJSON<{ blocks: { kind: string; text: string }[] }>(
    [{ inline_data: { mime_type: mime, data: Buffer.from(bytes).toString("base64") } }, { text: PAGE_PROMPT }],
    PAGE_SCHEMA, { maxOutputTokens: 8192, temperature: 0.1, timeoutMs: 120000 });
  const blocks = (r.data.blocks || []).map((b) => ({ kind: String(b.kind || "body"), text: String(b.text || "").replace(/\s+/g, " ").trim() })).filter((b) => /[A-Za-z]{2}/.test(b.text));
  return { blocks, meta: { model: r.model, ms: r.ms, retries: r.retries, usage: r.usage } as ParseMeta };
}

const POLISH_SCHEMA = {
  type: "object",
  properties: { zh: { type: "array", items: { type: "string" }, description: "one Chinese translation per input item, same order and count" } },
  required: ["zh"],
};
/** One Gemini call: polish / translate sentences of one book (with page context and the previous translation as a hint). */
export async function polishTranslations(bookTitle: string, items: { p: number; kind?: string; en: string; prev?: string | null }[]) {
  const r = await generateJSON<{ zh: string[] }>([{ text: `You are an experienced Chinese translator of English picture books for children aged 3–5 (read aloud by a parent).
Book: "${bookTitle}". Translate each item into Simplified Chinese. Items are in page order; use the neighbouring items as context so the Chinese flows.
"prev" is an earlier draft translation (may be missing, wrong, too literal or cover a whole paragraph) — improve on it freely; do not copy its mistakes.
${ZH_STYLE}
Return exactly one translation per item, same order and count, JSON only.
Items:
${JSON.stringify(items.map((x, i) => ({ i, page: x.p, kind: x.kind || undefined, en: x.en, prev: x.prev || undefined })))}` }],
    POLISH_SCHEMA, { maxOutputTokens: 16384, temperature: 0.3, timeoutMs: 180000 });
  const zh = r.data.zh || [];
  return { zh: items.map((_, i) => (typeof zh[i] === "string" && zh[i].trim() ? zh[i].trim() : null)), meta: { model: r.model, ms: r.ms, retries: r.retries, usage: r.usage } as ParseMeta };
}

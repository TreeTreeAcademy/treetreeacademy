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
      zh: { type: "string", description: "short Simplified Chinese gloss for THIS context with part of speech, e.g. 'n. 海狸', 'v. 游泳'" },
    },
    required: ["form", "lemma", "zh"],
  },
};
const SENT = {
  type: "object",
  properties: { en: { type: "string" }, zh: { type: "string", description: "natural, child-friendly Simplified Chinese translation" } },
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

const COMMON = `You prepare reading material for Chinese children learning English.
Split text into paragraphs and sentences. Translate every sentence into natural, child-friendly Simplified Chinese.
Glossary: list EVERY distinct English word form once (lowercase except "I"), with its dictionary lemma and a short Chinese gloss for its meaning here ("词性. 释义", max ~8 Chinese characters).
Never add words that are not in the source. Return JSON only.`;
const PHOTO = `${COMMON}
Task: read ALL English body text in this image (picture-book page, textbook, worksheet or screenshot) in natural reading order.
Keep the exact original wording, spelling and punctuation; join words hyphenated across line breaks. Skip page numbers, running headers/footers, ISBN/publisher lines and decorative lettering.
If the image contains no English text, set has_english=false and return empty arrays.`;
const AUDIO = `${COMMON}
Task: transcribe the ENGLISH speech in this recording verbatim (a child, parent or teacher reading or talking). Use normal punctuation and capitalization.
Leave out filler sounds (um, uh), background noise and any non-English speech. If there is no intelligible English speech, set has_english=false and return empty arrays.`;

type MediaOut = { has_english: boolean; title?: string; paragraphs: { sentences: { en: string; zh: string }[] }[]; glossary: Gloss[] };
export type ParseMeta = { model: string; ms: number; retries: number; usage?: any };

const INLINE_MAX = Number(process.env.GEMINI_INLINE_MAX_MB || 14) * 1048576; // base64 grows ~33%; request limit is 20 MB

export async function parseMedia(bytes: Uint8Array, mime: string, kind: "photo" | "audio", title: string) {
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
    const paras = (r.data.paragraphs || []).map((p) => (p.sentences || []).filter((s) => s && s.en && s.en.trim()));
    if (!r.data.has_english && !paras.some((p) => p.length)) throw new AIError(422, "no_english", kind === "audio" ? "没有听到清楚的英文，请在安静的地方再录一次。" : "没有识别到英文文字，请拍清楚一点再试。");
    const src = await buildSource(title || (kind === "audio" ? "我的录音" : "我的照片"), kind, [{ paras }], r.data.glossary || []);
    if (!src.sentences.length) throw new AIError(422, "no_english", "没有识别到英文文字。");
    if (!title && r.data.title) src.title = r.data.title.slice(0, 80);
    return { src, meta: { model: r.model, ms: r.ms, retries: r.retries, usage: r.usage } as ParseMeta };
  } finally {
    if (fileName) await deleteFile(fileName);
  }
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

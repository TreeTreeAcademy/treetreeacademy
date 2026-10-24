/* Box-side book refresher: re-read every page picture with Gemini vision, merge with an existing book.json,
 * re-translate everything in 信达雅 style, rebuild tokens/words/IPA. Output is a book.json for `import-book.ts --reuse`.
 *
 *   npx tsx scripts/book-import/refresh-book.ts --base old/book.json --imgdir WORK/img --offset 0 --out DIR
 *        [--stage extract|merge|translate|build|all] [--rate 10] [--batch 45] [--pages 1-72]
 *
 * - extract: one Gemini call per page image (img file = p{n+offset:03}.jpg), checkpoint DIR/pages/pNNN.json.
 * - merge: page blocks -> sentences (dedup), diff vs the old book -> DIR/draft.json, DIR/diff.json.
 * - translate: batched polishing (old translation given as a hint), checkpoint DIR/zh.json; DIR/zh-overrides.json
 *   (hand fixes, {"<page>:<english>": "中文"}) wins over Gemini.
 * - build: DIR/book.json (+ one Gemini call for Chinese glosses of words the old book had no gloss for).
 * Resumable: re-run the same command. Stops cleanly on the daily quota. Env: GEMINI_API_KEY (never printed).
 */
import { promises as fs } from "fs";
import path from "path";
import { extractPageBlocks, polishTranslations } from "@/lib/reader/parse";
import { aiConfigured, AIError, generateJSON } from "@/lib/reader/ai";
import { buildSource, TOK, type Gloss } from "@/lib/reader/text";

const argv = process.argv.slice(2);
const opt = (k: string, d = "") => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const OUT = opt("out"), BASE = opt("base"), IMGDIR = opt("imgdir"), OFFSET = Number(opt("offset", "0"));
const STAGE = opt("stage", "all"), RATE_S = Number(opt("rate", "10")), BATCH = Number(opt("batch", "45"));
const log = (...a: any[]) => console.log(new Date().toTimeString().slice(0, 8), ...a);
const readJSON = async <T,>(p: string, d: T): Promise<T> => { try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return d; } };
const writeJSON = (p: string, v: any) => fs.writeFile(p, JSON.stringify(v, null, 1));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const norm = (s: string) => (s.toLowerCase().replace(/’/g, "'").match(/[a-z0-9]+(?:'[a-z]+)?/g) || []).join(" ");

let lastCall = 0;
const calls = { extract: 0, clean: 0, translate: 0, gloss: 0 };
async function paced<T>(fn: () => Promise<T>, what: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const wait = lastCall + RATE_S * 1000 - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    try { return await fn(); } catch (e) {
      if (e instanceof AIError && e.code === "daily_quota") { log(`⛔ 今日 Gemini 额度用完（${what}）。明天重跑同一命令即可续上。`); await saveCalls(); process.exit(3); }
      if (e instanceof AIError && (e.code === "rate_limited" || e.code === "upstream" || e.code === "bad_output") && attempt < 4) { log(`⏳ ${what}: ${e.code}，60 秒后重试`); await sleep(60000); continue; }
      throw e;
    }
  }
}
async function saveCalls() {
  const p = path.join(OUT, "calls.json"); const c = await readJSON<any>(p, {});
  for (const k of Object.keys(calls) as (keyof typeof calls)[]) { c[k] = (c[k] || 0) + calls[k]; calls[k] = 0; }
  await writeJSON(p, c);
}

const CLEAN_SCHEMA = { type: "object", properties: { pages: { type: "array", items: { type: "object", properties: { n: { type: "integer" },
  blocks: { type: "array", items: { type: "object", properties: { kind: { type: "string" }, text: { type: "string" } }, required: ["kind", "text"] } } }, required: ["n", "blocks"] } } }, required: ["pages"] };
const CLEAN_PROMPT = `Below is English text read (OCR) from pages of a children's book, as blocks in reading order. Tidy it into the text a child would read on each page.
1. REMOVE text that is not part of the reading: library stamps and labels, barcodes, book credits (editors, designers, illustrators, production staff), copyright/ISBN/publisher lines, picture/photo credits, index entries (terms followed by page numbers), "available at special discounts" notices.
2. In a table of contents, remove the page number in front of or after an entry (keep the entry words).
3. If a block starts with a short label or heading glued to the sentence that follows it (e.g. "Wrinkles The outside of the brain is wrinkled..." or "1 Spike starts When enough messages..."), split it into a label block ("Wrinkles" / "Spike starts", dropping a bare step number) and a body block.
4. If one title or heading is split over neighbouring blocks (e.g. "The Brain" + "Book"), merge them into one block.
5. Remove a block that repeats an earlier block on the same page word for word.
6. Otherwise copy the text EXACTLY, letter for letter — never reword, correct, shorten or translate; never add text. Keep the order and the kind of each block (title, heading, body, caption, label, bubble, box, other).
Return every page given (same n), JSON only.
Pages:
`;

/** Chinese end punctuation that matches the English sentence (models sometimes drop it). */
function fixPunct(en: string, zh: string | null): string | null {
  if (!zh) return zh;
  let z = zh.trim().replace(/\s*([，。！？：；])\s*/g, "$1");
  const e = en.trim().replace(/["”’)]+$/, "");
  if (/[。！？…”）)]$/.test(z)) return z;
  if (e.endsWith("!")) return z + "！";
  if (e.endsWith("?")) return z + "？";
  if (e.endsWith(".") && !/^\d+\.$/.test(e)) return z + "。";
  return z;
}

type Item = { en: string; kind: string; para: boolean };
/** Sentence split that keeps one-word labels (splitSentences drops them). */
function sentencesOf(text: string): string[] {
  return text.replace(/\s+/g, " ").split(/(?<!\b(?:Dr|Mr|Mrs|Ms|St|Mt|vs|VS|Vs|e\.g|i\.e|No|C)\.)(?<=[.!?…]["”’)]?)\s+(?=["“‘(]?[A-Z0-9])/).map((s) => s.trim()).filter((s) => (s.match(TOK) || []).length >= 1);
}

async function main() {
  if (!OUT || !BASE) throw new Error("--out and --base are required");
  await fs.mkdir(path.join(OUT, "pages"), { recursive: true });
  const old = JSON.parse(await fs.readFile(BASE, "utf8"));
  const P: number = old.pages.length;
  const [pa, pb] = (opt("pages", `1-${P}`)).split("-").map(Number);
  const stages = STAGE === "all" ? ["extract", "clean", "merge", "translate", "build"] : STAGE.split(",");

  if (stages.includes("extract")) {
    if (!aiConfigured()) throw new Error("GEMINI_API_KEY missing");
    for (let n = pa; n <= (pb || pa); n++) {
      const f = path.join(OUT, "pages", `p${String(n).padStart(3, "0")}.json`);
      if (await readJSON(f, null)) continue;
      const img = path.join(IMGDIR, `p${String(n + OFFSET).padStart(3, "0")}.jpg`);
      const imgBytes = new Uint8Array(await fs.readFile(img));
      const r = await paced(() => extractPageBlocks(imgBytes), `p${n}`);
      calls.extract++;
      await writeJSON(f, { n, img, blocks: r.blocks, meta: r.meta });
      log(`📄 p${n}: ${r.blocks.length} 段 · ${r.meta.model} · ${(r.meta.ms / 1000).toFixed(1)}s`);
      await saveCalls();
    }
  }

  if (stages.includes("clean")) {
    if (!aiConfigured()) throw new Error("GEMINI_API_KEY missing");
    await fs.mkdir(path.join(OUT, "clean"), { recursive: true });
    const CH = Number(opt("clean-batch", "6"));
    for (let n0 = 1; n0 <= P; n0 += CH) {
      const ns = Array.from({ length: Math.min(CH, P - n0 + 1) }, (_, i) => n0 + i);
      const todo: any[] = [];
      for (const n of ns) if (!(await readJSON(path.join(OUT, "clean", `p${String(n).padStart(3, "0")}.json`), null))) todo.push(await readJSON<any>(path.join(OUT, "pages", `p${String(n).padStart(3, "0")}.json`), null));
      if (!todo.length) continue;
      const r = await paced(() => generateJSON<{ pages: { n: number; blocks: { kind: string; text: string }[] }[] }>([{ text: CLEAN_PROMPT + JSON.stringify(todo.map((p) => ({ n: p.n, blocks: p.blocks }))) }],
        CLEAN_SCHEMA, { maxOutputTokens: 32768, temperature: 0, timeoutMs: 180000 }), `清理 p${todo[0].n}-${todo[todo.length - 1].n}`);
      calls.clean++;
      for (const p of todo) {
        const out = (r.data.pages || []).find((x) => Number(x.n) === p.n);
        const src = " " + p.blocks.map((b: any) => norm(b.text)).join(" ") + " ";
        const ok: any[] = [], bad: string[] = [], dropped: string[] = [];
        for (const b of out?.blocks || []) { const t = String(b.text || "").replace(/\s+/g, " ").trim(); if (!t) continue; if (src.includes(" " + norm(t) + " ")) ok.push({ kind: b.kind, text: t }); else bad.push(t); }
        const outN = " " + ok.map((b) => norm(b.text)).join(" ") + " ";
        for (const b of p.blocks) if (!outN.includes(" " + norm(b.text) + " ")) dropped.push(b.text);
        await writeJSON(path.join(OUT, "clean", `p${String(p.n).padStart(3, "0")}.json`), { n: p.n, blocks: out ? ok : p.blocks, rejected: bad, changedOrDropped: dropped });
        if (bad.length) log(`⚠️ p${p.n}: ${bad.length} 段被改了字，没用：${bad.map((x) => x.slice(0, 50)).join(" | ")}`);
      }
      await saveCalls();
      log(`🧹 p${todo[0].n}-${todo[todo.length - 1].n} 清理完 · ${r.model}`);
    }
  }

  if (stages.includes("merge")) {
    const oldBy = new Map<number, any[]>();
    for (const s of old.sentences) { if (!oldBy.has(s.p)) oldBy.set(s.p, []); oldBy.get(s.p)!.push(s); }
    const pages: { n: number; items: Item[] }[] = [];
    const diff: any[] = []; let added = 0, removed = 0;
    for (let n = 1; n <= P; n++) {
      const pg = (await readJSON<any>(path.join(OUT, "clean", `p${String(n).padStart(3, "0")}.json`), null)) || (await readJSON<any>(path.join(OUT, "pages", `p${String(n).padStart(3, "0")}.json`), null));
      if (!pg) throw new Error(`page ${n} not extracted yet`);
      const seen = new Set<string>(); const items: Item[] = [];
      for (const b of pg.blocks) {
        let first = true;
        for (const en of sentencesOf(b.text)) {
          const k = norm(en); if (!k || seen.has(k)) continue; seen.add(k);
          items.push({ en, kind: b.kind, para: first }); first = false;
        }
      }
      const oldS = (oldBy.get(n) || []);
      const oldK = new Set(oldS.map((s) => norm(s.en)));
      const add = items.filter((x) => !oldK.has(norm(x.en))).map((x) => x.en);
      const newK = new Set(items.map((x) => norm(x.en)));
      const rem = [...new Set(oldS.map((s) => s.en))].filter((en) => !newK.has(norm(en)));
      const dups = oldS.length - oldK.size;
      added += add.length; removed += rem.length + dups;
      if (add.length || rem.length || dups) diff.push({ n, added: add, removed: rem, oldDuplicates: dups });
      pages.push({ n, items });
    }
    await writeJSON(path.join(OUT, "draft.json"), { pages });
    await writeJSON(path.join(OUT, "diff.json"), { oldSentences: old.sentences.length, newSentences: pages.reduce((t, p) => t + p.items.length, 0), added, removed, pages: diff });
    log(`🧩 合并：旧 ${old.sentences.length} 句 → 新 ${pages.reduce((t, p) => t + p.items.length, 0)} 句（新增 ${added}，去掉 ${removed}）`);
  }

  const key = (n: number, en: string) => `${n}:${norm(en)}`;
  if (stages.includes("translate")) {
    if (!aiConfigured()) throw new Error("GEMINI_API_KEY missing");
    const { pages } = await readJSON<any>(path.join(OUT, "draft.json"), null as any);
    const zhPath = path.join(OUT, "zh.json"); const zh = await readJSON<Record<string, string>>(zhPath, {});
    // hint: the old per-sentence translation, else the old paragraph translation it belonged to
    const prev = new Map<string, string>();
    for (const s of old.sentences) {
      const h = s.zh && !/^(图中标注|小怪物说|你知道吗)$/.test(s.zh) ? s.zh : s.zhBlock || "";
      if (h && !prev.has(key(s.p, s.en))) prev.set(key(s.p, s.en), h);
    }
    const todo: { p: number; kind: string; en: string; prev: string | null }[] = [];
    for (const pg of pages) for (const it of pg.items) if (!zh[key(pg.n, it.en)]) todo.push({ p: pg.n, kind: it.kind, en: it.en, prev: prev.get(key(pg.n, it.en)) || null });
    log(`🈶 待翻译 ${todo.length} 句`);
    for (let i = 0; i < todo.length;) {
      // batch by whole pages where possible
      let j = Math.min(todo.length, i + BATCH);
      while (j < todo.length && j > i + 1 && todo[j].p === todo[j - 1].p && j - i > BATCH - 15) j--;
      if (j <= i + 1) j = Math.min(todo.length, i + BATCH);
      const chunk = todo.slice(i, j);
      const r = await paced(() => polishTranslations(old.title, chunk), `翻译 p${chunk[0].p}-${chunk[chunk.length - 1].p}`);
      calls.translate++;
      chunk.forEach((x, k) => { if (r.zh[k]) zh[key(x.p, x.en)] = r.zh[k]!; });
      await writeJSON(zhPath, zh); await saveCalls();
      log(`🈶 p${chunk[0].p}-${chunk[chunk.length - 1].p}: ${r.zh.filter(Boolean).length}/${chunk.length} 句 · ${r.meta.model} · ${(r.meta.ms / 1000).toFixed(1)}s`);
      i = j;
    }
  }

  if (stages.includes("build")) {
    const { pages } = await readJSON<any>(path.join(OUT, "draft.json"), null as any);
    const zh = await readJSON<Record<string, string>>(path.join(OUT, "zh.json"), {});
    const over = await readJSON<Record<string, string>>(path.join(OUT, "zh-overrides.json"), {});
    const ov = new Map(Object.entries(over).map(([k, v]) => { const m = k.match(/^(\d+):(.*)$/)!; return [key(Number(m[1]), m[2]), v]; }));
    const glossary: Gloss[] = [];
    for (const w of old.words) for (const f of new Set([w.w, ...(w.forms || [])])) glossary.push({ form: String(f).toLowerCase(), lemma: w.w, zh: w.zh });
    const extra = await readJSON<Gloss[]>(path.join(OUT, "gloss-extra.json"), []);
    const mk = () => buildSource(old.title, "book", pages.map((pg: any) => {
      const paras: { en: string; zh: string | null }[][] = [];
      for (const it of pg.items) { const s = { en: it.en, zh: fixPunct(it.en, ov.get(key(pg.n, it.en)) || zh[key(pg.n, it.en)] || null) }; if (it.para || !paras.length) paras.push([s]); else paras[paras.length - 1].push(s); }
      return { paras };
    }), [...extra, ...glossary]);
    let src: any = await mk();
    const missing = src.words.filter((w: any) => !w.zh);
    if (missing.length && !extra.length && aiConfigured()) {
      const r = await paced(() => generateJSON<{ glossary: Gloss[] }>([{ text: `Give a short Simplified Chinese gloss ("词性. 释义", max ~8 characters, the meaning in this children's book) and the dictionary lemma for each English word. Science terms must be the standard Chinese names (beaver = 河狸). JSON only.\n${JSON.stringify(missing.map((w: any) => ({ word: w.w, forms: w.forms, example: src.sentences[w.ex]?.en })))}` }],
        { type: "object", properties: { glossary: { type: "array", items: { type: "object", properties: { form: { type: "string" }, lemma: { type: "string" }, zh: { type: "string" } }, required: ["form", "lemma", "zh"] } } }, required: ["glossary"] },
        { maxOutputTokens: 8192, temperature: 0.1, timeoutMs: 120000 }), "词表");
      calls.gloss++; await saveCalls();
      const ex2: Gloss[] = [];
      for (const g of r.data.glossary || []) { const w = missing.find((m: any) => m.w === String(g.form).toLowerCase()); if (w) for (const f of w.forms) ex2.push({ form: f, lemma: w.w, zh: g.zh }); }
      await writeJSON(path.join(OUT, "gloss-extra.json"), ex2);
      extra.push(...ex2);
      src = await mk();
      log(`📚 补了 ${ex2.length} 个词形的中文释义`);
    }
    // headings: explicit kind from the page reading (labels / captions stay in the text flow)
    let k = 0;
    for (const pg of pages) for (const it of pg.items) { const s = src.sentences[k++]; if (s && s.en === it.en.replace(/\s+/g, " ").trim()) s.head = it.kind === "title" || it.kind === "heading"; }
    const book = { ...src, id: old.id, title: old.title, titleZh: old.titleZh || "", desc: old.desc || "", cover: old.cover,
      pages: src.pages.map((p: any, i: number) => ({ ...p, img: old.pages[i]?.img || p.img, w: old.pages[i]?.w || p.w, h: old.pages[i]?.h || p.h })) };
    const noZh = book.sentences.filter((s: any) => !s.zh).length;
    await writeJSON(path.join(OUT, "book.json"), book);
    log(`📦 ${OUT}/book.json：${book.pages.length} 页 · ${book.sentences.length} 句（无中文 ${noZh}）· ${book.words.length} 词（无释义 ${book.words.filter((w: any) => !w.zh).length}）`);
  }
  await saveCalls();
  log(`Gemini 调用累计：${JSON.stringify(await readJSON(path.join(OUT, "calls.json"), {}))}`);
}
main().catch((e) => { console.error("❌", e instanceof AIError ? `${e.code}: ${e.message}` : e?.message || e); process.exit(1); });

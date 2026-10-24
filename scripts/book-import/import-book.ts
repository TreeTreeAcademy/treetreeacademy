/* Box-side importer: extracted PDF pages (extract.py) -> Learning Source (same JSON as the app) -> a reader's account.
 *
 *   npx tsx scripts/book-import/import-book.ts --work DIR --user NAME [--title T] [--title-zh 中文] [--id ID]
 *        [--site https://treetreeacademy.com] [--dry-run] [--rate 12] [--ocr-empty auto|yes|no] [--mode auto|text|ocr]
 *        [--reuse book.json [--page-offset auto|N]]
 *
 * - Text layer (Google Drive / Pixel scan OCR) is used when it looks like real English; those pages need only a
 *   batched translation call. Other pages go to Gemini one page per call (OCR + translation + glossary).
 * - Paced to --rate calls/min (free tier ~15 RPM); backs off on 429; stops cleanly on the daily quota.
 * - Resumable: every finished page is checkpointed in DIR/pages/, every uploaded image in DIR/uploaded/. Re-run the
 *   same command to continue.
 * - Upload goes through the site's import API (Bearer READER_IMPORT_TOKEN): page images -> private Vercel Blob when
 *   the site has one connected, else KV (smaller images); then the book JSON -> KV for that reader only.
 * - --reuse: the sentences, Chinese and word list come from an existing hand-checked book.json (same format); the PDF
 *   supplies the page pictures (page n of the book = PDF page n+offset; offset auto = PDF pages - book pages) and its
 *   English text layer, when there is one, is compared with the reused English. No Gemini calls.
 * Env: GEMINI_API_KEY (never printed), READER_IMPORT_TOKEN (or file $READER_IMPORT_TOKEN_FILE). Never commit DIR.
 */
import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { translateSentences, readMedia } from "@/lib/reader/parse";
import { aiConfigured, AIError } from "@/lib/reader/ai";
import { buildSource, loadCmu, splitSentences, TOK, type Gloss } from "@/lib/reader/text";

type Sent = { en: string; zh?: string | null };
type PageRes = { n: number; mode: "text" | "ocr" | "empty" | "none"; paras: Sent[][]; glossary: Gloss[]; note?: string; calls?: number; ms?: number; tin?: number; tout?: number; model?: string };
type ManPage = { n: number; img: string; w: number; h: number; bytes: number; blocks: { t: string; bbox: number[] }[]; store?: string; sw?: number; sh?: number; sbytes?: number };

const argv = process.argv.slice(2);
const opt = (k: string, d = "") => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const flag = (k: string) => argv.includes("--" + k);
const WORK = opt("work");
const USER = opt("user").toLowerCase();
const SITE = opt("site", process.env.READER_SITE || "https://treetreeacademy.com").replace(/\/$/, "");
const DRY = flag("dry-run");
const RATE = Math.max(1, Number(opt("rate", "12")));
const MODE = opt("mode", "auto");
const OCR_EMPTY = opt("ocr-empty", "auto");
const MAX_BATCH = Number(opt("batch", "60")); // sentences per translation call
const log = (...a: any[]) => console.log(...a);
// KV mode: refuse to push page images if the store would go past this (Upstash free tier is 256 MB; leave headroom)
const KV_BUDGET = Number(opt("kv-budget-mb", "150")) * 1048576;
let KV_USED: number | null = null;
function kvRoom(imgBytes: number) {
  if (KV_USED == null) return;
  const after = KV_USED + imgBytes * 1.37; // base64 in JSON
  if (after > KV_BUDGET) throw new Stop(7, `KV 空间不够放这本书的图片：现在 ${(KV_USED / 1048576).toFixed(0)} MB，导入后约 ${(after / 1048576).toFixed(0)} MB，超过预算 ${(KV_BUDGET / 1048576).toFixed(0)} MB。请先开通 Vercel Blob（私有）。`);
  log(`🗄️  KV 预计导入后 ${(after / 1048576).toFixed(0)} MB（预算 ${(KV_BUDGET / 1048576).toFixed(0)} MB）`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function importToken() {
  if (process.env.READER_IMPORT_TOKEN) return process.env.READER_IMPORT_TOKEN;
  const f = process.env.READER_IMPORT_TOKEN_FILE || "/workspace/.secrets/READER_IMPORT_TOKEN";
  try { return (await fs.readFile(f, "utf8")).trim(); } catch { return ""; }
}
async function api(method: string, p: string, body?: BodyInit, type?: string) {
  const tok = await importToken();
  for (let a = 0; ; a++) {
    try {
      const r = await fetch(`${SITE}/api/reader-import${p}`, { method, body, headers: { Authorization: `Bearer ${tok}`, ...(type ? { "Content-Type": type } : {}) } });
      if (r.status >= 500 && a < 4) { await sleep(2000 * 2 ** a); continue; }
      const text = await r.text();
      let j: any = null; try { j = JSON.parse(text); } catch { /* not json */ }
      return { status: r.status, ok: r.ok, j, text };
    } catch (e) {
      if (a >= 4) throw e;
      await sleep(2000 * 2 ** a);
    }
  }
}

/* ---------- text-layer quality ---------- */
let CMU: Record<string, string>;
const known = (w: string) => {
  const x = w.toLowerCase().replace(/’/g, "'");
  if (CMU[x]) return true;
  for (const [re, rep] of [[/'s$/, ""], [/s$/, ""], [/es$/, ""], [/ed$/, ""], [/ing$/, ""], [/ies$/, "y"]] as [RegExp, string][]) if (re.test(x) && CMU[x.replace(re, rep)]) return true;
  return false;
};
function quality(t: string) {
  const toks = (t.match(TOK) || []).filter((w) => w.length > 1 || /^[aI]$/.test(w));
  const ok = toks.filter(known).length;
  return { words: toks.length, ratio: toks.length ? ok / toks.length : 0 };
}
/** Usable body text from the PDF text layer, or null when it looks like OCR garbage / is absent. */
function textLayer(p: ManPage): { paras: string[][]; words: number; ratio: number } | null {
  const good: string[] = [];
  let words = 0, ok = 0;
  for (const b of p.blocks) {
    const t = b.t.replace(/\s+/g, " ").trim();
    if (/^[\d\s.\-–—|•·]+$/.test(t)) continue; // page numbers / rules
    const q = quality(t);
    if (!q.words || q.ratio < 0.6) continue; // garbage from illustrations
    good.push(t); words += q.words; ok += q.ratio * q.words;
  }
  const ratio = words ? ok / words : 0;
  if (words < 3 || ratio < 0.8) return null;
  const paras = good.map((t) => {
    const s = splitSentences(t);
    return s.length ? s : (t.length <= 100 && (t.match(TOK) || []).length >= 1 ? [t] : []); // keep short headings
  }).filter((x) => x.length);
  return paras.length ? { paras, words, ratio } : null;
}

/* ---------- Gemini with pacing ---------- */
let lastCall = 0, calls = 0, aiMs = 0;
async function pace() {
  const gap = 60000 / RATE, wait = lastCall + gap - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
}
class Stop extends Error { constructor(public code: number, msg: string) { super(msg); } }
async function withAI<T>(what: string, fn: () => Promise<T>): Promise<T> {
  for (let a = 0; ; a++) {
    await pace();
    try { calls++; const t0 = Date.now(); const r = await fn(); aiMs += Date.now() - t0; return r; }
    catch (e: any) {
      if (e instanceof AIError) {
        if (e.code === "daily_quota") throw new Stop(3, `今天的 Gemini 免费额度用完了（${what}）。明天重新运行同一个命令即可从断点继续。`);
        if (e.code === "bad_key" || e.code === "ai_not_configured") throw new Stop(2, `Gemini 密钥不可用：${e.zh}`);
        if (["no_english", "safety", "too_long"].includes(e.code)) throw e;
        if (a < 5) { const w = e.code === "rate_limited" ? 30000 * (a + 1) : 5000 * (a + 1); log(`   ⏳ ${what}: ${e.code}，${w / 1000}s 后重试`); await sleep(w); continue; }
        throw new Stop(4, `${what} 多次失败：${e.code} ${e.zh}。重新运行即可继续。`);
      }
      if (a < 3) { await sleep(5000 * (a + 1)); continue; }
      throw e;
    }
  }
}

async function readJSON<T>(f: string): Promise<T | null> { try { return JSON.parse(await fs.readFile(f, "utf8")); } catch { return null; } }
const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "book";

async function main() {
  if (!WORK) throw new Stop(1, "缺少 --work 目录");
  if (!USER && !DRY) throw new Stop(1, "缺少 --user（导入到哪个读者账号）");
  const man = await readJSON<Man>(path.join(WORK, "manifest.json"));
  if (!man) throw new Stop(1, `${WORK}/manifest.json 不存在，先运行 extract.py`);
  CMU = await loadCmu();
  const title = opt("title") || man.title || path.basename(man.file, path.extname(man.file));
  // partial imports (--pages) get their own id so they never overwrite the whole book
  const partial = man.pages.length < man.pageCount ? `-p${man.pages[0].n}-${man.pages[man.pages.length - 1].n}` : "";
  const id = opt("id") || `${slug(title)}-${man.sha256.slice(0, 6)}${partial}`;

  // 0) handshake before spending any Gemini quota
  let imgMode: "blob" | "kv" = "blob";
  if (!DRY) {
    const h = await api("GET", "");
    if (h.status === 404 && !h.j?.ok) throw new Stop(5, `导入接口不可用（${SITE}）：网站还没部署导入功能，或 READER_IMPORT_TOKEN 不对。`);
    if (!h.ok) throw new Stop(5, `导入接口出错：HTTP ${h.status}`);
    imgMode = h.j.images;
    if (h.j.kv) log(`🗄️  KV：${h.j.kv.keys ?? "?"} 个键 · 已用 ${h.j.kv.usedBytes != null ? (h.j.kv.usedBytes / 1048576).toFixed(1) + " MB" : "未知"}`);
    KV_USED = h.j.kv?.usedBytes ?? null;
    const u = await api("GET", `/${encodeURIComponent(USER)}`);
    if (!u.ok) throw new Stop(5, `网站上没有读者账号「${USER}」。`);
    log(`🌳 目标：${SITE} · 读者 ${USER} · 图片存储 ${imgMode === "blob" ? "Vercel Blob（私有）" : "KV（未开通 Blob，图片会压缩得更小）"} · 已有 ${u.j.length} 本`);
  }
  log(`📘 《${title}》 id=${id} · ${man.pages.length} 页`);
  if (opt("reuse")) return reuseImport(man, title, id, imgMode);

  // 1) decide per page
  const pdir = path.join(WORK, "pages");
  await fs.mkdir(pdir, { recursive: true });
  const tl = man.pages.map((p) => (MODE === "ocr" ? null : textLayer(p)));
  const coverage = man.pages.filter((p) => p.blocks.some((b) => b.t.length > 3)).length / man.pages.length;
  const ocrEmpty = OCR_EMPTY === "yes" || (OCR_EMPTY === "auto" && coverage < 0.5);
  log(`🔎 文字层：${tl.filter(Boolean).length}/${man.pages.length} 页可直接使用（有文字层的页 ${(coverage * 100).toFixed(0)}%）${ocrEmpty ? "" : " · 没有文字层的页视为无正文"}`);

  const done = new Map<number, PageRes>();
  for (const p of man.pages) { const r = await readJSON<PageRes>(path.join(pdir, `p${String(p.n).padStart(3, "0")}.json`)); if (r) done.set(p.n, r); }
  if (done.size) log(`↩️  从断点继续：已完成 ${done.size}/${man.pages.length} 页`);
  const save = (r: PageRes) => { done.set(r.n, r); return fs.writeFile(path.join(pdir, `p${String(r.n).padStart(3, "0")}.json`), JSON.stringify(r)); };
  const t0 = Date.now();
  const bar = () => { const n = done.size, N = man.pages.length, w = 30; return `[${"█".repeat(Math.round((n / N) * w)).padEnd(w, "░")}] ${n}/${N}`; };

  // 1a) text-layer pages: batched translation
  const textPages = man.pages.filter((p, i) => tl[i] && !done.has(p.n) && MODE !== "ocr");
  let batch: { n: number; paras: string[][] }[] = [], bsize = 0;
  const flush = async () => {
    if (!batch.length) return;
    const flat = batch.flatMap((b) => b.paras.flat());
    let zh: (string | null)[] = flat.map(() => null), glossary: Gloss[] = [], meta: any = {};
    if (aiConfigured()) {
      const r = await withAI(`翻译第 ${batch[0].n}-${batch[batch.length - 1].n} 页`, () => translateSentences(flat));
      zh = r.zh; glossary = r.glossary; meta = r.meta;
    }
    let i = 0;
    for (const b of batch) {
      await save({ n: b.n, mode: "text", paras: b.paras.map((ss) => ss.map((en) => ({ en, zh: zh[i++] }))), glossary: b === batch[0] ? glossary : [],
        calls: b === batch[0] ? 1 : 0, ms: b === batch[0] ? meta.ms : 0, tin: b === batch[0] ? meta.usage?.promptTokenCount : 0, tout: b === batch[0] ? meta.usage?.candidatesTokenCount : 0, model: meta.model });
    }
    log(`  ${bar()} 文字层 第 ${batch[0].n}-${batch[batch.length - 1].n} 页：${flat.length} 句${meta.ms ? ` · ${(meta.ms / 1000).toFixed(1)}s` : ""}`);
    batch = []; bsize = 0;
  };
  for (const p of textPages) {
    const t = tl[man.pages.indexOf(p)]!;
    const k = t.paras.flat().length;
    if (bsize && bsize + k > MAX_BATCH) await flush();
    batch.push({ n: p.n, paras: t.paras }); bsize += k;
  }
  await flush();

  // 1b) remaining pages: Gemini OCR one page per call
  for (const [i, p] of man.pages.entries()) {
    if (done.has(p.n)) continue;
    const hasLayer = p.blocks.some((b) => b.t.length > 3);
    if (MODE === "text" || (!ocrEmpty && !hasLayer && MODE !== "ocr")) { await save({ n: p.n, mode: "empty", paras: [], glossary: [] }); continue; }
    if (!aiConfigured()) throw new Stop(2, "这本书有页面需要 AI 识别，但没有 GEMINI_API_KEY。");
    const bytes = new Uint8Array(await fs.readFile(path.join(WORK, p.img)));
    const s0 = Date.now();
    try {
      const r = await withAI(`识别第 ${p.n} 页`, () => readMedia(bytes, "image/jpeg", "photo"));
      await save({ n: p.n, mode: r.hasEnglish ? "ocr" : "none", paras: r.paras, glossary: r.glossary, calls: 1, ms: r.meta.ms, tin: r.meta.usage?.promptTokenCount, tout: r.meta.usage?.candidatesTokenCount, model: r.meta.model });
      log(`  ${bar()} 第 ${p.n} 页 AI 识别：${r.paras.flat().length} 句 · ${((Date.now() - s0) / 1000).toFixed(1)}s · ${r.meta.model}`);
    } catch (e: any) {
      if (e instanceof AIError) { await save({ n: p.n, mode: "none", paras: [], glossary: [], note: e.code, calls: 1 }); log(`  ${bar()} 第 ${p.n} 页：${e.zh}`); continue; }
      throw e;
    }
    void i;
  }

  // 2) assemble (same builder as the app)
  const res = man.pages.map((p) => done.get(p.n)!);
  const gl = new Map<string, Gloss>();
  for (const r of res) for (const g of r.glossary || []) { const k = String(g.form || "").toLowerCase(); if (k && !gl.has(k)) gl.set(k, g); }
  let titleZh = opt("title-zh");
  if (!titleZh && aiConfigured() && !(await readJSON(path.join(WORK, "title.json")))) {
    try { const r = await withAI("翻译书名", () => translateSentences([title])); titleZh = r.zh[0] || ""; await fs.writeFile(path.join(WORK, "title.json"), JSON.stringify({ titleZh })); } catch { /* optional */ }
  } else if (!titleZh) titleZh = (await readJSON<{ titleZh: string }>(path.join(WORK, "title.json")))?.titleZh || "";
  const useStore = imgMode === "kv" && man.pages.every((p) => p.store);
  const src: any = await buildSource(title, "book", man.pages.map((p, i) => ({ paras: res[i].paras, img: null, w: useStore ? p.sw : p.w, h: useStore ? p.sh : p.h })), [...gl.values()]);
  src.id = id; src.titleZh = titleZh; src.source = man.file;
  const bookJson = JSON.stringify(src);
  await fs.writeFile(path.join(WORK, "book.json"), bookJson);

  const stats = {
    id, title, titleZh, pages: res.length, sentences: src.sentences.length, words: src.words.length,
    modes: res.reduce((m: any, r) => ((m[r.mode] = (m[r.mode] || 0) + 1), m), {}),
    geminiCallsTotal: res.reduce((t, r) => t + (r.calls || 0), 0), geminiCallsThisRun: calls,
    avgOcrSec: (() => { const o = res.filter((r) => r.mode === "ocr" || r.mode === "none").filter((r) => r.ms); return o.length ? +(o.reduce((t, r) => t + r.ms!, 0) / o.length / 1000).toFixed(1) : null; })(),
    tokensIn: res.reduce((t, r) => t + (r.tin || 0), 0), tokensOut: res.reduce((t, r) => t + (r.tout || 0), 0),
    runSec: Math.round((Date.now() - t0) / 1000), bookJsonBytes: bookJson.length,
    imgBytes: man.pages.reduce((t, p) => t + (useStore ? p.sbytes! : p.bytes), 0), imgStore: DRY ? "dry-run" : imgMode,
  };
  await fs.writeFile(path.join(WORK, "report.json"), JSON.stringify(stats, null, 1));
  log(`📦 组装完成：${stats.sentences} 句 · ${stats.words} 词 · book.json ${(stats.bookJsonBytes / 1024).toFixed(0)} KB · 图片 ${(stats.imgBytes / 1048576).toFixed(1)} MB`);
  if (DRY) { log(`🧪 --dry-run：没有上传。结果在 ${WORK}/book.json`); return; }

  if (imgMode === "kv") kvRoom(stats.imgBytes);
  await upload(man, id, title, titleZh, src, imgMode, useStore, (p) => p.n);
}

async function upload(man: Man, id: string, title: string, titleZh: string, src: any, imgMode: "blob" | "kv", useStore: boolean,
  target: (p: ManPage) => number | null) {
  // 3) upload images (resumable), then the book
  const udir = path.join(WORK, "uploaded", createHash("sha1").update(`${SITE}|${USER}|${id}|${imgMode}`).digest("hex").slice(0, 10));
  await fs.mkdir(udir, { recursive: true });
  let up = 0, upBytes = 0;
  const queue = man.pages.filter((p) => target(p) != null);
  const N = queue.length;
  const worker = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      const n = target(p)!;
      const mark = path.join(udir, `p${n}`);
      const file = path.join(WORK, useStore ? p.store! : p.img);
      const bytes = await fs.readFile(file);
      if (await fs.stat(mark).catch(() => null)) { up++; upBytes += bytes.length; continue; }
      const r = await api("PUT", `/${encodeURIComponent(USER)}/${id}/img/${n}`, new Uint8Array(bytes), "image/jpeg");
      if (!r.ok) throw new Stop(6, `上传第 ${n} 页图片失败：HTTP ${r.status} ${r.j?.detail || r.j?.error || ""}`);
      await fs.writeFile(mark, r.j.store || "");
      up++; upBytes += bytes.length;
      if (up % 10 === 0 || up === N) log(`  ⬆️  图片 ${up}/${N}`);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  const r = await api("PUT", `/${encodeURIComponent(USER)}/${id}`, JSON.stringify({ source: src, imgStore: imgMode, imgBytes: upBytes }), "application/json");
  if (!r.ok) throw new Stop(6, `保存书本失败：HTTP ${r.status} ${r.j?.error || ""}`);
  log(`✅ 已导入到 ${USER} 的账号：《${title}》${titleZh ? ` ${titleZh}` : ""} · ${r.j.pages} 页 · ${r.j.images} 张图 · 登录后在「学习来源」里能看到。`);
}

type Man = { file: string; sha256: string; pageCount: number; title: string; cropArt?: boolean; pages: ManPage[] };

/** --reuse: hand-checked book.json supplies text + Chinese + words; the PDF supplies pictures (and a text-layer check). */
async function reuseImport(man: Man, title: string, id: string, imgMode: "blob" | "kv") {
  const t0 = Date.now();
  const ru = await readJSON<any>(opt("reuse"));
  if (!ru || !Array.isArray(ru.pages) || !Array.isArray(ru.sentences) || !Array.isArray(ru.words)) throw new Stop(1, `--reuse 文件不是书本 JSON：${opt("reuse")}`);
  const oo = opt("page-offset", "auto");
  const offset = oo === "auto" ? man.pageCount - ru.pages.length : Number(oo);
  if (!(offset >= 0)) throw new Stop(1, `PDF 只有 ${man.pageCount} 页，比 book.json 的 ${ru.pages.length} 页少，对不上。`);
  const byN = new Map(man.pages.map((p) => [p.n, p]));
  const missing = ru.pages.filter((rp: any) => !byN.has(Number(rp.n) + offset)).map((rp: any) => rp.n);
  if (missing.length) throw new Stop(1, `PDF 里缺少这些页（偏移 ${offset}）：${missing.slice(0, 10).join(", ")}`);
  log(`♻️  复用已校对的 ${opt("reuse")}：${ru.sentences.length} 句 · ${ru.words.length} 词 · 书第 n 页 = PDF 第 n+${offset} 页${offset ? `（PDF 前 ${offset} 页不导入）` : ""}${man.cropArt ? " · 只保留英文原页（去掉中文栏）" : ""}`);
  const useStore = imgMode === "kv" && man.pages.every((p) => p.store);

  // English text layer vs reused English (the Chinese strip is outside the art crop / not English anyway)
  const norm = (x: string) => (x.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []);
  let checked = 0, hit = 0, tot = 0, noLayer = 0;
  const bySent = new Map(ru.sentences.map((s: any) => [s.id, s]));
  for (const rp of ru.pages) {
    const mp = byN.get(Number(rp.n) + offset)!;
    const t = textLayer(mp);
    const want = (rp.s || []).flatMap((sid: any) => norm(String((bySent.get(sid) as any)?.en || "")));
    if (!want.length) continue;
    if (!t) { noLayer++; continue; }
    const have = new Set(t.paras.flat().flatMap(norm));
    checked++; tot += want.length; hit += want.filter((w: string) => have.has(w)).length;
  }
  const match = tot ? +(hit / tot * 100).toFixed(1) : null;
  log(`🔎 英文核对：${checked} 页有英文文字层，复用英文的词 ${match ?? "-"}% 能在文字层里找到；${noLayer} 页英文只在图片里（沿用已校对文本，不调用 Gemini）`);

  const src: any = {
    id, title: opt("title") || ru.title || title, titleZh: opt("title-zh") || ru.titleZh || "", desc: ru.desc || "", kind: "book",
    createdAt: Date.now(), source: man.file,
    pages: ru.pages.map((rp: any) => { const mp = byN.get(Number(rp.n) + offset)!; return { n: Number(rp.n), img: null, w: useStore ? mp.sw : mp.w, h: useStore ? mp.sh : mp.h, s: rp.s || [] }; }),
    sentences: ru.sentences, words: ru.words,
  };
  const bookJson = JSON.stringify(src);
  await fs.writeFile(path.join(WORK, "book.json"), bookJson);
  const tmap = new Map<number, number>(ru.pages.map((rp: any) => [Number(rp.n) + offset, Number(rp.n)]));
  const imgBytes = man.pages.filter((p) => tmap.has(p.n)).reduce((t, p) => t + (useStore ? p.sbytes! : p.bytes), 0);
  const stats = { id, title: src.title, titleZh: src.titleZh, mode: "reuse", offset, pages: src.pages.length, sentences: src.sentences.length, words: src.words.length,
    textLayerPages: checked, textLayerMatchPct: match, artOnlyPages: noLayer, geminiCallsThisRun: 0, bookJsonBytes: bookJson.length, imgBytes, imgStore: DRY ? "dry-run" : imgMode,
    runSec: Math.round((Date.now() - t0) / 1000) };
  await fs.writeFile(path.join(WORK, "report.json"), JSON.stringify(stats, null, 1));
  log(`📦 组装完成：${stats.sentences} 句 · ${stats.words} 词 · book.json ${(bookJson.length / 1024).toFixed(0)} KB · 图片 ${(imgBytes / 1048576).toFixed(1)} MB（${useStore ? "KV 压缩版" : "原图版"}）`);
  if (DRY) { log(`🧪 --dry-run：没有上传。结果在 ${WORK}/book.json`); return; }
  if (imgMode === "kv") kvRoom(imgBytes);
  await upload(man, id, src.title, src.titleZh, src, imgMode, useStore, (p) => tmap.get(p.n) ?? null);
}

main().catch((e) => {
  if (e instanceof Stop) { console.error(`⛔ ${e.message}`); process.exit(e.code); }
  console.error("⛔ 出错了：", e?.message || e); process.exit(1);
});

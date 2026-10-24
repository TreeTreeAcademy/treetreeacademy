// Sentence / word helpers + Learning Source builder (same JSON shape as reader-worker/worker.py).
// US IPA comes from the CMU Pronouncing Dictionary (npm cmu-pronouncing-dictionary, ISC).
export const TOK = /[A-Za-z]+(?:['’][A-Za-z]+)?/g;
const IRR: Record<string, string> = {
  does: "do", did: "do", done: "do", was: "be", were: "be", is: "be", are: "be", am: "be", been: "be", has: "have", had: "have",
  teeth: "tooth", feet: "foot", children: "child", people: "people", lives: "life", leaves: "leaf", mice: "mouse", went: "go",
};

let CMU: Record<string, string> | null = null;
export async function loadCmu() {
  if (!CMU) CMU = (await import("cmu-pronouncing-dictionary")).dictionary as Record<string, string>;
  return CMU;
}
const A: Record<string, string> = {
  AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", AW: "aʊ", AY: "aɪ", EH: "ɛ", ER: "ɝ", EY: "eɪ", IH: "ɪ", IY: "i", OW: "oʊ", OY: "ɔɪ", UH: "ʊ", UW: "u",
  B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ", K: "k", L: "l", M: "m", N: "n", NG: "ŋ", P: "p", R: "r", S: "s",
  SH: "ʃ", T: "t", TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ",
};
const V = new Set("AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW".split(" "));
const CLUSTERS = new Set("st sp sk pl pr tr kr kl bl br dr fl fr ɡl ɡr θr str pj kj bj fj mj hj vj kw tw sw sl sm sn dw ɡw".split(" "));
/** US IPA like /ˈbiːvɚ/ (port of us_ipa.py); "" if unknown. Call loadCmu() first. */
export function usIpa(word: string): string {
  const p = CMU?.[word.toLowerCase()];
  if (!p) return "";
  const ph = p.split(" ");
  const toks = ph.map((x) => {
    const b = x.replace(/\d/g, ""), s = /\d$/.test(x) ? x.slice(-1) : null;
    const sym = b === "AH" && s === "0" ? "ə" : b === "ER" && s === "0" ? "ɚ" : A[b] || "";
    return { sym, v: V.has(b), s };
  });
  const nv = toks.filter((t) => t.v).length;
  const res: string[] = [];
  toks.forEach((t, i) => {
    if (t.v && nv > 1 && (t.s === "1" || t.s === "2")) {
      let j = res.length;
      if (j > 0 && !toks[i - 1].v) {
        j -= 1;
        if (j > 0 && i >= 2 && !toks[i - 2].v && CLUSTERS.has(toks[i - 2].sym + toks[i - 1].sym)) j -= 1;
      }
      res.splice(j, 0, t.s === "1" ? "ˈ" : "ˌ");
    }
    res.push(t.sym);
  });
  return "/" + res.join("") + "/";
}

/** Fallback lemma when the model gave none: irregulars + simple suffix rules checked against CMUdict. */
export function lemma(w: string): string {
  let x = w.toLowerCase().replace(/’/g, "'");
  if (x === "i") return "I";
  if (IRR[x]) return IRR[x];
  if (x.endsWith("'s")) x = x.slice(0, -2);
  const has = (s: string) => s.length > 1 && !!CMU?.[s];
  const tries: [RegExp, string][] = [[/ies$/, "y"], [/ves$/, "f"], [/es$/, ""], [/s$/, ""], [/ied$/, "y"], [/ed$/, ""], [/ed$/, "e"], [/ing$/, ""], [/ing$/, "e"]];
  if (x.length > 3 && !/ss$/.test(x)) for (const [re, rep] of tries) {
    if (re.test(x)) { const c = x.replace(re, rep); if (has(c)) return c; }
  }
  // doubled consonant: swimming -> swim, stopped -> stop
  const m = /^(.*?)([b-df-hj-np-tv-z])\2(ing|ed)$/.exec(x);
  if (m && has(m[1] + m[2])) return m[1] + m[2];
  return x;
}

export function splitSentences(text: string): string[] {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?]["”’]?)\s+(?=["“‘]?[A-Z])/).map((s) => s.trim()).filter((s) => (s.match(TOK) || []).length >= 2);
}
export const splitParas = (t: string) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

export type Gloss = { form: string; lemma?: string; zh?: string };
export type PageIn = { paras: { en: string; zh?: string | null }[][]; img?: string | null; w?: number; h?: number };

const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Build the Learning Source JSON consumed by public/reader/app.js. */
export async function buildSource(title: string, kind: string, pages: PageIn[], glossary: Gloss[] = []) {
  await loadCmu();
  const g = new Map<string, Gloss>();
  for (const x of glossary) if (x && x.form) g.set(clean(x.form).toLowerCase().replace(/’/g, "'"), x);
  const zhOf = (lm: string) => clean(g.get(lm.toLowerCase())?.zh).slice(0, 40);
  const sents: any[] = [], words = new Map<string, any>(), outPages: any[] = [];
  pages.forEach((pg, pi) => {
    const ids: number[] = [];
    for (const para of pg.paras) {
      para.forEach((s, k) => {
        const en = clean(s.en);
        if ((en.match(TOK) || []).length < 1) return;
        const sid = sents.length, toks: [number, number, string][] = [];
        for (const m of en.matchAll(TOK)) {
          const t = m[0];
          if (t.length === 1 && !/^[ai]$/i.test(t)) continue;
          const form = t.toLowerCase().replace(/’/g, "'");
          const gl = g.get(form);
          let lm = clean(gl?.lemma).toLowerCase();
          if (!/^[a-z][a-z'\-]*$/.test(lm) || lm.split(" ").length > 1) lm = lemma(t);
          if (form === "i") lm = "I";
          toks.push([m.index!, m.index! + t.length, lm]);
          let W = words.get(lm);
          if (!W) {
            W = { w: lm, zh: zhOf(lm) || clean(gl?.zh).slice(0, 40), ph: "", freq: 0, pages: [], ex: sid, forms: [], us: usIpa(lm) };
            words.set(lm, W);
          }
          W.freq++;
          if (!W.pages.includes(pi + 1)) W.pages.push(pi + 1);
          if (!W.forms.includes(form)) W.forms.push(form);
        }
        sents.push({ id: sid, p: pi + 1, en, zh: s.zh ? clean(s.zh) : null, para: k === 0, t: toks });
        ids.push(sid);
      });
    }
    outPages.push({ n: pi + 1, img: pg.img || null, w: pg.w || 0, h: pg.h || 0, s: ids });
  });
  return {
    id: "s" + Date.now().toString(16), title, kind, createdAt: Date.now(),
    pages: outPages, sentences: sents,
    words: [...words.values()].sort((a, b) => b.freq - a.freq || a.w.localeCompare(b.w)),
  };
}

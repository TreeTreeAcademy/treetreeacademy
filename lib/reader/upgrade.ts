// Daily Gemini "upgrade" pass: spend the free Gemini TTS quota on the clips most likely to be heard next
// (words in learners' queues, their example sentences, their cached dialogues). Kokoro stays the full backfill.
import { kvExists, kvGet } from "@/lib/reader/store";
import { listUsers } from "@/lib/reader/users";
import { generateTts, generateTtsBatch, normText, ttsKey, TtsQuota } from "@/lib/reader/tts";
import { kkNorm } from "@/lib/reader/kokoro";

type It = { t: string; v: string };
const ORDER: Record<string, number> = { learning: 0, queued: 1, learned: 2, review: 2 };

export async function upgradeList(): Promise<It[]> {
  const words: { w: string; o: number; en?: string }[] = [], lines: It[] = [];
  for (const u of listUsers()) {
    let s: any; try { s = JSON.parse((await kvGet(`reader:progress:${u}`)) || "null"); } catch { s = null; }
    if (!s) continue;
    for (const [w, r] of Object.entries<any>(s.words || {})) if (r && r.st !== "mastered") words.push({ w, o: ORDER[r.st] ?? 3, en: r.en });
    for (const t of Object.values<any>(s.tk2 || {})) {
      if (t?.a?.en) lines.push({ t: t.a.en, v: "a" });
      if (t?.ok?.en) lines.push({ t: t.ok.en, v: "b" });
      for (const x of t?.wrong || []) if (x?.en) lines.push({ t: x.en, v: "b" });
    }
  }
  words.sort((a, b) => a.o - b.o);
  const out: It[] = [], seen = new Set<string>();
  const push = (t: string, v: string) => { const n = /\s/.test(t) ? normText(t) : kkNorm(t); const k = v + "\n" + n; if (n && /[a-z]/i.test(n) && !seen.has(k)) { seen.add(k); out.push({ t: n, v }); } };
  words.forEach((x) => push(x.w, "n"));
  lines.forEach((x) => push(x.t, x.v));
  words.forEach((x) => x.en && push(x.en, "n"));
  const have = await kvExists(out.map((x) => ttsKey(x.t, x.v)));
  return out.filter((_, i) => !have[i]);
}

export async function runUpgrade(budgetMs = 45000, maxReq = 6) {
  const t0 = Date.now(), todo = await upgradeList();
  let req = 0, done = 0, quota = false;
  const words = todo.filter((x) => x.v === "n" && !/\s/.test(x.t)).map((x) => x.t), rest = todo.filter((x) => !(x.v === "n" && !/\s/.test(x.t)));
  try {
    for (let i = 0; i < words.length && req < maxReq && Date.now() - t0 < budgetMs; i += 12) {
      req++;
      try { done += (await generateTtsBatch(words.slice(i, i + 12), "n")).done.length; } catch (e) { if (e instanceof TtsQuota) throw e; }
    }
    for (const x of rest) {
      if (req >= maxReq || Date.now() - t0 > budgetMs) break;
      req++;
      try { await generateTts(x.t, x.v); done++; } catch (e) { if (e instanceof TtsQuota) throw e; }
    }
  } catch (e) { if (e instanceof TtsQuota) quota = true; else throw e; }
  return { pending: todo.length, requests: req, done, quota };
}

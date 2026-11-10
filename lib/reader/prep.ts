// Right after a book is uploaded: queue every clip for the box (Kokoro) and pre-build the 复习区 dialogues,
// so nothing waits for first use.
import { bookItems, recordWant } from "./kokoro";
import { cachedTalk, generateTalk, talkId } from "./talk";
import { kvGet, kvKeys, kvMGet } from "./store";
import { ensureRoots } from "./roots";

export async function queueBookVoice(src: any) {
  const items = bookItems(src);
  for (let i = 0; i < items.length; i += 50) await Promise.all(items.slice(i, i + 50).map((x) => recordWant(x.t, x.v)));
  return items.length;
}
function bookWords(src: any): { w: string; zh: string }[] {
  return (src?.words || []).map((x: any) => ({ w: String(x?.w || "").trim(), zh: String(x?.zh || x?.cn || "").slice(0, 40) })).filter((x: any) => /^[A-Za-z][A-Za-z'’-]*$/.test(x.w));
}
/** one-word dialogues (the client plays single-word groups) for words that have none yet */
export async function prepTalks(words: { w: string; zh: string }[], budgetMs = 40000, maxCalls = 4) {
  const t0 = Date.now(); let calls = 0, made = 0;
  const uniq = [...new Map(words.map((x) => [x.w.toLowerCase(), x])).values()];
  const have = await cachedTalk(uniq.map((x) => talkId([x.w])));
  const need = uniq.filter((x) => !have[talkId([x.w])]);
  for (let i = 0; i < need.length && calls < maxCalls && Date.now() - t0 < budgetMs; i += 8, calls++) {
    try { made += Object.keys((await generateTalk(need.slice(i, i + 8).map((x) => ({ id: talkId([x.w]), words: [x.w], hint: x.zh })))).talks).length; } catch { break; }
  }
  return { words: uniq.length, had: uniq.length - need.length, made, left: Math.max(0, need.length - made) };
}
export async function prepBook(src: any) {
  const queued = await queueBookVoice(src).catch(() => 0);
  const talks = await prepTalks(bookWords(src), 20000, 3).catch(() => null);
  const words = bookWords(src).map((x) => x.w);
  const roots = words.length ? await ensureRoots(words, 20000, 2).catch(() => null) : null;
  return { queued, talks, roots: roots ? { calls: roots.calls, missing: roots.missing } : null };
}
/** box loop: finish dialogues for all uploaded books */
export async function prepAllTalks(maxCalls = 4) {
  const ks = await kvKeys("reader:mybook:*", 5000);
  const words: { w: string; zh: string }[] = [];
  for (let i = 0; i < ks.length; i += 50) for (const s of await kvMGet(ks.slice(i, i + 50))) { try { s && words.push(...bookWords(JSON.parse(s))); } catch { /* skip */ } }
  void kvGet;
  return prepTalks(words, 20000, Math.min(maxCalls, 2));
}

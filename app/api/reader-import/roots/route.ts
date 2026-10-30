// Box-side 词根词缀 pre-generation. Bearer READER_IMPORT_TOKEN, else 404.
// GET  ?mode=stats            -> {words, have, notes, missing}
// GET  ?mode=list&w=a,b       -> {roots}
// POST {gen:{max}} | {words:[...]} -> generate missing notes (max calls this request; ≤25 words per call)
// POST {set:{w:{n,k}}}        -> manual correction
import { importAuthorized, importDenied } from "@/lib/reader/importauth";
import { cachedRoots, ensureRoots, normWord, okWord, rootsCallsLeft, rootsKey } from "@/lib/reader/roots";
import { kvGet, kvSet } from "@/lib/reader/store";
import { listUsers } from "@/lib/reader/users";
import { listBooks, getBook } from "@/lib/reader/mybooks";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const J = (x: any, s = 200) => Response.json(x, { status: s, headers: { "Cache-Control": "no-store" } });

async function allWords() {
  const set = new Set<string>();
  for (const u of listUsers()) {
    for (const b of await listBooks(u)) {
      const raw = await getBook(u, b.id); if (!raw) continue;
      try { (JSON.parse(raw).words || []).forEach((w: any) => w?.w && set.add(normWord(w.w))); } catch { /* skip */ }
    }
    const p = await kvGet(`reader:progress:${u}`);
    if (p) { try { Object.keys(JSON.parse(p)?.words || {}).forEach((w) => set.add(normWord(w))); } catch { /* skip */ } }
  }
  return [...set].filter(okWord);
}

export async function GET(req: Request) {
  if (!importAuthorized(req)) return importDenied();
  const u = new URL(req.url), mode = u.searchParams.get("mode");
  if (mode === "list") {
    const ws = (u.searchParams.get("w") || "").split(",").map(normWord).filter(okWord).slice(0, 200);
    return J({ roots: await cachedRoots(ws) });
  }
  const ws = await allWords(); const have = await cachedRoots(ws);
  const vals = Object.values(have);
  return J({ words: ws.length, have: vals.length, notes: vals.filter((v) => v && v.n).length, missing: ws.filter((w) => !have[w]), callsLeft: await rootsCallsLeft() });
}

export async function POST(req: Request) {
  if (!importAuthorized(req)) return importDenied();
  let body: any = {};
  try { body = JSON.parse(await req.text()); } catch { return J({ error: "bad json" }, 400); }
  if (body.set && typeof body.set === "object") {
    let n = 0;
    for (const [w0, v] of Object.entries<any>(body.set)) {
      const w = normWord(w0); if (!okWord(w)) continue;
      await kvSet(rootsKey(w), JSON.stringify({ n: String(v?.n || "").slice(0, 120), k: String(v?.k || "manual").slice(0, 10) })); n++;
    }
    return J({ set: n });
  }
  const words: string[] = Array.isArray(body.words) ? body.words : await allWords();
  const max = Math.min(3, Number(body.gen?.max) || 2);
  const r = await ensureRoots(words, 45000, max);
  return J({ calls: r.calls, err: r.err, missing: r.missing });
}

import { prepAllTalks, queueBookVoice } from "@/lib/reader/prep";
// Box-side Kokoro voice pipeline (scripts/kokoro-tts). Bearer READER_IMPORT_TOKEN, else 404.
// GET ?mode=collect        -> {items:[{t,v,k}], sources}   everything the reader may speak (from the store)
// GET ?mode=wants          -> {items:[{t,v,k}]}            clips the reader asked for but we don't have
// GET ?mode=stats          -> {clips, kv}
// GET ?mode=get&t=&v=      -> audio/mpeg (verification)
// POST {check:[k...]}      -> {have:[bool]}
// POST {items:[{t,v,b64}]} -> {stored}
// POST {upgrade:{max}}     -> Gemini clips for the most-likely-next items (free quota; {quota:true} when used up)
import { importAuthorized, importDenied } from "@/lib/reader/importauth";
import { WANT_FLAG, collectAll, KK_VOICES, kkKey, kkNorm, kokoroClip, listWants, wantKeyOf } from "@/lib/reader/kokoro";
import { runUpgrade } from "@/lib/reader/upgrade";
import { kvGet, kvDel, kvExists, kvKeys, kvSet, kvStats, kvUsage } from "@/lib/reader/store";
import { auditMyBooks, rememberUsage } from "@/lib/reader/mybooks";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const J = (x: any, s = 200) => Response.json(x, { status: s, headers: { "Cache-Control": "no-store" } });
const withKey = (xs: { t: string; v: string }[]) => xs.map((x) => ({ ...x, k: kkKey(x.t, x.v) }));

export async function GET(req: Request) {
  if (!importAuthorized(req)) return importDenied();
  const u = new URL(req.url), mode = u.searchParams.get("mode");
  if (mode === "collect") { const r = await collectAll(); return J({ items: withKey(r.items), sources: r.sources }); }
  if (mode === "flag") return J({ flag: Number((await kvGet(WANT_FLAG)) || 0) });
  if (mode === "audit") return J(await auditMyBooks());
  if (mode === "usage") {
    const parts = ["reader:mybook:*", "reader:mybookimg:*", "reader:kk:v1:*", "reader:tts:*", "reader:kkw:*", "reader:talk:*", "reader:roots:*"];
    const used: Record<string, { keys: number; bytes: number }> = {};
    let bytes = 0, keys = 0;
    for (const p of parts) { const u = await kvUsage(p); used[p] = u; bytes += u.bytes; keys += u.keys; }
    await rememberUsage(bytes);
    return J({ used, bytes, keys, kv: await kvStats() });
  }
  if (mode === "wants") return J({ items: withKey(await listWants()) });
  if (mode === "stats") return J({ clips: (await kvKeys("reader:kk:v1:*", 100000)).length, wants: (await kvKeys("reader:kkw:*", 100000)).length, kv: await kvStats() });
  if (mode === "get") {
    const b = await kokoroClip(u.searchParams.get("t") || "", u.searchParams.get("v") || "n");
    return b ? new Response(new Uint8Array(b), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } }) : J({ error: "missing" }, 404);
  }
  return J({ error: "mode?" }, 400);
}

export async function POST(req: Request) {
  if (!importAuthorized(req)) return importDenied();
  let body: any = {};
  try { body = JSON.parse(await req.text()); } catch { return J({ error: "bad json" }, 400); }
  if (body.prepTalks) return J(await prepAllTalks(Math.min(5, Number(body.prepTalks.max) || 4)));
  if (body.queueAll) { // re-queue every uploaded book's clips (idempotent; only new wants set the flag)
    const ks = await kvKeys("reader:mybook:*", 5000); let n = 0;
    for (const k of ks) { const s = await kvGet(k); if (s) n += await queueBookVoice(JSON.parse(s)); }
    return J({ books: ks.length, items: n });
  }
  if (body.upgrade) {
    if (!process.env.GEMINI_API_KEY) return J({ quota: true, detail: "ai_not_configured" });
    return J(await runUpgrade(45000, Math.min(8, Number(body.upgrade.max) || 4)));
  }
  if (Array.isArray(body.check)) {
    const ks = body.check.filter((k: any) => typeof k === "string" && k.startsWith("reader:kk:v1:")).slice(0, 2000);
    return J({ have: await kvExists(ks), keys: ks });
  }
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 200);
  let stored = 0; const del: string[] = [];
  for (const it of items) {
    const t = kkNorm(String(it?.t || "")), v = String(it?.v || "");
    const b64 = String(it?.b64 || "");
    if (!t || !KK_VOICES[v] || b64.length < 200 || b64.length > 400_000) continue;
    const head = Buffer.from(b64.slice(0, 8), "base64");
    if (!(head[0] === 0x49 && head[1] === 0x44) && !(head[0] === 0xff && (head[1] & 0xe0) === 0xe0)) continue; // ID3 / MPEG frame
    await kvSet(kkKey(t, v), b64); stored++; del.push(wantKeyOf(t, v));
  }
  if (del.length) await kvDel(...del);
  return J({ stored });
}

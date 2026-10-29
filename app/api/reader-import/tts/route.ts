// Box-side Kokoro voice pipeline (scripts/kokoro-tts). Bearer READER_IMPORT_TOKEN, else 404.
// GET ?mode=collect        -> {items:[{t,v,k}], sources}   everything the reader may speak (from the store)
// GET ?mode=wants          -> {items:[{t,v,k}]}            clips the reader asked for but we don't have
// GET ?mode=stats          -> {clips, kv}
// GET ?mode=get&t=&v=      -> audio/mpeg (verification)
// POST {check:[k...]}      -> {have:[bool]}
// POST {items:[{t,v,b64}]} -> {stored}
import { importAuthorized, importDenied } from "@/lib/reader/importauth";
import { collectAll, KK_VOICES, kkKey, kkNorm, kokoroClip, listWants, wantKeyOf } from "@/lib/reader/kokoro";
import { kvDel, kvExists, kvKeys, kvSet, kvStats } from "@/lib/reader/store";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const J = (x: any, s = 200) => Response.json(x, { status: s, headers: { "Cache-Control": "no-store" } });
const withKey = (xs: { t: string; v: string }[]) => xs.map((x) => ({ ...x, k: kkKey(x.t, x.v) }));

export async function GET(req: Request) {
  if (!importAuthorized(req)) return importDenied();
  const u = new URL(req.url), mode = u.searchParams.get("mode");
  if (mode === "collect") { const r = await collectAll(); return J({ items: withKey(r.items), sources: r.sources }); }
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

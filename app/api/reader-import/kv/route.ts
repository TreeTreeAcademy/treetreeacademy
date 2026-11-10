// Box-side KV backup / compact / migrate. Bearer READER_IMPORT_TOKEN.
// Only reader:* keys. Values are never logged.
import { importAuthorized, importDenied } from "@/lib/reader/importauth";
import { kvDel, kvExists, kvGet, kvKeys, kvLen, kvMGet, kvSet } from "@/lib/reader/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const J = (x: any, s = 200) => Response.json(x, { status: s, headers: { "Cache-Control": "no-store" } });
const okKey = (k: unknown): k is string => typeof k === "string" && k.startsWith("reader:") && k.length < 300 && !k.includes("\n");

export async function GET(req: Request) {
  if (!importAuthorized(req)) return importDenied();
  const u = new URL(req.url);
  const match = u.searchParams.get("match") || "";
  if (!okKey(match.replace(/\*$/, "")) && !/^reader:[a-z0-9:_-]*\*$/.test(match)) return J({ error: "bad match" }, 400);
  const keys = await kvKeys(match, Math.min(100000, Math.max(1, Number(u.searchParams.get("max") || 20000))));
  if (u.searchParams.get("len") === "1") {
    const lens: Record<string, number | null> = {};
    for (let i = 0; i < keys.length; i += 200) {
      const part = keys.slice(i, i + 200);
      const ls = await kvLen(part);
      part.forEach((k, j) => { lens[k] = ls[j]; });
    }
    return J({ keys, lens, n: keys.length });
  }
  return J({ keys, n: keys.length });
}

export async function POST(req: Request) {
  if (!importAuthorized(req)) return importDenied();
  let body: any = {};
  try { body = JSON.parse(await req.text()); } catch { return J({ error: "bad json" }, 400); }

  if (Array.isArray(body.exists)) {
    const ks = body.exists.filter(okKey).slice(0, 2000);
    return J({ have: await kvExists(ks), keys: ks });
  }
  if (Array.isArray(body.get)) {
    const ks = body.get.filter(okKey).slice(0, 80);
    const vals = await kvMGet(ks);
    // cap payload ~3.5 MB
    const out: (string | null)[] = [];
    let bytes = 0;
    for (const v of vals) {
      const n = v ? v.length : 0;
      if (bytes + n > 3_500_000) { out.push(null); continue; } // signal retry smaller batch
      bytes += n; out.push(v);
    }
    return J({ keys: ks, vals: out, bytes });
  }
  if (Array.isArray(body.set)) {
    let n = 0;
    try {
      for (const it of body.set.slice(0, 40)) {
        const k = it?.k, v = it?.v;
        if (!okKey(k) || typeof v !== "string" || v.length > 2_000_000) continue;
        await kvSet(k, v);
        const lens = await kvLen([k]);
        if (lens[0] !== v.length) return J({ error: "set did not stick", k, n }, 500);
        n++;
      }
    } catch (e: any) {
      return J({ error: String(e?.message || e).slice(0, 200), set: n }, 500);
    }
    return J({ set: n });
  }
  if (Array.isArray(body.del)) {
    const ks = body.del.filter(okKey).slice(0, 500);
    for (let i = 0; i < ks.length; i += 100) await kvDel(...ks.slice(i, i + 100));
    return J({ del: ks.length });
  }
  return J({ error: "body?" }, 400);
}

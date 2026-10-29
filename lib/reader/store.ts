// Small key-value store for the reader: Upstash / Vercel KV REST when configured
// (KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN),
// otherwise a local JSON file (dev; READER_LOCAL_STORE, default .reader-data/store.json) or memory (on Vercel).
import { promises as fs } from "fs";
import path from "path";
import { kvConfig } from "@/lib/plan/server";

type Cmd = (string | number)[];

async function upstash(cmds: Cmd[]): Promise<any[]> {
  const kv = kvConfig()!;
  const r = await fetch(`${kv.url}/pipeline`, {
    method: "POST", headers: { Authorization: `Bearer ${kv.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds.map((c) => c.map(String))), cache: "no-store",
  });
  if (!r.ok) throw new Error(`kv ${r.status}`);
  const j = (await r.json()) as { result?: any; error?: string }[];
  return j.map((x) => (x.error ? null : x.result));
}

// ---- local fallback ----
type Rec = { v: string; exp?: number };
// shared via globalThis: in `next dev` every route bundle gets its own module copy, and separate maps would
// overwrite each other's writes to the store file
const G = globalThis as any;
let mem: Map<string, Rec> | null = G.__readerLocalMem || null;
let dirty: NodeJS.Timeout | null = null;
const localFile = () => (process.env.VERCEL ? "" : process.env.READER_LOCAL_STORE || path.join(process.cwd(), ".reader-data", "store.json"));
async function local(): Promise<Map<string, Rec>> {
  if (G.__readerLocalMem) return (mem = G.__readerLocalMem);
  mem = G.__readerLocalMem = new Map();
  const f = localFile();
  if (f) { try { for (const [k, v] of Object.entries(JSON.parse(await fs.readFile(f, "utf8")))) mem!.set(k, v as Rec); } catch { /* new store */ } }
  return mem!;
}
function persist() {
  const f = localFile();
  if (!f || dirty) return;
  dirty = setTimeout(async () => {
    dirty = null;
    try { await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, JSON.stringify(Object.fromEntries(mem!))); } catch { /* ignore */ }
  }, 200);
}
const alive = (r?: Rec) => (r && (!r.exp || r.exp > Date.now()) ? r : undefined);

/** Best-effort size of the store (keys + used bytes when the backend reports it) — the importer checks headroom. */
export async function kvStats(): Promise<{ keys: number | null; usedBytes: number | null }> {
  try {
    if (kvConfig()) {
      const [n, info] = await upstash([["DBSIZE"], ["INFO"]]);
      const m = typeof info === "string" ? info.match(/used_memory:(\d+)/) : null;
      return { keys: typeof n === "number" ? n : null, usedBytes: m ? Number(m[1]) : null };
    }
    const mem = await local();
    let b = 0; for (const [k, r] of mem) b += k.length + r.v.length;
    return { keys: mem.size, usedBytes: b };
  } catch { return { keys: null, usedBytes: null }; }
}

export const storeKind = () => (kvConfig() ? "upstash" : localFile() ? "file" : "memory");

export async function kvGet(k: string): Promise<string | null> {
  if (kvConfig()) return (await upstash([["GET", k]]))[0] ?? null;
  return alive((await local()).get(k))?.v ?? null;
}
export async function kvMGet(keys: string[]): Promise<(string | null)[]> {
  if (!keys.length) return [];
  if (kvConfig()) return ((await upstash([["MGET", ...keys]]))[0] || []).map((x: any) => x ?? null);
  const m = await local();
  return keys.map((k) => alive(m.get(k))?.v ?? null);
}
/** Which keys exist (without fetching values — page images are large and Upstash caps a response at ~10 MB). */
export async function kvExists(keys: string[]): Promise<boolean[]> {
  if (!keys.length) return [];
  if (kvConfig()) return (await upstash(keys.map((k) => ["EXISTS", k]))).map((x) => Number(x) > 0);
  const m = await local();
  return keys.map((k) => !!alive(m.get(k)));
}
export async function kvSet(k: string, v: string, ttlSec?: number) {
  if (kvConfig()) { await upstash([ttlSec ? ["SET", k, v, "EX", ttlSec] : ["SET", k, v]]); return; }
  (await local()).set(k, { v, exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined }); persist();
}
export async function kvDel(...keys: string[]) {
  if (!keys.length) return;
  if (kvConfig()) { await upstash([["DEL", ...keys]]); return; }
  const m = await local(); keys.forEach((k) => m.delete(k)); persist();
}
export async function kvIncr(k: string, by: number, ttlSec: number): Promise<number> {
  if (kvConfig()) { const [n] = await upstash([["INCRBY", k, by], ["EXPIRE", k, ttlSec, "NX"]]); return Number(n); }
  const m = await local(); const cur = alive(m.get(k));
  const n = Number(cur?.v || 0) + by;
  m.set(k, { v: String(n), exp: cur?.exp || Date.now() + ttlSec * 1000 }); persist();
  return n;
}
/** Delete every key matching a glob (SCAN-based; bounded). Returns how many were deleted. */
export async function kvDelMatch(match: string, maxRounds = 200): Promise<number> {
  let n = 0;
  if (kvConfig()) {
    let cur = "0";
    for (let i = 0; i < maxRounds; i++) {
      const [res] = await upstash([["SCAN", cur, "MATCH", match, "COUNT", 500]]);
      if (!Array.isArray(res)) break;
      cur = String(res[0]); const keys: string[] = res[1] || [];
      if (keys.length) { await upstash([["DEL", ...keys]]); n += keys.length; }
      if (cur === "0") break;
    }
    return n;
  }
  const m = await local(); const re = new RegExp("^" + match.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
  for (const k of [...m.keys()]) if (re.test(k)) { m.delete(k); n++; }
  if (n) persist();
  return n;
}

/** SET only if absent (with TTL). */
export async function kvSetNx(k: string, v: string, ttlSec: number) {
  if (kvConfig()) { await upstash([["SET", k, v, "NX", "EX", ttlSec]]); return; }
  const m = await local(); if (!alive(m.get(k))) { m.set(k, { v, exp: Date.now() + ttlSec * 1000 }); persist(); }
}
/** Keys matching a glob (SCAN-based; bounded). */
export async function kvKeys(match: string, max = 20000): Promise<string[]> {
  const out: string[] = [];
  if (kvConfig()) {
    let cur = "0";
    for (let i = 0; i < 400 && out.length < max; i++) {
      const [res] = await upstash([["SCAN", cur, "MATCH", match, "COUNT", 1000]]);
      if (!Array.isArray(res)) break;
      cur = String(res[0]); out.push(...(res[1] || []));
      if (cur === "0") break;
    }
    return out.slice(0, max);
  }
  const m = await local(); const re = new RegExp("^" + match.split("*").map((x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
  for (const [k, r] of m) if (alive(r) && re.test(k)) out.push(k);
  return out.slice(0, max);
}

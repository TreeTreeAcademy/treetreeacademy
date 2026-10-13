import { createHmac, timingSafeEqual } from "crypto";

export const COOKIE = "plan_session";
export const MAX_AGE = 180 * 24 * 3600;

function env(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export function kvConfig() {
  const url = env("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
  const token = env("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function missingEnv(): string[] {
  const m: string[] = [];
  if (!env("PLAN_PASSWORD")) m.push("PLAN_PASSWORD");
  if (!env("PLAN_SECRET")) m.push("PLAN_SECRET");
  if (!kvConfig()) m.push("KV_REST_API_URL / KV_REST_API_TOKEN");
  return m;
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

function sign(payload: string): string {
  return createHmac("sha256", env("PLAN_SECRET") || "").update(payload).digest("base64url");
}

export function makeToken(): string {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${exp}.${sign(exp)}`;
}

export function checkToken(tok: string | undefined): boolean {
  if (!tok || !env("PLAN_SECRET")) return false;
  const [exp, sig] = tok.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, sign(exp));
}

export function cookieFrom(req: Request): string | undefined {
  const c = req.headers.get("cookie") || "";
  for (const part of c.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function passwordOk(p: string): boolean {
  const pw = env("PLAN_PASSWORD");
  return !!pw && safeEqual(p, pw);
}

export function assistantOk(req: Request): boolean {
  const t = env("PLAN_ASSISTANT_TOKEN");
  if (!t) return false;
  return safeEqual(req.headers.get("authorization") || "", "Bearer " + t);
}

export async function kv(cmd: (string | number)[]): Promise<unknown> {
  const cfg = kvConfig();
  if (!cfg) throw new Error("KV not configured");
  const r = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const j = (await r.json()) as { result?: unknown; error?: string };
  if (!r.ok || j.error) throw new Error(j.error || `KV HTTP ${r.status}`);
  return j.result;
}

export type Advice = { date: string; task: string; std: string; low: string; note: string };

export async function getState(): Promise<unknown> {
  const s = (await kv(["GET", "plan:state"])) as string | null;
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

export async function getAdviceList(): Promise<Advice[]> {
  const l = ((await kv(["LRANGE", "plan:advice", 0, -1])) as string[]) || [];
  return l.flatMap((x) => { try { return [JSON.parse(x) as Advice]; } catch { return []; } });
}

export function latestAdvice(list: Advice[]): Advice | null {
  const v = list.filter((a) => a && a.task);
  if (!v.length) return null;
  // latest date wins; ties -> later appended
  return v.reduce((best, a) => (a.date >= best.date ? a : best));
}

export const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });

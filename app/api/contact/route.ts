import { assistantOk, checkToken, cookieFrom, json, kv, kvConfig } from "@/lib/plan/server";

export const dynamic = "force-dynamic";

// 网站留言。和 /api/waitlist 同样省额度：每次提交 2 条命令（RPUSH + LTRIM），最多保留 500 条。
import { CONTACT_KEY } from "@/lib/site/social";
const MAX = 500;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  if (clip(b.website, 200)) return json({ ok: true }); // honeypot
  const email = clip(b.email, 120).toLowerCase();
  const message = clip(b.message, 2000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "email" }, 400);
  if (message.length < 2) return json({ error: "message" }, 400);
  const rec = {
    at: new Date().toISOString(),
    lang: b.lang === "en" ? "en" : "zh",
    name: clip(b.name, 60),
    email,
    age: clip(b.age, 40),
    message,
  };
  if (!kvConfig()) return json({ error: "unavailable" }, 503);
  try {
    await kv(["RPUSH", CONTACT_KEY, JSON.stringify(rec)]);
    await kv(["LTRIM", CONTACT_KEY, -MAX, -1]);
  } catch {
    return json({ error: "unavailable" }, 503);
  }
  return json({ ok: true });
}

// 查看留言：先在 /plan 登录，再打开 /plan/messages（或 /api/contact，?format=csv 导出）；
// 或带 Authorization: Bearer <PLAN_ASSISTANT_TOKEN>。
export async function GET(req: Request) {
  if (!checkToken(cookieFrom(req)) && !assistantOk(req)) return json({ error: "unauthorized" }, 401);
  if (!kvConfig()) return json({ error: "KV not configured" }, 503);
  const raw = ((await kv(["LRANGE", CONTACT_KEY, 0, -1])) as string[]) || [];
  const rows = raw.flatMap((x) => { try { return [JSON.parse(x)]; } catch { return []; } }).reverse();
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const cols = ["at", "lang", "name", "email", "age", "message"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    return new Response("\ufeff" + csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
  return json({ count: rows.length, rows });
}

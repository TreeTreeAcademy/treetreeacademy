import { assistantOk, checkToken, cookieFrom, json, kv, kvConfig } from "@/lib/plan/server";

export const dynamic = "force-dynamic";

// 意向登记 / 领取登记。不收钱，只存一条很小的记录（约 200 字节）。
// Upstash 接近免费额度：每次提交只用 2 条命令（RPUSH + LTRIM），列表最多保留 1000 条。
const KEY = "site:waitlist:v1";
const MAX = 1000;
const SOURCES = new Set(["start", "start-en", "workshop", "workshop-waitlist", "home"]);
const RESULTS = new Set(["vocab", "confidence", "habit", "none", ""]);

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ error: "格式不正确" }, 400); }
  if (clip(b.website, 200)) return json({ ok: true }); // honeypot：机器人填了就假装成功
  const email = clip(b.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "请填写正确的邮箱" }, 400);
  const source = clip(b.source, 20);
  const result = clip(b.result, 20);
  const rec = {
    at: new Date().toISOString(),
    name: clip(b.name, 60),
    email,
    wechat: clip(b.wechat, 60),
    source: SOURCES.has(source) ? source : "other",
    result: RESULTS.has(result) ? result : "",
  };
  if (!kvConfig()) return json({ error: "暂时无法提交，请稍后再试" }, 503);
  try {
    await kv(["RPUSH", KEY, JSON.stringify(rec)]);
    await kv(["LTRIM", KEY, -MAX, -1]);
  } catch {
    return json({ error: "暂时无法提交，请稍后再试" }, 503);
  }
  return json({ ok: true });
}

// 查看登记名单：先在 /plan 登录（同一个驾驶舱密码），再打开 /api/waitlist；
// 或带 Authorization: Bearer <PLAN_ASSISTANT_TOKEN>。加 ?format=csv 导出表格。
export async function GET(req: Request) {
  if (!checkToken(cookieFrom(req)) && !assistantOk(req)) return json({ error: "unauthorized" }, 401);
  if (!kvConfig()) return json({ error: "KV not configured" }, 503);
  const raw = ((await kv(["LRANGE", KEY, 0, -1])) as string[]) || [];
  const rows = raw.flatMap((x) => { try { return [JSON.parse(x)]; } catch { return []; } });
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const cols = ["at", "source", "result", "name", "email", "wechat"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    return new Response("\ufeff" + csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
  return json({ count: rows.length, rows });
}

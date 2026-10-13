import { assistantOk, getAdviceList, getState, json, kv, kvConfig } from "@/lib/plan/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!assistantOk(req)) return json({ error: "unauthorized" }, 401);
  if (!kvConfig()) return json({ error: "尚未设置" }, 503);
  const [state, advice] = await Promise.all([getState(), getAdviceList()]);
  return json({ state, advice });
}

export async function POST(req: Request) {
  if (!assistantOk(req)) return json({ error: "unauthorized" }, 401);
  if (!kvConfig()) return json({ error: "尚未设置" }, 503);
  let b: Record<string, unknown> | null = null;
  try { b = await req.json(); } catch { /* invalid */ }
  const s = (k: string) => (b && typeof b[k] === "string" ? (b[k] as string).trim() : "");
  const item = { date: s("date"), task: s("task"), std: s("std"), low: s("low"), note: s("note") };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !item.task) return json({ error: "需要 date (yyyy-MM-dd) 和 task" }, 400);
  await kv(["RPUSH", "plan:advice", JSON.stringify(item)]);
  return json({ ok: true, advice: item });
}

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

// PATCH: assistant edits stored state. Body: { set: { <topKey>: value } } (shallow merge of top-level keys),
// optional { listA: [...] } shortcut to replace lists.A.items. Other keys are left untouched.
const PATCHABLE = new Set(["task", "lists", "content", "archive", "reviews", "ideas", "sos"]);
export async function PATCH(req: Request) {
  if (!assistantOk(req)) return json({ error: "unauthorized" }, 401);
  if (!kvConfig()) return json({ error: "尚未设置" }, 503);
  let b: { set?: Record<string, unknown>; listA?: unknown } | null = null;
  try { b = await req.json(); } catch { /* invalid */ }
  if (!b || typeof b !== "object") return json({ error: "invalid body" }, 400);
  const cur = (await getState()) as Record<string, unknown> | null;
  if (!cur || typeof cur !== "object") return json({ ok: true, skipped: "no stored state; page defaults apply" });
  const next: Record<string, unknown> = { ...cur };
  for (const [k, v] of Object.entries(b.set || {})) {
    if (!PATCHABLE.has(k)) return json({ error: `key not patchable: ${k}` }, 400);
    next[k] = v;
  }
  if (Array.isArray(b.listA)) {
    const lists = { ...((next.lists as Record<string, unknown>) || {}) };
    lists.A = { ...((lists.A as Record<string, unknown>) || {}), items: b.listA };
    next.lists = lists;
  }
  if (!next.lists || !next.task) return json({ error: "state must keep lists and task" }, 400);
  await kv(["SET", "plan:state", JSON.stringify(next)]);
  return json({ ok: true, state: next });
}

import { checkToken, cookieFrom, getAdviceList, getState, json, kv, latestAdvice, missingEnv } from "@/lib/plan/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (missingEnv().length) return json({ error: "尚未设置" }, 503);
  if (!checkToken(cookieFrom(req))) return json({ error: "unauthorized" }, 401);
  const [state, list] = await Promise.all([getState(), getAdviceList()]);
  return json({ state, advice: latestAdvice(list) });
}

export async function POST(req: Request) {
  if (missingEnv().length) return json({ error: "尚未设置" }, 503);
  if (!checkToken(cookieFrom(req))) return json({ error: "unauthorized" }, 401);
  let S: { lists?: unknown; task?: unknown } | null = null;
  try { S = await req.json(); } catch { /* invalid */ }
  if (!S || typeof S !== "object" || !S.lists || !S.task) return json({ error: "数据格式不正确" }, 400);
  await kv(["SET", "plan:state", JSON.stringify(S)]);
  return json({ ok: true, at: new Date().toISOString() });
}

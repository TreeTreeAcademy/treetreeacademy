import { json, kv, kvConfig } from "@/lib/plan/server";
import { KIT_FORMS } from "@/lib/site/kit";

export const dynamic = "force-dynamic";

// 7 天启动包领取：
// 1) 先把记录写进 Upstash 的 site:waitlist:v1（备份；2 条命令，最多 1000 条）；
// 2) 再在服务器端把邮箱提交给 Kit 的公开表单（和 Kit 嵌入表单同一个地址），由 Kit 发确认邮件和启动包。
const KEY = "site:waitlist:v1";
const MAX = 1000;
const SOURCES = new Set(["kit-home", "kit-home-en", "kit-workshop-en", "start", "start-en"]);
const RESULTS = new Set(["vocab", "confidence", "habit", "none", ""]);
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

async function kitSubscribe(formId: string, email: string, firstName: string) {
  const body = new URLSearchParams({ email_address: email });
  if (firstName) body.set("fields[first_name]", firstName);
  try {
    const r = await fetch(`https://app.kit.com/forms/${formId}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const j = (await r.json().catch(() => ({}))) as { status?: string };
    // Kit replies {status:"success"} / "quarantined" (needs a captcha) / "failed" + errors.
    return r.ok && j.status ? j.status : `http_${r.status}`;
  } catch {
    return "network";
  }
}

export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  if (clip(b.website, 200)) return json({ ok: true }); // honeypot
  const email = clip(b.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "email" }, 400);
  const lang = b.lang === "en" ? "en" : "zh";
  const name = clip(b.name, 60);
  const source = clip(b.source, 20);
  const result = clip(b.result, 20);

  const kit = await kitSubscribe(KIT_FORMS[lang].id, email, name);

  let saved = false;
  if (kvConfig()) {
    const rec = {
      at: new Date().toISOString(), name, email,
      source: SOURCES.has(source) ? source : lang === "en" ? "kit-en" : "kit",
      result: RESULTS.has(result) ? result : "", kit,
    };
    try {
      await kv(["RPUSH", KEY, JSON.stringify(rec)]);
      await kv(["LTRIM", KEY, -MAX, -1]);
      saved = true;
    } catch { /* backup failed; Kit may still have it */ }
  }

  if (kit === "success") return json({ ok: true, kit });
  if (kit === "failed" || kit.startsWith("http_4")) {
    // Kit rejected the address itself (e.g. invalid email).
    if (!saved) return json({ error: "email" }, 400);
  }
  // Kit unreachable / quarantined: if the backup saved, Jing still has the email.
  if (saved) return json({ ok: true, kit });
  return json({ error: "unavailable" }, 503);
}

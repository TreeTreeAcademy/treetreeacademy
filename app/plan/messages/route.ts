import { checkToken, cookieFrom, kv, kvConfig } from "@/lib/plan/server";
import { CONTACT_KEY } from "@/lib/site/social";

export const dynamic = "force-dynamic";

// 只读留言页：需要先在 /plan 登录（同一个驾驶舱 cookie）。最新的在上面。
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const H = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(req: Request) {
  if (!checkToken(cookieFrom(req))) return Response.redirect(new URL("/plan", req.url), 302);
  let rows: Record<string, string>[] = [];
  let note = "";
  if (!kvConfig()) note = "数据库未设置（KV not configured）。";
  else {
    const raw = ((await kv(["LRANGE", CONTACT_KEY, 0, -1])) as string[]) || [];
    rows = raw.flatMap((x) => { try { return [JSON.parse(x)]; } catch { return []; } }).reverse();
  }
  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString("zh-CN", { timeZone: "America/Chicago", hour12: false }) + "（美中时间）"; } catch { return esc(iso); }
  };
  const items = rows.map((r) => {
    const subj = encodeURIComponent(r.lang === "en" ? "Re: your message to Tree Tree Academy" : "回复：你在树儿学院的留言");
    return `<article class="m"><div class="h"><b>${esc(r.name || "（未留称呼）")}</b> · <a href="mailto:${esc(r.email)}?subject=${subj}">${esc(r.email)}</a>${r.age ? ` · 孩子：${esc(r.age)}` : ""} <span class="l">${r.lang === "en" ? "EN" : "中文"}</span></div><p>${esc(r.message).replace(/\n/g, "<br>")}</p><small>${fmt(r.at)}</small></article>`;
  }).join("");
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>留言 · 树儿学院</title><style>body{margin:0;background:#faf6ef;color:#2a2a22;font-family:-apple-system,"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif}main{max-width:820px;margin:0 auto;padding:24px 16px 60px}h1{font-size:22px;color:#028a41;margin:0 0 4px}.top{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:16px}.top a{color:#028a41}.m{background:#fff;border:1px solid #eadfce;border-radius:12px;padding:14px 16px;margin:10px 0}.h a{color:#028a41}.l{font-size:12px;background:#eef8d8;border-radius:6px;padding:1px 6px;margin-left:4px}p{white-space:normal;line-height:1.7;margin:8px 0}small{color:#8a7f72}.e{color:#8a7f72}</style></head><body><main><div class="top"><div><h1>留言</h1><span class="e">共 ${rows.length} 条，最新的在上面 · 点邮箱直接回复</span></div><div><a href="/api/contact?format=csv">导出 CSV</a> · <a href="/plan">回驾驶舱</a></div></div>${note ? `<p class="e">${note}</p>` : ""}${items || (note ? "" : `<p class="e">还没有留言。</p>`)}</main></body></html>`;
  return new Response(html, { headers: H });
}

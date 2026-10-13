import { checkToken, cookieFrom, missingEnv } from "@/lib/plan/server";
import { COCKPIT_HTML } from "@/lib/plan/cockpitHtml";

export const dynamic = "force-dynamic";

const page = (body: string) => `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>成事搭档 驾驶舱</title><link rel="manifest" href="/plan/manifest.webmanifest"><link rel="apple-touch-icon" href="/apple-icon.png"><style>body{margin:0;background:#faf6ef;color:#3b342c;font-family:-apple-system,"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center}.c{background:#fffdf8;border:1px solid #eadfce;border-radius:14px;padding:24px;width:min(92vw,360px);box-shadow:0 1px 3px #0000000a}h1{font-size:19px;margin:0 0 12px;color:#c0794a}input{font:inherit;width:100%;box-sizing:border-box;padding:10px;border:1px solid #eadfce;border-radius:10px;margin:8px 0}button{font:inherit;width:100%;border:0;background:#c0794a;color:#fff;border-radius:10px;padding:10px;min-height:44px}.e{color:#b3412e;font-size:14px}small{color:#8a7f72}</style></head><body><div class="c">${body}</div></body></html>`;

const html = (s: string, status = 200) =>
  new Response(s, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });

export async function GET(req: Request) {
  const miss = missingEnv();
  if (miss.length) return html(page(`<h1>成事搭档 驾驶舱</h1><p>驾驶舱尚未设置完成。</p><small>需要在 Vercel 中设置：${miss.join("、")}</small>`), 503);
  if (checkToken(cookieFrom(req))) return html(COCKPIT_HTML);
  const err = new URL(req.url).searchParams.get("err") ? `<p class="e">密码不对，请再试一次。</p>` : "";
  return html(page(`<h1>成事搭档 驾驶舱</h1>${err}<form method="post" action="/api/plan/login"><input type="password" name="password" placeholder="请输入密码" autocomplete="current-password" required autofocus><button type="submit">进入</button></form><small>登录一次可保持 180 天</small>`));
}

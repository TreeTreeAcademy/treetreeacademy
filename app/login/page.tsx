import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { READER_COOKIE, verifySession } from "@/lib/reader/session";

export const metadata: Metadata = { title: "登录学习", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  "1": "账号或密码不正确，请再试一次。",
  wait: "尝试次数太多，请 10 分钟后再试。",
  config: "学习中心还没有配置账号（READER_USERS / READER_SESSION_SECRET）。",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; err?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && /^\/reader(\/[\w\-./]*)?$/.test(sp.next) ? sp.next : "/reader";
  const user = await verifySession((await cookies()).get(READER_COOKIE)?.value);
  if (user) redirect(next);
  return (
    <section className="reader-login">
      <img src="/logo.png" alt="" width={84} height={84} className="hero__logo" />
      <h1>登录学习</h1>
      <p className="lead">树儿学院 · 学习中心：读原文、点单词、学习 → 复习 → 成就仓。账号由树儿学院分配。</p>
      <form method="post" action="/api/reader/login" className="card reader-login__form">
        <input type="hidden" name="next" value={next} />
        <label>
          账号
          <input name="username" autoComplete="username" required autoCapitalize="none" spellCheck={false} />
        </label>
        <label>
          密码
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {sp.err && <p className="reader-login__err">{ERR[sp.err] || ERR["1"]}</p>}
        <button className="btn btn--primary" type="submit">登录，开始学习 →</button>
      </form>
      <p className="meta">学习进度保存在本设备；配置服务器存储后可跨设备同步。</p>
    </section>
  );
}

import type { Metadata } from "next";
import { MEMBERS_ZH } from "@/lib/site/members";

export const metadata: Metadata = {
  title: "会员独享",
  description: "树儿学院会员练习园地：故事精听、汉字学习、中文共读AI陪读官。需要登录。",
  alternates: { canonical: "/members", languages: { "zh-CN": "/members", en: "/en/members" } },
};

// 会员入口页本身公开；三个栏目仍由 middleware 的读读乐登录保护（未登录会跳到 /login?next=…）。
export default function MembersPage() {
  return (
    <div className="lp-page">
      <section className="lp-band lp-band--hero">
        <div className="lp-wrap">
          <p className="lp-small"><a href="/en/members" lang="en">English →</a></p>
          <p className="lp-eyebrow">会员独享 🔒</p>
          <h1 className="lp-h1 lp-h1--md">会员练习园地</h1>
          <p className="lp-sub">下面三个栏目需要会员账号登录。点进去后，如果还没登录，会先请你登录。</p>
          <div className="vz-cards vz-cards--3 mb-grid">
            {MEMBERS_ZH.map((x) => (
              <a key={x.href} href={x.href} className="vz-card mb-card">
                <h3>{x.t} <span className="nav-lock" aria-label="需要登录">🔒</span></h3>
                <p>{x.d}</p>
                <span className="lp-link">进入 →</span>
              </a>
            ))}
          </div>
          <p className="lp-small" style={{ marginTop: 24 }}>还没有会员账号？<a href="/contact">给晶晶留言</a>。</p>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import { MEMBERS_EN } from "@/lib/site/members";

export const metadata: Metadata = {
  title: { absolute: "Members only | Tree Tree Academy" },
  description: "Members-only practice tools from Tree Tree Academy: Story Listening, Chinese Character Games, and AI Chinese Read-Along. Login required.",
  alternates: { canonical: "/en/members", languages: { "zh-CN": "/members", en: "/en/members" } },
};

export default function EnMembersPage() {
  return (
    <div className="lp-page" lang="en">
      <section className="lp-band lp-band--hero">
        <div className="lp-wrap">
          <p className="lp-small"><a href="/members" lang="zh-CN">中文版 →</a></p>
          <p className="lp-eyebrow">Members only 🔒</p>
          <h1 className="lp-h1 lp-h1--md">The members&apos; practice room</h1>
          <p className="lp-sub">The three tools below are for members. Click any of them — if you&apos;re not signed in yet, you&apos;ll be asked to log in first.</p>
          <div className="vz-cards vz-cards--3 mb-grid">
            {MEMBERS_EN.map((x) => (
              <a key={x.href} href={x.href} className="vz-card mb-card">
                <h3>{x.t} <span className="nav-lock" aria-label="Login required">🔒</span></h3>
                <p>{x.d}</p>
                <span className="lp-link">Open →</span>
              </a>
            ))}
          </div>
          <p className="lp-small" style={{ marginTop: 24 }}>Don&apos;t have a member account yet? <a href="/en/contact">Message Jing</a>.</p>
        </div>
      </section>
    </div>
  );
}

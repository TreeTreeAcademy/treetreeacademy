import { getLatestEpisode, formatDate, themeLabels } from "@/lib/episodes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "首页",
  description:
    "树儿学院 — 亲子听故事复述练习。小群姐姐栏目：工作日故事简报。",
};

export default function HomePage() {
  const latest = getLatestEpisode();

  return (
    <>
      <section className="hero">
        <div className="hero__brand">
          <img
            src="/logo.png"
            alt=""
            width={88}
            height={88}
            className="hero__logo"
          />
        </div>
        <h1>树儿学院</h1>
        <p className="lead">
          给亲子的听故事复述练习园地。每天听一听、问一问、跟一跟，用小小的表达工具，陪孩子把故事讲出来。
        </p>
        <div className="cta-row">
          <a href="/xiaoqun" className="btn btn--primary">
            进入小群姐姐栏目
          </a>
        </div>
      </section>

      <section>
        <div className="section-label">专栏</div>
        <h2 style={{ marginTop: 0, borderBottom: "none", paddingBottom: 0 }}>
          小群姐姐 · 听故事复述
        </h2>
        <p>
          工作日更新。每期整理两则故事的大概、听后问题、当前表达阶段，以及成人示范稿——方便在手机上打开、跟孩子一起练。
        </p>
      </section>

      {latest && (
        <section style={{ marginTop: "2rem" }}>
          <div className="section-label">最新一期</div>
          <a href={`/xiaoqun/${latest.slug}`} className="card-link">
            <article className="card">
              <div className="card__eyebrow">
                <span className="badge">第 {latest.episode} 期</span>
                <span className="meta">{formatDate(latest.date)}</span>
              </div>
              <h3 className="card__title">
                第 {latest.episode} 期 · {formatDate(latest.date)}
              </h3>
              <p className="card__themes">{themeLabels(latest)}</p>
              <ul className="card__stories">
                {latest.stories.map((s) => (
                  <li key={s.title}>《{s.title}》</li>
                ))}
              </ul>
            </article>
          </a>
        </section>
      )}

      <div className="note-box">
        <strong>会员功能即将上线。</strong>
        目前所有简报免费开放阅读。后续会加入会员专区（练习记录、更多示范等），敬请期待——暂时无需注册登录。
      </div>
    </>
  );
}

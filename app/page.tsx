import { getLatestEpisode, formatDate, themeLabels } from "@/lib/episodes";
import type { Metadata } from "next";
import AboutJing from "./_site/AboutJing";

export const metadata: Metadata = {
  title: { absolute: "你会说中文，不等于孩子能学会中文｜中文生命力 · 树儿学院 Tree Tree Academy" },
  description:
    "孩子听得懂中文，却总回英文？前高中语文老师、美国大学中文老师 Jing，带海外华裔和混血家庭先找到孩子卡在哪：词汇、信心还是习惯，再给你今晚就能试的第一步。免费 3 问自查。",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const latest = getLatestEpisode();

  return (
    <>
      <section className="hero lp-hero">
        <div className="section-label">中文生命力 · 海外家庭中文传承</div>
        <h1>你会说中文，不等于孩子能学会中文</h1>
        <p className="lead">
          孩子听得懂你的中文，回你的却是英文？多半不是孩子不肯说，而是卡在了三个地方之一：词汇、信心、习惯。
          先找到卡点，再做第一步——每天 15 分钟，用家里本来就有的时间。
        </p>
        <div className="cta-row">
          <a href="/start" className="btn btn--primary">免费做 3 问自查</a>
          <a href="/workshop" className="btn btn--ghost">直播工作坊（登记意向）</a>
        </div>
        <p className="meta"><a href="/en/start" lang="en">English: free 7-Day Starter Kit →</a></p>
      </section>

      <AboutJing short />

      <section>
        <h2>Tree Tree System：测 → 练 → 读</h2>
        <ol className="lp-steps">
          <li>
            <strong>测：找到卡点。</strong>
            3 个问题，3 分钟：词汇、信心、还是习惯。一个原因，一个第一步。
          </li>
          <li>
            <strong>练：每天 15 分钟。</strong>
            饭桌、车上、睡前——用家里已经有的时间。同一个例程，天天做，不用另外报班。
          </li>
          <li>
            <strong>读：按顺序来。</strong>
            听 → 说 → 拼音只是工具 → 汉字从部首开始 → 阅读。按孩子的程度排，不按年龄排。
          </li>
        </ol>
        <div className="cta-row">
          <a href="/start" className="btn btn--primary">从第一步开始：3 问自查</a>
        </div>
      </section>

      <section>
        <h2>练习园地</h2>
        <p>我们家自己在用的练习，先放在这里：</p>
        <ul className="lp-links">
          <li><a href="/xiaoqun">小群姐姐 · 听故事复述</a>：工作日故事简报，听后问题 + 成人示范稿。</li>
          <li><a href="/hanzi">汉字学习 · 午餐秘密游戏</a>：30 天汉字游戏，每天 3–4 个字。</li>
          <li><a href="/reader">树儿读读乐</a>：分级阅读练习（需登录）。</li>
        </ul>
      </section>

      {latest && (
        <section style={{ marginTop: "1.5rem" }}>
          <div className="section-label">小群姐姐 · 最新一期</div>
          <a href={`/xiaoqun/${latest.slug}`} className="card-link">
            <article className="card">
              <div className="card__eyebrow">
                <span className="badge">第 {latest.episode} 期</span>
                <span className="meta">{formatDate(latest.date)}</span>
              </div>
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
    </>
  );
}

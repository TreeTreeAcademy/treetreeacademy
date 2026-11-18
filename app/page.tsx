import type { Metadata } from "next";
import AboutJing from "./_site/AboutJing";
import KitBlock from "./_site/KitBlock";
import { Icon, StuckPoints, TreeSystem, DailyMoments } from "./_site/Visuals";
import { PHOTOS, asset } from "@/lib/site/assets";
import { WORKSHOP } from "@/lib/site/config";

export const metadata: Metadata = {
  title: { absolute: "你会说中文，不等于孩子能学会中文｜中文生命力 · 树儿学院 Tree Tree Academy" },
  description:
    "孩子听得懂中文，却总回英文？武汉重点高中前语文老师、美国俄亥俄州大学中文老师晶晶，带海外华裔和混合家庭先找到孩子卡在哪：词汇、信心还是习惯，再给你今晚就能试的第一步。免费 3 问自查。",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const hero = asset(PHOTOS.hero);
  const w = WORKSHOP;
  return (
    <div className="lp-page">
      {/* 1. Hero */}
      <section className="lp-band lp-band--hero">
        <div className="lp-wrap lp-hero2">
          <div className="lp-hero2__text">
            <p className="lp-eyebrow">中文生命力 · 海外家庭中文传承</p>
            <h1 className="lp-h1">你会说中文，<br />不等于孩子能学会中文</h1>
            <p className="lp-sub">
              我帮海外华裔和混合家庭的父母，找到孩子说中文卡在哪一步，再给你一套每天 15 分钟、用得起来的方法。
            </p>
            <div className="lp-ctas">
              <a href="/start" className="lp-btn lp-btn--primary">免费做 3 问自查</a>
              <a href="/workshop" className="lp-btn lp-btn--ghost">加入工作坊等候名单</a>
            </div>
            <p className="lp-small"><a href="/en/start" lang="en">English: free 7-Day Starter Kit →</a></p>
          </div>
          <div className="lp-hero2__photo">
            <div className="lp-hero2__disc" aria-hidden="true" />
            {hero && <img src={hero} alt="晶晶" width={573} height={640} fetchPriority="high" />}
          </div>
        </div>
      </section>

      {/* 1b. 7 天启动包（Kit） */}
      <KitBlock lang="zh" source="kit-home" />

      {/* 2. Pain → 不必这样 */}
      <section className="lp-band lp-band--green">
        <div className="lp-wrap lp-center">
          <p className="lp-big">孩子听得懂你的每一句中文，回你的却是英文？</p>
          <p className="lp-big lp-big--accent">但它不必这样。</p>
          <p>孩子不是不肯说，多半是卡在了这三处之一：</p>
          <StuckPoints />
        </div>
      </section>

      {/* 3. Start here: 3 steps */}
      <section className="lp-band">
        <div className="lp-wrap">
          <p className="lp-eyebrow lp-center">从这里开始</p>
          <h2 className="lp-h2 lp-center">三步，把中文带回家里的日常</h2>
          <div className="lp-grid3">
            <article className="lp-card2">
              <span className="vz-card__icon"><Icon.target /></span>
              <span className="lp-step">第 1 步</span>
              <h3>免费 3 问自查</h3>
              <p>3 个问题、3 分钟，拿到今晚就能试的第一步。</p>
              <a href="/start" className="lp-link">开始自查 →</a>
            </article>
            <article className="lp-card2">
              <span className="vz-card__icon"><Icon.clock /></span>
              <span className="lp-step">第 2 步</span>
              <h3>每天 15 分钟</h3>
              <p>用家里本来就有的时间，不用另外报班。</p>
              <a href="/start" className="lp-link">看 7 天怎么做 →</a>
            </article>
            <article className="lp-card2 lp-card2--feature">
              <span className="vz-card__icon"><Icon.chat /></span>
              <span className="lp-step">第 3 步</span>
              <h3>60 分钟直播工作坊</h3>
              <p>「{w.titleZh}」：现场诊断卡点、练饭桌 3 句话术、带走一周计划表。</p>
              <p className="lp-price">{w.price}</p>
              <a href="/workshop" className="lp-link">加入等候名单 →</a>
            </article>
          </div>
          <DailyMoments />
        </div>
      </section>

      {/* 4. About */}
      <section className="lp-band lp-band--white">
        <div className="lp-wrap">
          <AboutJing />
        </div>
      </section>

      {/* 5. Tree Tree System */}
      <section className="lp-band lp-band--cream">
        <div className="lp-wrap">
          <p className="lp-eyebrow lp-center">Tree Tree System</p>
          <h2 className="lp-h2 lp-center">测 → 练 → 读</h2>
          <TreeSystem />
                </div>
      </section>

      {/* 6. Members */}
      <section className="lp-band">
        <div className="lp-wrap">
          <p className="lp-eyebrow lp-center">会员练习园地</p>
          <h2 className="lp-h2 lp-center">我们家自己在用的练习</h2>
          <div className="lp-grid3">
            <a className="lp-card2 lp-card2--link" href="/xiaoqun"><h3>🔒 小群姐姐 · 听故事复述</h3><p>工作日故事简报：听后问题 + 成人示范稿。</p><span className="lp-link">登录查看 →</span></a>
            <a className="lp-card2 lp-card2--link" href="/hanzi"><h3>🔒 汉字学习 · 午餐秘密游戏</h3><p>30 天汉字游戏，每天 3–4 个字。</p><span className="lp-link">登录查看 →</span></a>
            <a className="lp-card2 lp-card2--link" href="/reader"><h3>🔒 树儿读读乐</h3><p>分级阅读练习：读原文、点单词、复习。</p><span className="lp-link">登录查看 →</span></a>
          </div>
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="lp-band lp-band--yellow">
        <div className="lp-wrap lp-narrow lp-center">
          <h2 className="lp-h2">先花 3 分钟，找到孩子的卡点</h2>
          <p>一个原因，一个第一步。就从今晚的饭桌开始。</p>
          <div className="lp-ctas lp-ctas--center">
            <a href="/start" className="lp-btn lp-btn--primary">免费做 3 问自查</a>
            <a href="/workshop" className="lp-btn lp-btn--ghost">工作坊等候名单</a>
          </div>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import SignupForm from "../_site/SignupForm";
import AboutJing from "../_site/AboutJing";
import { StuckPoints, WorkshopAgenda, DailyMoments, PullQuote } from "../_site/Visuals";
import { WORKSHOP } from "@/lib/site/config";
import { PHOTOS, asset } from "@/lib/site/assets";

export const metadata: Metadata = {
  title: { absolute: `${WORKSHOP.titleZh}｜60 分钟直播工作坊 · 树儿学院` },
  description: `孩子听得懂中文却不肯说？60 分钟直播工作坊（${WORKSHOP.price}）：现场诊断卡点、练饭桌 3 句话术、带走一张一周计划表。现在开放等候名单。`,
  alternates: { canonical: "/workshop", languages: { "zh-CN": "/workshop", en: "/en/workshop" } },
};

export default function WorkshopPage() {
  const w = WORKSHOP;
  const photo = asset(PHOTOS.workshop);
  return (
    <div className="lp-page">
      <section className="lp-band lp-band--hero">
        <div className="lp-wrap lp-hero2">
          <div className="lp-hero2__text">
            <p className="lp-small"><a href="/en/workshop" lang="en">English version →</a></p>
            <p className="lp-eyebrow">{w.durationMin} 分钟直播工作坊 · 测试期</p>
            <h1 className="lp-h1">{w.titleZh}</h1>
            <p className="lp-sub">先问你一个问题：你家孩子，是不是听得懂你说的每一句中文，回你的却全是英文？</p>
            <p className="lp-price lp-price--big">{w.price}</p>
            <div className="lp-ctas"><a href="#waitlist" className="lp-btn lp-btn--primary">加入等候名单 Join the waitlist</a></div>
          </div>
          <div className="lp-hero2__photo">
            <div className="lp-hero2__disc" aria-hidden="true" />
            {photo && <img src={photo} alt="晶晶" width={421} height={480} fetchPriority="high" />}
          </div>
        </div>
      </section>

      <section className="lp-band lp-band--white">
        <div className="lp-wrap lp-prose">
          <h2 className="lp-h2">这个画面，你熟不熟？</h2>
          <p>饭桌上，你用中文问：“今天在学校玩了什么？”孩子张口就是一串英文。</p>
          <p>你说：“说中文！”孩子憋出两个字，又换回英文。再催一遍，饭桌就冷了。</p>
          <p>周末中文学校报了，绘本买了，动画也放了。一到家里，还是说不起来。</p>
          <PullQuote>不是孩子不行，也不是你不够努力。</PullQuote>
        </div>
      </section>

      <section className="lp-band lp-band--green">
        <div className="lp-wrap lp-center">
          <h2 className="lp-h2">周末班一周 2 小时，管不了家里的另外 6 天</h2>
          <p className="lp-narrow" style={{ margin: "0 auto" }}>孩子会不会说中文，恰恰是在这 6 天里定下来的：</p>
          <DailyMoments />
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-wrap">
          <p className="lp-eyebrow lp-center">先找到卡点</p>
          <h2 className="lp-h2 lp-center">孩子不是不肯说，是卡在这三处之一</h2>
          <StuckPoints />
          <div className="lp-prose" style={{ margin: "40px auto 0" }}>
            <PullQuote by="晶晶">你会说中文，不等于孩子能学会中文。会说和会教，是两件事。</PullQuote>
          </div>
        </div>
      </section>

      <section className="lp-band lp-band--cream">
        <div className="lp-wrap">
          <p className="lp-eyebrow lp-center">这 {w.durationMin} 分钟讲什么</p>
          <h2 className="lp-h2 lp-center">不讲大道理，现场带你做三件事</h2>
          <WorkshopAgenda />
          <p className="lp-center lp-note">讲解 + 答疑，一共 {w.durationMin} 分钟。目标只有一个：你当天晚上就能开始。</p>
        </div>
      </section>

      <section className="lp-band lp-band--white">
        <div className="lp-wrap lp-prose lp-center">
          <h2 className="lp-h2">先问自己一个问题</h2>
          <p className="lp-big" style={{ color: "var(--color-forest)" }}>孩子回你英文的时候，你的下一句话是什么？</p>
          <p>如果你已经有答案，而且每天都在用，你可能不需要这场工作坊。</p>
          <p>如果答案是“再说一遍：说中文！”——这 {w.durationMin} 分钟，就是为你准备的。</p>
          <PullQuote>种一棵树，不是今天种下、明天就结果。中文也一样：要知道种在哪，先浇哪里。</PullQuote>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-wrap">
          <AboutJing />
        </div>
      </section>

      <section className="lp-band lp-band--green" id="waitlist">
        <div className="lp-wrap lp-cta2">
          <div>
            <p className="lp-eyebrow lp-eyebrow--light">现在开放等候名单</p>
            <h2 className="lp-h2">孩子的中文，从你的下一句话开始</h2>
            <p>测试期的工作坊，我想先认真带好第一批家庭。价格 <strong>{w.price}</strong>。留下邮箱，开放报名时我第一时间通知你。</p>
          </div>
          <div className="lp-waitlist">
            <SignupForm
              source="workshop-waitlist"
              button="加入等候名单 Join the waitlist"
              smallPrint="只用来通知工作坊开放报名，不发广告，随时可以退订。"
              success={<><p><strong>你已经在等候名单上了，谢谢你！</strong></p><p>开放报名时，我会第一时间发邮件通知你。</p><p>等的这几天，可以先 <a href="/start">免费领 7 天启动包 →</a></p></>}
            />
          </div>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-wrap lp-prose">
          <h2 className="lp-h2">你可能在担心的</h2>
          <dl className="lp-faq">
            <dt>我自己就会说中文，还需要人教吗？</dt>
            <dd>会说中文，和会把中文传给孩子，是两件事。工作坊不教你中文，教的是顺序：先做哪一步、每天做多少、孩子回英文时怎么接。</dd>
            <dt>{w.durationMin} 分钟够吗？</dt>
            <dd>{w.durationMin} 分钟不会让孩子变流利。它给你的是一个清楚的起点：孩子的卡点、几句能用的话术和一张一周计划表。</dd>
            <dt>我太忙了，每天 15 分钟也难。</dt>
            <dd>不用另外排时间。用家里本来就有的时间：饭桌、车上、睡前。</dd>
            <dt>有英文场吗？</dt>
            <dd>有。工作坊分中文场和英文场。这一场用中文讲；如果家里另一半不太会中文，或者你更习惯用英文听，可以<a href="/en/workshop" lang="en">加入英文场的等候名单</a>。</dd>
            <dt>加入等候名单要付钱吗？</dt>
            <dd>不用。等候名单只是留个邮箱，开放报名时我会通知你，到时候你再决定。</dd>
          </dl>
        </div>
      </section>
    </div>
  );
}

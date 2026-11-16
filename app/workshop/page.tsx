import type { Metadata } from "next";
import SignupForm from "../_site/SignupForm";
import AboutJing from "../_site/AboutJing";
import { WORKSHOP } from "@/lib/site/config";
import { PHOTOS, asset } from "@/lib/site/assets";

export const metadata: Metadata = {
  title: { absolute: `${WORKSHOP.titleZh}｜60 分钟直播工作坊 · 树儿学院` },
  description: `孩子听得懂中文却不肯说？60 分钟直播工作坊（${WORKSHOP.priceZh} / ${WORKSHOP.priceEn}）：现场做 3 问诊断、练饭桌 3 句话术、带走一张一周计划表。现在开放等候名单。`,
  alternates: { canonical: "/workshop" },
};

function Waitlist({ id }: { id?: string }) {
  return (
    <div className="lp-waitlist" id={id}>
      <SignupForm
        source="workshop-waitlist"
        button="加入等候名单 Join the waitlist"
        smallPrint="只用来通知工作坊开放报名，不发广告，随时可以退订。"
        success={
          <>
            <p><strong>你已经在等候名单上了，谢谢你！</strong></p>
            <p>开放报名时，我会第一时间发邮件通知你。</p>
            <p>等的这几天，可以先 <a href="/start">花 3 分钟做个自查 →</a></p>
          </>
        }
      />
    </div>
  );
}

export default function WorkshopPage() {
  const w = WORKSHOP;
  const photo = asset(PHOTOS.workshop);
  return (
    <div className="lp-page">
      {/* Hook */}
      <section className="lp-band lp-band--hero">
        <div className="lp-wrap lp-hero2">
          <div className="lp-hero2__text">
            <p className="lp-eyebrow">{w.durationMin} 分钟直播工作坊 · 测试期</p>
            <h1 className="lp-h1">{w.titleZh}</h1>
            <p className="lp-sub">
              先问你一个问题：你家孩子，是不是听得懂你说的每一句中文，回你的却全是英文？
            </p>
            <p className="lp-price lp-price--big">{w.priceZh} <span>/ {w.priceEn}</span></p>
            <div className="lp-ctas">
              <a href="#waitlist" className="lp-btn lp-btn--primary">加入等候名单 Join the waitlist</a>
            </div>
          </div>
          <div className="lp-hero2__photo">
            <div className="lp-hero2__disc" aria-hidden="true" />
            {photo && <img src={photo} alt="晶晶" width={421} height={480} fetchPriority="high" />}
          </div>
        </div>
      </section>

      <article className="lp-band lp-band--white">
        <div className="lp-wrap lp-prose">
          {/* Pain */}
          <h2 className="lp-h2">这个画面，你熟不熟？</h2>
          <p>晚饭桌上，你用中文问：“今天在学校玩了什么？”</p>
          <p>孩子张口就是一串英文。</p>
          <p>你说：“说中文！”孩子愣一下，憋出两个字，又换回英文。你再催一遍，饭桌就冷了。</p>
          <p>你也想过办法：周末中文学校报了，绘本买了，动画也放了。可是一到家里，中文还是说不起来。</p>
          <p className="lp-pull">问题出在哪？不是孩子不行，也不是你不够努力。</p>

          {/* Reframe */}
          <h2 className="lp-h2">市面上不缺中文课，缺的是家里那 6 天</h2>
          <p>周末中文学校一周 2 小时，很好。但它管不了家里的另外 6 天。</p>
          <p>而孩子会不会说中文，恰恰是在这 6 天里定下来的：饭桌上那一句接不接得住，车上那十分钟用不用得上，睡前那个故事讲不讲中文。</p>
          <p>所以我常说一句话：</p>
          <p className="lp-pull">你会说中文，不等于孩子能学会中文。</p>
          <p>会说，和会教，是两件事。</p>

          {/* Turning point: her story */}
          <h2 className="lp-h2">我为什么敢这么说</h2>
          <p>
            我在武汉一所重点高中教过语文，后来在俄亥俄州的一所大学教美国大学生中文，之后一直教在美国长大的孩子，从零基础到中高级。
          </p>
          <p>
            这些年，我一次次看到一门语言在一个人身上从无到有、从有到好。我越来越确定：孩子学不会中文，很少是因为孩子不行，更多是因为家里缺少一套每天都能用起来的方法。
          </p>
          <p>现在我自己也是两个双语孩子的妈妈。课堂上用过的方法，我在自己家里又验证了一遍。</p>

          {/* Self-question */}
          <h2 className="lp-h2">先问自己一个问题</h2>
          <p>孩子回你英文的时候，你的下一句话是什么？</p>
          <p>如果你已经有答案，而且每天都在用，那你可能不需要这场工作坊。</p>
          <p>如果你的答案是“再说一遍：说中文！”——那这 {w.durationMin} 分钟，就是为你准备的。</p>

          {/* Tree metaphor */}
          <p className="lp-pull">种一棵树，不是今天种下，明天就结果。中文也一样。</p>
          <p>
            但你得知道：种在哪，先浇哪里，力气用在哪一步。树儿学院这个名字，就是从这里来的。
          </p>
        </div>
      </article>

      {/* What you get */}
      <section className="lp-band lp-band--cream">
        <div className="lp-wrap">
          <p className="lp-eyebrow lp-center">这 {w.durationMin} 分钟讲什么</p>
          <h2 className="lp-h2 lp-center">不讲大道理，现场带你做三件事</h2>
          <div className="lp-grid3">
            <div className="lp-pillar"><span className="lp-pillar__n">1</span><h3>3 问诊断</h3><p>现场一起做，看清你家孩子卡在词汇、信心，还是习惯，定下第一步。</p></div>
            <div className="lp-pillar"><span className="lp-pillar__n">2</span><h3>饭桌 3 句话术</h3><p>孩子回英文时，你怎么把话接回中文——不靠催，靠接。现场练。</p></div>
            <div className="lp-pillar"><span className="lp-pillar__n">3</span><h3>一周计划表</h3><p>每天 15 分钟，排进饭桌、车上、睡前。你离开时手里就有一张写好的计划表。</p></div>
          </div>
          <p className="lp-center lp-note">讲解 + 答疑，一共 {w.durationMin} 分钟。我的目标只有一个：你当天晚上就能开始。</p>
        </div>
      </section>

      {/* About + classroom photos */}
      <section className="lp-band lp-band--white">
        <div className="lp-wrap">
          <AboutJing />
        </div>
      </section>

      {/* CTA */}
      <section className="lp-band lp-band--green" id="waitlist">
        <div className="lp-wrap lp-cta2">
          <div>
            <p className="lp-eyebrow lp-eyebrow--light">现在开放等候名单</p>
            <h2 className="lp-h2">孩子的中文，从你的下一句话开始</h2>
            <p>
              这是一场测试期的工作坊，我想先认真带好第一批家庭。价格 <strong>{w.priceZh} / {w.priceEn}</strong>。
              留下邮箱加入等候名单，开放报名时我第一时间通知你。
            </p>
          </div>
          <Waitlist />
        </div>
      </section>

      {/* Fears */}
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
            <dt>加入等候名单要付钱吗？</dt>
            <dd>不用。等候名单只是留个邮箱，开放报名时我会通知你，到时候你再决定。</dd>
          </dl>
        </div>
      </section>
    </div>
  );
}

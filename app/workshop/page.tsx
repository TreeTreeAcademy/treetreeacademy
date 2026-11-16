import type { Metadata } from "next";
import SignupForm from "../_site/SignupForm";
import AboutJing from "../_site/AboutJing";
import Placeholder from "../_site/Placeholder";
import { WORKSHOP } from "@/lib/site/config";
import { PHOTOS } from "@/lib/site/assets";

export const metadata: Metadata = {
  title: { absolute: `${WORKSHOP.titleZh}｜60 分钟直播工作坊 · 树儿学院` },
  description:
    "孩子听得懂中文却不肯说？60 分钟直播工作坊：现场做 3 问诊断、练饭桌 3 句话术、排好一周计划表。测试期只收 30 个家庭。",
  alternates: { canonical: "/workshop" },
};

export default function WorkshopPage() {
  const w = WORKSHOP;
  return (
    <>
      <section className="hero lp-hero">
        <div className="section-label">直播工作坊 · 测试中 · 只收 {w.seats} 个家庭</div>
        <h1>{w.titleZh}</h1>
        <p className="lead">{w.durationMin} 分钟讲解 + 答疑。不讲大道理，现场带你做一遍。</p>
        <a href="#signup" className="btn btn--primary">登记意向（不收费）</a>
      </section>

      <section>
        <h2>想象一下，如果你……</h2>
        <ul className="lp-imagine">
          <li>清楚知道孩子为什么不接你的中文话；</li>
          <li>知道孩子卡在三个地方里的哪一个：词汇、信心，还是习惯；</li>
          <li>晚饭桌上有几句现成的话可以说，不用再喊“说中文！”；</li>
          <li>孩子回你英文的时候，你不慌，知道怎么把话接回中文；</li>
          <li>手里有一张一周计划表，每天 15 分钟，不用另外报班。</li>
        </ul>
        <p>这就是这 {w.durationMin} 分钟要帮你做到的。</p>
      </section>

      <section>
        <h2>你会带走的三样东西（现场做）</h2>
        <ol className="lp-steps">
          <li><strong>3 问诊断：</strong>现场一起做，定下你家孩子的卡点和第一步。</li>
          <li><strong>饭桌 3 句话术：</strong>孩子回英文时怎么接，现场练。</li>
          <li><strong>一周计划表：</strong>每天 15 分钟，排进你家已经有的时间——饭桌、车上、睡前。</li>
        </ol>
        <p className="meta">以上都包含在工作坊里，不单独出售。</p>
      </section>

      <section className="lp-two">
        <div className="lp-box">
          <h3>适合你，如果……</h3>
          <ul>
            <li>孩子听得懂你的中文，回你的却是英文；</li>
            <li>你自己会说中文，但不知道该先做哪一步；</li>
            <li>报了周末中文班，家里还是说不起来；</li>
            <li>每天能拿出 15 分钟，在家里试。</li>
          </ul>
        </div>
        <div className="lp-box">
          <h3>不适合你，如果……</h3>
          <ul>
            <li>希望有人替你每周上课，家长自己不参与；</li>
            <li>期待 {w.durationMin} 分钟后孩子就能说流利；</li>
            <li>只想收一份资料，不打算回家试。</li>
          </ul>
        </div>
      </section>

      <AboutJing photo={PHOTOS.workshop} />

      <section className="lp-box lp-offer" id="signup">
        <h2>时间和报名</h2>
        <ul className="lp-facts">
          <li><strong>形式：</strong>{w.durationMin} 分钟直播，讲解 + 答疑</li>
          <li><strong>名额：</strong>测试期只收 {w.seats} 个家庭</li>
          <li><strong>测试价：</strong>{w.priceZh}</li>
          <li><strong>时间：</strong>{w.dateText ?? <Placeholder>日期 + 时间（美国 / 中国时间）</Placeholder>}</li>
          <li><strong>平台：</strong>{w.platformText ?? <Placeholder>直播平台</Placeholder>}</li>
        </ul>
        <p>
          说实话：我在测试这个工作坊，只收 {w.seats} 个家庭，结束后按大家的反馈调整。
          现在登记<strong>不收费</strong>，时间定下来后我会先通知已登记的家庭，再决定要不要报名。
        </p>
        <SignupForm
          source="workshop"
          button="登记意向，开放报名时通知我"
          smallPrint="只用来通知工作坊时间，不会发广告，随时可以退订。"
          showWechat
          success={
            <>
              <p><strong>登记好了，谢谢你！</strong></p>
              <p>工作坊时间确定后，我会先通知你。</p>
              <p>还没做自查？<a href="/start">先花 3 分钟找到孩子的卡点 →</a></p>
            </>
          }
        />
      </section>

      <section>
        <h2>你可能在担心的</h2>
        <dl className="lp-faq">
          <dt>我自己就会说中文，还需要人教吗？</dt>
          <dd>会说中文，和会把中文传给孩子，是两件事。工作坊不教你中文，教的是顺序：先做哪一步、每天做多少、孩子回英文时怎么接。</dd>
          <dt>已经上周末中文学校了，还不够吗？</dt>
          <dd>周末 2 小时的课很好，但解决不了家里的其他 6 天。工作坊给的，就是课外那 6 天怎么安排：一张一周计划表。</dd>
          <dt>{w.durationMin} 分钟够吗？</dt>
          <dd>{w.durationMin} 分钟不会让孩子变流利。目标只有一个：你带着孩子的卡点、几句话术和一周计划离开，当天晚上就能开始。</dd>
          <dt>我太忙了，每天 15 分钟也难。</dt>
          <dd>不用另外排时间。用家里本来就有的时间：饭桌、车上、睡前。</dd>
          <dt>孩子多大合适？</dt>
          <dd><Placeholder>适合的年龄 / 程度范围</Placeholder></dd>
          <dt>家里只有一位家长说中文（混合家庭）可以吗？</dt>
          <dd><Placeholder>你的回答：说中文的家长来上课；不说中文的那位怎么配合</Placeholder></dd>
          <dt>错过直播怎么办？有回放吗？</dt>
          <dd><Placeholder>是否提供回放</Placeholder></dd>
          <dt>可以退款吗？</dt>
          <dd><Placeholder>退款规则</Placeholder></dd>
        </dl>
      </section>
    </>
  );
}

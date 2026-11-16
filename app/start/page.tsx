import type { Metadata } from "next";
import StartFlow from "../_site/StartFlow";
import AboutJing from "../_site/AboutJing";

export const metadata: Metadata = {
  title: { absolute: "孩子听得懂中文却不说？3 问免费自查｜树儿学院" },
  description:
    "孩子不是不肯说中文，是卡在词汇、信心、习惯其中一个。3 个问题、3 分钟，找到卡点和今晚就能试的第一步。海外华裔和混血家庭适用，免费。",
  alternates: { canonical: "/start", languages: { "zh-CN": "/start", en: "/en/start" } },
};

const DAYS = [
  ["第 1 天", "找到卡点", "3 问自查：词汇、信心，还是习惯。3 分钟。"],
  ["第 2 天", "15 分钟例程", "听一段、跟说一句、问 3 个问题。每天同一个例程。"],
  ["第 3 天", "5 句话，把英文回答接回中文", "别再说“说中文！”，给孩子一句能接的话。"],
  ["第 4 天", "看动画的正确方法", "用 3 条标准选片，先听，跟说 3 个词，明天再用一个。"],
  ["第 5 天", "10 个字，不是 50 个", "先部首，再词。每个字里都藏着一幅画。"],
  ["第 6 天", "一个场景，10 个词", "晚饭或早上，选一个。一周都用同样的 10 个词。"],
  ["第 7 天", "一页纸的一周计划", "下周照着同一个计划做，只换一个词，不换整个计划。"],
];

export default function StartPage() {
  return (
    <>
      <p className="meta lp-lang"><a href="/en/start" lang="en">English version →</a></p>
      <section className="hero lp-hero">
        <div className="section-label">免费 · 3 分钟</div>
        <h1>你会说中文，不等于孩子能学会中文</h1>
        <p className="lead">
          孩子不是不肯说中文，是卡在了词汇、信心、习惯其中一个地方。先用 3 个问题找到卡点，再做今晚就能试的第一步。
        </p>
      </section>

      <StartFlow
        lang="zh"
        form={{
          title: "领取中文版 7 天启动包",
          source: "start",
          button: "免费领取",
          smallPrint: "免费，不用绑卡，随时可以退订。",
          showWechat: true,
          success: (
            <>
              <p><strong>收到了，谢谢你！</strong></p>
              <p>中文版 7 天启动包整理好后，会第一时间发到你的邮箱。</p>
            </>
          ),
        }}
      />

      <section>
        <h2>7 天启动包里有什么</h2>
        <p className="meta">每天 15 分钟，用家里本来就有的时间：饭桌、车上、睡前。不用另外报班，每天一小步。（中文版整理中）</p>
        <ul className="lp-days">
          {DAYS.map(([d, t, s]) => (
            <li key={d}><span className="badge">{d}</span> <strong>{t}</strong><br />{s}</li>
          ))}
        </ul>
      </section>

      <AboutJing short />

      <section>
        <h2>常见问题</h2>
        <dl className="lp-faq">
          <dt>真的免费吗？</dt>
          <dd>是的。自查表和 7 天启动包都免费，不用绑卡。</dd>
          <dt>漏了一天怎么办？</dt>
          <dd>只做今天的就好，不要两天的一起补。</dd>
          <dt>做完自查，下一步是什么？</dt>
          <dd>
            自查和启动包是开始，不是全部。下一步是 60 分钟的直播工作坊：现场帮你定孩子的卡点和第一步。
            <a href="/workshop">看看工作坊 →</a>
          </dd>
        </dl>
      </section>
    </>
  );
}

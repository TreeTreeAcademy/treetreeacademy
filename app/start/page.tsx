import type { Metadata } from "next";
import SignupForm from "../_site/SignupForm";
import { WeekTimeline } from "../_site/Visuals";
import { PHOTOS, asset } from "@/lib/site/assets";

// 文案：Jing 的 /start 中文版文案底稿（2026-11-18）。领取方式：邮箱（经 Kit 发送 PDF），不走微信。
export const metadata: Metadata = {
  title: { absolute: "免费领 7 天中文启动包：每天 15 分钟｜树儿学院" },
  description:
    "你会说中文，不等于孩子能学会中文。7 天，每天 15 分钟，不用报班——就在吃饭、坐车、睡前。用邮箱免费领启动包。",
  alternates: { canonical: "/start", languages: { "zh-CN": "/start", en: "/en/start" } },
};

export default function StartPage() {
  const photo = asset(PHOTOS.welcome);
  const about = asset(PHOTOS.about);
  return (
    <div className="lp-page">
      <section className="lp-band lp-band--hero">
        <div className="lp-wrap lp-hero2">
          <div className="lp-hero2__text">
            <p className="lp-small"><a href="/en/start" lang="en">English version →</a></p>
            <p className="lp-eyebrow">免费 · 7 天中文启动包</p>
            <h1 className="lp-h1 lp-h1--md">你会说中文，不等于孩子能学会中文。</h1>
            <p className="lp-sub">7 天，每天 15 分钟。不用报班，不用另外找时间——就在吃饭、坐车、睡前，家里本来就有的时间里。</p>
            <div className="lp-ctas"><a href="#form" className="lp-btn lp-btn--primary">免费领取</a></div>
          </div>
          <div className="lp-hero2__photo">
            <div className="lp-hero2__disc" aria-hidden="true" />
            {photo && <img src={photo} alt="" width={480} height={371} fetchPriority="high" />}
          </div>
        </div>
      </section>
      <div className="lp-wrap lp-body">
        <section>
          <h2>7 天</h2>
          <WeekTimeline lang="zh" />
        </section>

        <section className="lp-box st-form" id="form">
          <h2>免费领 7 天中文启动包</h2>
          <SignupForm
            lang="zh"
            kit
            source="start"
            button="发给我"
            smallPrint="免费。不用留卡。随时可以退订。"
            success={<p><strong>请去邮箱点一下确认邮件，资料会发到你的邮箱。</strong></p>}
          />
        </section>

        <section>
          <h2>领到之后会发生什么</h2>
          <ol>
            <li>你会收到一封确认邮件。点一下里面的确认链接，7 页的启动包就能下载，打印出来或存在手机上都行。</li>
            <li>链接留在你的邮箱里，不会丢。</li>
            <li>7 天后，训练营报名开了会告诉你——先把这 7 天走完。</li>
          </ol>
        </section>

        <section>
          <h2>关于晶晶</h2>
          <div className="st-about">
            {about && <img src={about} alt="晶晶" width={96} height={96} loading="lazy" />}
            <p>我是晶晶。在中国教过高中语文，后来在美国大学教中文。现在在美国带两个孩子，两个都中英文流利——我把家里真正在用的这套方法，一天一个真实场景，分享给你。 <a href="/#about">读我的完整故事 →</a></p>
          </div>
        </section>

        <section>
          <h2>常见问题</h2>
          <dl className="lp-faq">
            <dt>真的免费吗？</dt>
            <dd>是的。启动包和 7 天内容都免费。</dd>
            <dt>我不会教孩子中文怎么办？</dt>
            <dd>启动包是中文写的，示范句都带拼音，你先慢速说一遍，再正常说一遍就行。</dd>
            <dt>漏了一天怎么办？</dt>
            <dd>只做当天那天的，别一次补两天。</dd>
          </dl>
        </section>

        <p className="st-next">这只是开始，不是整套系统。下一步是&ldquo;让孩子多说中文&rdquo;训练营：4 周，每周一步，有直播带着练。报名开了，训练营页上有详情。</p>
      </div>
    </div>
  );
}

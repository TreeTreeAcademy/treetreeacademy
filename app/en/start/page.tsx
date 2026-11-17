import type { Metadata } from "next";
import StartFlow from "../../_site/StartFlow";
import { WeekTimeline } from "../../_site/Visuals";
import Placeholder from "../../_site/Placeholder";
import AboutJing from "../../_site/AboutJing";
import { PHOTOS, asset } from "@/lib/site/assets";
import { STARTER_KIT_PDF } from "@/lib/site/config";

export const metadata: Metadata = {
  title: { absolute: "Your child understands Mandarin but answers in English? Free 7-Day Starter Kit | Tree Tree Academy" },
  description:
    "7 days, 15 minutes a day, at a time your family already has. Start with a 3-question check: vocabulary, confidence, or habit. Free, from Jing: former high-school Chinese teacher in Wuhan, Chinese teacher at an Ohio university, raising two bilingual kids.",
  alternates: { canonical: "/en/start", languages: { "zh-CN": "/start", en: "/en/start" } },
};


export default function EnStartPage() {
  const photo = asset(PHOTOS.welcome);
  return (
    <div lang="en" className="lp-page">
      <section className="lp-band lp-band--hero">
        <div className="lp-wrap lp-hero2">
          <div className="lp-hero2__text">
            <p className="lp-small"><a href="/start" lang="zh-CN">中文版 →</a></p>
            <p className="lp-eyebrow">Free 7-Day Starter Kit</p>
            <h1 className="lp-h1 lp-h1--md">Your child understands everything you say in Mandarin. But they answer in English.</h1>
            <p className="lp-sub">7 days. 15 minutes a day. At a time your family already has — dinner, the car, bedtime. No extra lessons. One small step a day.</p>
            <div className="lp-ctas"><a href="#check" className="lp-btn lp-btn--primary">{"Take the 3-question check"}</a></div>
          </div>
          <div className="lp-hero2__photo">
            <div className="lp-hero2__disc" aria-hidden="true" />
            {photo && <img src={photo} alt="" width={480} height={371} fetchPriority="high" />}
          </div>
        </div>
      </section>
      <div className="lp-wrap lp-body">
      <section>
        <h2>The 7 days</h2>
        <WeekTimeline lang="en" />
      </section>

      <div className="lp-startgrid">
      <StartFlow
        lang="en"
        form={{
          title: "Get the free 7-Day Starter Kit",
          source: "start-en",
          button: "Send me the kit",
          smallPrint: "Free. No card needed. Unsubscribe anytime.",
          success: STARTER_KIT_PDF ? (
            <>
              <p><strong>Here&apos;s your kit.</strong></p>
              <p><a className="btn btn--primary" href={STARTER_KIT_PDF} download>Download the 7-Day Starter Kit (PDF)</a></p>
            </>
          ) : (
            <>
              <p><strong>Thank you — you&apos;re on the list.</strong></p>
              <p>The kit is on its way to your inbox.</p>
            </>
          ),
        }}
      />
      </div>

      <section>
        <h2>What happens after you sign up</h2>
        <ol>
          <li>Download the kit right away — 7 pages, print it or keep it on your phone.</li>
          <li>The same link arrives in your email, so you never lose it.</li>
          <li>For the next 7 days, one short email a day: that day&apos;s step, nothing more.</li>
        </ol>
        <p><Placeholder>these 3 steps only become true once the kit PDF is uploaded and an email service is connected</Placeholder></p>
      </section>

      <AboutJing lang="en" strip />

      <section>
        <h2>FAQ</h2>
        <dl className="lp-faq">
          <dt>Is it really free?</dt>
          <dd>Yes. The kit, the check, and the 7 emails are free.</dd>
          <dt>Do I need to speak Mandarin?</dt>
          <dd>The kit is written in English. The Chinese lines are demo sentences with pinyin — you say them slowly once, then at normal speed once.</dd>
          <dt>What if we miss a day?</dt>
          <dd>Do today only. Do not do two days at once.</dd>
        </dl>
        <p className="meta">
          This kit is the start, not the whole system. The next step is a 60-minute live workshop:{" "}
          <a href="/en/workshop">Your kid understands Chinese but answers in English — here&apos;s your first step →</a>
        </p>
      </section>
    </div>
    </div>
  );
}

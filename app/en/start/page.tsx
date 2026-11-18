import type { Metadata } from "next";
import StartFlow from "../../_site/StartFlow";
import { WeekTimeline } from "../../_site/Visuals";
import { PHOTOS, asset } from "@/lib/site/assets";

// Copy: Jing's /start page copy doc (EN). The kit PDF is delivered by Kit email only — no public download.
export const metadata: Metadata = {
  title: { absolute: "Your child understands Mandarin but answers in English? Free 7-Day Starter Kit | Tree Tree Academy" },
  description:
    "7 days. 15 minutes a day. At a time your family already has — dinner, the car, bedtime. Start with the free 3-question check, then get the 7-Day Starter Kit by email.",
  alternates: { canonical: "/en/start", languages: { "zh-CN": "/start", en: "/en/start" } },
};

export default function EnStartPage() {
  const photo = asset(PHOTOS.welcome);
  const about = asset(PHOTOS.about);
  return (
    <div lang="en" className="lp-page">
      <section className="lp-band lp-band--hero">
        <div className="lp-wrap lp-hero2">
          <div className="lp-hero2__text">
            <p className="lp-small"><a href="/start" lang="zh-CN">中文版 →</a></p>
            <p className="lp-eyebrow">Free 7-Day Starter Kit</p>
            <h1 className="lp-h1 lp-h1--md">Your child understands everything you say in Mandarin. But they answer in English.</h1>
            <p className="lp-sub">7 days. 15 minutes a day. At a time your family already has — dinner, the car, bedtime. No extra lessons. One small step a day.</p>
            <div className="lp-ctas"><a href="#check" className="lp-btn lp-btn--primary">Take the 3-question check</a></div>
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
              success: <p><strong>Check your inbox and click the confirmation link — the kit will come to you by email.</strong></p>,
            }}
          />
        </div>

        <section>
          <h2>What happens after you sign up</h2>
          <ol>
            <li>Click the confirmation link in your inbox, and the kit arrives by email — 7 pages, print it or keep it on your phone.</li>
            <li>It stays in your email, so you never lose it.</li>
            <li>For the next 7 days, one short email a day: that day&apos;s step, nothing more.</li>
          </ol>
        </section>

        <section>
          <h2>About Jing</h2>
          <div className="st-about">
            {about && <img src={about} alt="Jing" width={96} height={96} loading="lazy" />}
            <p>I&apos;m Jing — like jingle bell. I taught Chinese at a high school in China and then Mandarin at a university in the US. Now I&apos;m raising two bilingual kids, both fluent in English and Chinese — and I&apos;m sharing the system that works at home, one real moment at a time. <a href="/en/workshop#about">Read my full story →</a></p>
          </div>
        </section>

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
        </section>

        <p className="st-next">This kit is the start, not the whole system. The next step is the Speak More Mandarin at Home camp: 4 weeks, one step a week, with live coaching. Details are on the camp page when enrollment opens.</p>
      </div>
    </div>
  );
}

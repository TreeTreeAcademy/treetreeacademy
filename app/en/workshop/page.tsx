import type { Metadata } from "next";
import SignupForm from "../../_site/SignupForm";
import KitBlock from "../../_site/KitBlock";
import AboutJing from "../../_site/AboutJing";
import { StuckPoints, WorkshopAgenda, DailyMoments, PullQuote } from "../../_site/Visuals";
import { WORKSHOP } from "@/lib/site/config";
import { PHOTOS, asset } from "@/lib/site/assets";

export const metadata: Metadata = {
  title: { absolute: "Your Kid Understands Chinese but Answers in English? A 60-Minute Live Workshop | Tree Tree Academy" },
  description: `A ${WORKSHOP.price}, 60-minute live workshop for heritage-Chinese and mixed-heritage families: find where your child is stuck, learn 3 phrases that turn English answers back into Chinese, and leave with a one-week plan. Join the waitlist.`,
  alternates: { canonical: "/en/workshop", languages: { "zh-CN": "/workshop", en: "/en/workshop" } },
};

export default function EnWorkshopPage() {
  const w = WORKSHOP;
  const photo = asset(PHOTOS.workshop);
  return (
    <div className="lp-page">
      <section className="lp-band lp-band--hero">
        <div className="lp-wrap lp-hero2">
          <div className="lp-hero2__text">
            <p className="lp-small"><a href="/workshop" lang="zh-CN">中文版 →</a></p>
            <p className="lp-eyebrow">Live online workshop · {w.durationMin} minutes</p>
            <h1 className="lp-h1 lp-h1--md">Your kid understands Chinese but answers in English?</h1>
            <p className="lp-sub">In one hour, find out where your child is stuck — and leave with a simple one-week plan to get them speaking Chinese at home.</p>
            <p className="lp-price lp-price--big">{w.price}</p>
            <div className="lp-ctas"><a href="#waitlist" className="lp-btn lp-btn--primary">Join the waitlist</a></div>
          </div>
          <div className="lp-hero2__photo">
            <div className="lp-hero2__disc" aria-hidden="true" />
            {photo && <img src={photo} alt="Jing" width={421} height={480} fetchPriority="high" />}
          </div>
        </div>
      </section>

      <KitBlock lang="en" source="kit-workshop-en" />

      <section className="lp-band lp-band--white">
        <div className="lp-wrap lp-prose">
          <h2 className="lp-h2">Sound familiar?</h2>
          <p>You ask a question in Chinese at dinner. Your child answers in English.</p>
          <p>You say, &quot;In Chinese, please.&quot; You get two words, then they slide right back into English.</p>
          <p>Maybe you&apos;ve tried weekend Chinese school, picture books, cartoons in Mandarin. Or maybe you don&apos;t speak much Chinese yourself and aren&apos;t sure where to begin.</p>
          <PullQuote>This isn&apos;t a failure — not yours, and not your child&apos;s.</PullQuote>
        </div>
      </section>

      <section className="lp-band lp-band--green">
        <div className="lp-wrap lp-center">
          <h2 className="lp-h2">A weekend class covers two hours. Speaking happens in the other six days.</h2>
          <p className="lp-narrow" style={{ margin: "0 auto" }}>Chinese doesn&apos;t need more of your time. It needs a small, steady spot in the day you already have:</p>
          <DailyMoments lang="en" />
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-wrap">
          <p className="lp-eyebrow lp-center">Here&apos;s what usually gets missed</p>
          <h2 className="lp-h2 lp-center">Kids who understand but won&apos;t speak are usually stuck in one of three places</h2>
          <StuckPoints lang="en" />
          <div className="lp-prose" style={{ margin: "40px auto 0" }}>
            <PullQuote>You don&apos;t need more effort. You need the right first step, and a routine you can keep.</PullQuote>
          </div>
        </div>
      </section>

      <section className="lp-band lp-band--cream">
        <div className="lp-wrap">
          <p className="lp-eyebrow lp-center">What we&apos;ll cover live</p>
          <h2 className="lp-h2 lp-center">60 minutes, three things, done together</h2>
          <WorkshopAgenda lang="en" />
          <p className="lp-center lp-note">Teaching plus live Q&amp;A, {w.durationMin} minutes in total. The goal: you can start the same evening.</p>
        </div>
      </section>

      <section className="lp-band lp-band--white">
        <div className="lp-wrap">
          <AboutJing lang="en" />
        </div>
      </section>

      <section className="lp-band lp-band--green" id="waitlist">
        <div className="lp-wrap lp-cta2">
          <div>
            <p className="lp-eyebrow lp-eyebrow--light">The waitlist is open</p>
            <h2 className="lp-h2">Get your child speaking Chinese at home, one small step at a time</h2>
            <p>The workshop is <strong>{w.price}</strong>. Join the waitlist and you&apos;ll be the first to know when registration opens. No payment now.</p>
          </div>
          <div className="lp-waitlist">
            <SignupForm
              lang="en"
              source="workshop-waitlist-en"
              button="Join the waitlist"
              smallPrint="We'll only email you about the workshop. Unsubscribe anytime."
              success={<><p><strong>You&apos;re on the waitlist. Thank you!</strong></p><p>You&apos;ll be the first to hear when registration opens.</p><p>In the meantime, <a href="/en/start">get the free 7-Day Starter Kit →</a></p></>}
            />
          </div>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-wrap lp-prose">
          <h2 className="lp-h2">Questions parents ask</h2>
          <dl className="lp-faq">
            <dt>I don&apos;t speak much Chinese. Is this still for me?</dt>
            <dd>Yes. Everything is explained in English, and the Chinese phrases come as short demo sentences with pinyin, so you can use them even if Chinese isn&apos;t your strongest language.</dd>
            <dt>Is there a Chinese-language session?</dt>
            <dd>Yes. This session is taught in English. Prefer Chinese? There&apos;s a separate Chinese-language session — <a href="/workshop" lang="zh-CN">join that waitlist here</a>.</dd>
            <dt>I speak Chinese fluently. Why would I need this?</dt>
            <dd>Speaking a language and passing it on are two different skills. This hour isn&apos;t about your Chinese. It&apos;s about the order of steps: what to do first, how much each day, and what to say when your child answers in English.</dd>
            <dt>Is 60 minutes really enough?</dt>
            <dd>It won&apos;t make your child fluent in an hour. It gives you a clear starting point: where your child is stuck, a few phrases that work, and a plan for the first week.</dd>
            <dt>We&apos;re busy. Will this add more to our schedule?</dt>
            <dd>No extra lessons. The plan uses time you already have: dinner, the car, bedtime.</dd>
            <dt>Does joining the waitlist cost anything?</dt>
            <dd>No. It&apos;s just your email. When registration opens, you decide then.</dd>
          </dl>
        </div>
      </section>
    </div>
  );
}

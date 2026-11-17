import type { Metadata } from "next";
import SignupForm from "../../_site/SignupForm";
import AboutJing from "../../_site/AboutJing";
import { WORKSHOP } from "@/lib/site/config";
import { PHOTOS, asset } from "@/lib/site/assets";

export const metadata: Metadata = {
  title: { absolute: "Your Kid Understands Chinese but Answers in English? A 60-Minute Live Workshop | Tree Tree Academy" },
  description: `A ${WORKSHOP.price}, 60-minute live workshop for heritage-Chinese and mixed-heritage families: find where your child is stuck, learn 3 phrases that turn English answers back into Chinese, and leave with a one-week plan. Join the waitlist.`,
  alternates: { canonical: "/en/workshop", languages: { "zh-CN": "/workshop", en: "/en/workshop" } },
};

function Waitlist() {
  return (
    <div className="lp-waitlist">
      <SignupForm
        lang="en"
        source="workshop-waitlist-en"
        button="Join the waitlist"
        smallPrint="We'll only email you about the workshop. Unsubscribe anytime."
        success={
          <>
            <p><strong>You&apos;re on the waitlist. Thank you!</strong></p>
            <p>You&apos;ll be the first to hear when registration opens.</p>
            <p>In the meantime, <a href="/en/start">take the free 3-minute check →</a></p>
          </>
        }
      />
    </div>
  );
}

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
            <p className="lp-sub">
              In one hour, find out where your child is stuck — and leave with a simple one-week plan to get them speaking Chinese at home.
            </p>
            <p className="lp-price lp-price--big">{w.price}</p>
            <div className="lp-ctas">
              <a href="#waitlist" className="lp-btn lp-btn--primary">Join the waitlist</a>
            </div>
          </div>
          <div className="lp-hero2__photo">
            <div className="lp-hero2__disc" aria-hidden="true" />
            {photo && <img src={photo} alt="Jingjing" width={421} height={480} fetchPriority="high" />}
          </div>
        </div>
      </section>

      <article className="lp-band lp-band--white">
        <div className="lp-wrap lp-prose">
          <h2 className="lp-h2">Sound familiar?</h2>
          <p>You ask a question in Chinese at dinner. Your child answers — in English.</p>
          <p>You say, &quot;In Chinese, please.&quot; You get two words, then they slide right back into English. Ask again, and the conversation is over.</p>
          <p>Maybe you&apos;ve tried Saturday Chinese school, picture books, cartoons in Mandarin. Or maybe you don&apos;t speak much Chinese yourself, and you&apos;re not sure where to begin.</p>
          <p className="lp-pull">This isn&apos;t a failure — not yours, and not your child&apos;s.</p>
          <p>English is everywhere: school, friends, shows, the playground. Of course it wins by default. That&apos;s not a character flaw. It just means Chinese needs a small, steady place in your family&apos;s day.</p>

          <h2 className="lp-h2">Here&apos;s what usually gets missed</h2>
          <p>Kids who understand but don&apos;t speak are usually stuck in one of three places: <strong>vocabulary</strong>, <strong>confidence</strong>, or <strong>habit</strong>. Each one needs a different first step. Pushing harder doesn&apos;t fix any of them.</p>
          <p>A two-hour weekend class can&apos;t cover the other six days of the week, either. Those days — dinner, the drive to school, bedtime — are where speaking actually happens.</p>
          <p className="lp-pull">You don&apos;t need more effort. You need the right first step, and a routine you can keep.</p>

          <h2 className="lp-h2">What you&apos;ll walk away with</h2>
          <p>By the end of the hour, you&apos;ll know exactly where your child is stuck, you&apos;ll have a few phrases you can use tonight, and you&apos;ll have a one-week plan that fits into time your family already has: 15 minutes a day.</p>
        </div>
      </article>

      <section className="lp-band lp-band--cream">
        <div className="lp-wrap">
          <p className="lp-eyebrow lp-center">What we&apos;ll cover live</p>
          <h2 className="lp-h2 lp-center">60 minutes, three things, done together</h2>
          <div className="lp-grid3">
            <div className="lp-pillar"><span className="lp-pillar__n">1</span><h3>The 3-question check</h3><p>We&apos;ll run it together so you can see whether it&apos;s vocabulary, confidence, or habit, and pick your first step.</p></div>
            <div className="lp-pillar"><span className="lp-pillar__n">2</span><h3>3 dinner-table phrases</h3><p>What to say when your child answers in English, so you can bring the conversation back to Chinese without nagging. We&apos;ll practice them.</p></div>
            <div className="lp-pillar"><span className="lp-pillar__n">3</span><h3>Your one-week plan</h3><p>15 minutes a day, built around dinner, the car, or bedtime. You leave with it filled in.</p></div>
          </div>
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
            <p>
              The workshop is <strong>{w.price}</strong>. Join the waitlist and you&apos;ll be the first to know when registration opens. No payment now.
            </p>
          </div>
          <Waitlist />
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-wrap lp-prose">
          <h2 className="lp-h2">Questions parents ask</h2>
          <dl className="lp-faq">
            <dt>I don&apos;t speak much Chinese. Is this still for me?</dt>
            <dd>The workshop is taught in English. The Chinese phrases come as short demo sentences with pinyin, so you can use them even if Chinese isn&apos;t your strongest language.</dd>
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

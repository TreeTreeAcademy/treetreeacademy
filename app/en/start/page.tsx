import type { Metadata } from "next";
import StartFlow from "../../_site/StartFlow";
import Placeholder from "../../_site/Placeholder";
import { STARTER_KIT_PDF } from "@/lib/site/config";

export const metadata: Metadata = {
  title: { absolute: "Your child understands Mandarin but answers in English? Free 7-Day Starter Kit | Tree Tree Academy" },
  description:
    "7 days, 15 minutes a day, at a time your family already has. Start with a 3-question check: vocabulary, confidence, or habit. Free, from Jing, a former Mandarin teacher raising two bilingual kids.",
  alternates: { canonical: "/en/start", languages: { "zh-CN": "/start", en: "/en/start" } },
};

const DAYS = [
  ["Day 1", "Find the stuck place.", "The 3-question check: vocabulary, confidence, or habit. 3 minutes."],
  ["Day 2", "The 15-minute routine.", "Listen, repeat one sentence, ask 3 questions. Same routine, every day."],
  ["Day 3", "5 phrases that turn an English answer back into Mandarin.", "Give them a sentence instead of saying \u201cSpeak Chinese!\u201d"],
  ["Day 4", "Watch a show the right way.", "Choose it with 3 checks, listen first, repeat 3 words, reuse one tomorrow."],
  ["Day 5", "10 characters, not 50.", "Radicals first, then the word. Each one has a picture inside it."],
  ["Day 6", "One scene, 10 words.", "Dinner or morning \u2014 pick one. Same 10 words, every day, for one week."],
  ["Day 7", "Your week, on one page.", "Keep the same plan next week. Change one word, not the whole plan."],
];

export default function EnStartPage() {
  return (
    <div lang="en">
      <p className="meta lp-lang"><a href="/start" lang="zh-CN">中文版 →</a></p>
      <section className="hero lp-hero">
        <div className="section-label">Free 7-Day Starter Kit</div>
        <h1>Your child understands everything you say in Mandarin. But they answer in English.</h1>
        <p className="lead">
          7 days. 15 minutes a day. At a time your family already has — dinner, the car, bedtime. No extra lessons. One small step a day.
        </p>
      </section>

      <section>
        <h2>The 7 days</h2>
        <ul className="lp-days">
          {DAYS.map(([d, t, s]) => (
            <li key={d}><span className="badge">{d}</span> <strong>{t}</strong> {s}</li>
          ))}
        </ul>
      </section>

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

      <section>
        <h2>What happens after you sign up</h2>
        <ol>
          <li>Download the kit right away — 7 pages, print it or keep it on your phone.</li>
          <li>The same link arrives in your email, so you never lose it.</li>
          <li>For the next 7 days, one short email a day: that day&apos;s step, nothing more.</li>
        </ol>
        <p><Placeholder>these 3 steps only become true once the kit PDF is uploaded and an email service is connected</Placeholder></p>
      </section>

      <section className="lp-about">
        <div className="lp-about__photo"><Placeholder>photo</Placeholder></div>
        <div>
          <h2>About Jing</h2>
          <p>
            I&apos;m Jing — like Jinglebell. I taught Chinese at a high school in China and then Mandarin at a university in the US.
            Now I&apos;m raising two bilingual kids, both fluent in English and Chinese — and I&apos;m sharing the system that works at home, one real moment at a time.
          </p>
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
        <p className="meta">
          This kit is the start, not the whole system. The next step is the Speak More Mandarin at Home camp: 4 weeks, one step a week, with live coaching. Details are on the camp page when enrollment opens.
        </p>
      </section>
    </div>
  );
}

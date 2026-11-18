import Placeholder from "./Placeholder";
import { Icon } from "./Visuals";
import { PHOTOS, asset } from "@/lib/site/assets";
import { mailto } from "@/lib/site/social";
import { SocialLinks } from "./Social";

// Jing's own About Me text (2026-11-17). Chinese is verbatim; English is her US-parent version.
// Short version = first two paragraphs + one link, nothing added.

type Lang = "zh" | "en";

const C = {
  zh: {
    eyebrow: "关于我",
    hi: "我是晶晶。",
    intro: [
      <>在武汉，我做过重点高中的语文老师。那几年我陪学生走过高中到大学最要紧的一段路，也慢慢明白一件事：<strong>语文考得好，和一个人会不会用中文思考、用中文表达，是两回事。</strong></>,
      <>后来到了美国。先在俄亥俄州的一所大学教美国学生中文，再后来，我的学生变成了一群在美国长大的孩子——有零基础，有中高级。</>,
      <>现在，我是两个中英双语流利孩子的妈妈。中文在我们家不是一门课，是每天要说的话：饭桌上讲今天的事，睡前读一本书，超市里认几个字。我为两个孩子搭起的这套东西，到今天还在一天天调整。</>,
    ],
    methodH: "我怎么带孩子学中文",
    method: [
      { icon: "chat" as const, t: "一、先让他愿意开口，再让他说得对。", d: "孩子不怕说错，怕的是说了没人接。所以我先接住他的话，再一点点把他的句子说完整。" },
      { icon: "dinner" as const, t: "二、中文不长在课本里，长在生活里。", d: "与其多上一节课，不如把中文放回饭桌、路上、睡前那十分钟。每天有一点点中文，比周末补两小时更管用。" },
      { icon: "heart" as const, t: "三、我教的其实是家长。", d: "自己在家做了这些年，最深的体会是：孩子能不能坚持，取决于爸爸妈妈知不知道下一步该做什么。所以我给的是能落地的做法，不是一套理论。" },
    ],
    hardH: "我懂的那些为难",
    hard: [<>孩子听得懂，就是不肯说；开口也是英文夹中文；你自己中文很好，却不知道怎么教自己的孩子；试过很多资源，最后都停在了“坚持不下去”。</>],
    hardEnd: "这些我都经历过——不是作为老师，是作为妈妈。",
    endH: "如果你也想让孩子在家用起中文",
    end: [
      <>我做的事很简单：把这套<strong>在家就能跑起来</strong>的方法，交到更多海外家庭手里。</>,
      <>不用先想清楚要学到什么程度。欢迎来跟我聊聊你家孩子现在的情况，我帮你看一眼，下一步该从哪里开始。</>,
    ],
    cta: [["mailto", "写信给晶晶"], ["/workshop#waitlist", "加入工作坊等候名单"]],
    small: "我会定期一封封回复。",
    follow: "关注我",
    more: ["/#about", "读我的完整故事 →"],
    photoAlt: "晶晶",
  },
  en: {
    eyebrow: "About Jing",
    hi: "I'm Jing — like jingle bell.",
    intro: [
      <>Back in Wuhan, China, I taught Chinese language and literature at a top-ranked high school. Those years taught me something I still think about: <strong>acing Chinese class and actually thinking and speaking in Chinese are two very different things.</strong></>,
      <>Then I moved to the US. I taught Chinese to American college students at a university in Ohio, and later to kids growing up here, from total beginners to intermediate and advanced.</>,
      <>Today I&apos;m a mom of two kids who are fluent in both English and Chinese. In our house, Chinese isn&apos;t a subject. It&apos;s just how we talk: about our day at dinner, over a bedtime story, picking out characters at the grocery store. The system I built for them is still evolving, day by day.</>,
    ],
    methodH: "How I approach it",
    method: [
      { icon: "chat" as const, t: "1. Talking first, perfect later.", d: "Kids aren't afraid of getting it wrong. They stop when nobody picks up what they said. So I respond first, then help them finish the sentence." },
      { icon: "dinner" as const, t: "2. Chinese lives in everyday life, not in a textbook.", d: "Ten minutes at dinner, in the car, or at bedtime beats a two-hour class on the weekend." },
      { icon: "heart" as const, t: "3. I'm really coaching the parents.", d: "Whether a kid sticks with it comes down to whether mom and dad know what to do next. So you get practical steps, not theory." },
    ],
    hardH: "You don't have to be fluent to start",
    hard: [
      <>Maybe your child understands Chinese but always answers in English. Maybe Chinese is your partner&apos;s language, or your parents&apos;, and yours is rusty, or you don&apos;t speak it at all. Maybe you&apos;ve tried apps, classes and flashcards, and nothing stuck.</>,
    ],
    hardEnd: "That's exactly who I built this for. You don't need to speak Chinese well to make it part of your home. You'll get simple phrases with pinyin, routines that fit into the day you already have, and a clear next step.",
    endH: "Start where your family is",
    end: [<>You don&apos;t need to know where this ends up. Tell me where your child is right now, and I&apos;ll help you find the first step.</>],
    cta: [["mailto", "Email Jing"], ["/en/workshop#waitlist", "Join the workshop waitlist"]],
    small: "I read every message and reply personally.",
    follow: "Follow along",
    more: ["/en/workshop#about", "Read my full story →"],
    photoAlt: "Jing",
  },
};

export function TeachStrip({ lang = "zh" }: { lang?: Lang }) {
  const zh = lang === "zh";
  const teach = PHOTOS.teaching.filter((p) => asset(p.src));
  return (
    <figure className="lp-teach">
      <figcaption>
        <strong>{zh ? "课堂里的我" : "In the classroom"}</strong>
        {zh
          ? " · 在俄亥俄州的大学，给美国大学生上中文课：野餐、中国文化活动、剪纸。"
          : " · Teaching Chinese to American college students in Ohio: a class picnic, a Chinese culture event, paper-cutting."}
      </figcaption>
      {teach.length ? (
        <div className="lp-teach__row">
          {teach.map((p) => <img key={p.src} src={p.src} alt={zh ? p.alt : p.altEn} loading="lazy" decoding="async" />)}
        </div>
      ) : (
        <Placeholder>3 张教学照片</Placeholder>
      )}
    </figure>
  );
}

export default function AboutJing({
  lang = "zh",
  short = false,
  photo = PHOTOS.about,
  strip = !short,
}: { lang?: Lang; short?: boolean; photo?: string; strip?: boolean }) {
  const c = C[lang];
  const src = asset(photo);
  return (
    <section className="lp-about2" id="about">
      <div className="lp-about2__photo">
        {src ? <img src={src} alt={c.photoAlt} loading="lazy" decoding="async" /> : <Placeholder>照片</Placeholder>}
      </div>
      <div className="lp-about2__body">
        <p className="lp-eyebrow">{c.eyebrow}</p>
        <h2 className="lp-h2">{c.hi}</h2>
        {(short ? c.intro.slice(0, 2) : c.intro).map((p, i) => <p key={i}>{p}</p>)}
        {short && <p><a className="lp-link" href={c.more[0]}>{c.more[1]}</a></p>}
      </div>
      {strip && <div className="lp-about2__strip"><TeachStrip lang={lang} /></div>}
      {!short && (
        <div className="lp-about2__more">
          <h3 className="lp-about2__h">{c.methodH}</h3>
          <div className="vz-cards vz-cards--3 ab-method">
            {c.method.map((m) => {
              const I = Icon[m.icon];
              return (
                <div className="vz-card" key={m.t}>
                  <span className="vz-card__icon"><I /></span>
                  <h3>{m.t}</h3>
                  <p>{m.d}</p>
                </div>
              );
            })}
          </div>

          <div className="ab-hard">
            <h3 className="lp-about2__h">{c.hardH}</h3>
            {c.hard.map((p, i) => <p key={i}>{p}</p>)}
            <p className="ab-hard__end">{c.hardEnd}</p>
          </div>

          <div className="ab-end">
            <h3 className="lp-about2__h">{c.endH}</h3>
            {c.end.map((p, i) => <p key={i}>{p}</p>)}
            <div className="lp-ctas lp-ctas--center">
              <a href={mailto(lang)} className="lp-btn lp-btn--primary">{c.cta[0][1]}</a>
              <a href={c.cta[1][0]} className="lp-btn lp-btn--ghost">{c.cta[1][1]}</a>
            </div>
            <p className="ab-small">{c.small}</p>
            <div className="ab-follow">
              <p className="ab-follow__h">{c.follow}</p>
              <SocialLinks lang={lang} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

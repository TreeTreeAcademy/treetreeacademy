import Placeholder from "./Placeholder";
import { Icon } from "./Visuals";
import { PHOTOS, asset } from "@/lib/site/assets";
import { contactHref } from "@/lib/site/social";
import { SocialLinks } from "./Social";

// Jing's About copy pack (2026-11-20 Google Doc: website-about-copy-builder-pack).
// Chinese and English are verbatim from the doc. They correspond, but are not literal translations.
// Do not mention the Confucius Institute. Do not name the children's ages or genders.

type Lang = "zh" | "en";

export const ABOUT_SHORT = {
  zh: {
    hi: "我是晶晶。",
    body: "汉语言文学专业毕业后，我在武汉一所重点高中教语文，后来在美国俄亥俄州的一所大学教美国学生中文。十二年来，我一直在看同一件事：一门语言怎样在一群人身上扎根、抽枝，最后长成一棵遮荫的树。语言是工具，要真正习得它，就得让它有可用之处。所以孩子出生后，我特意设计了我们家的中文环境——饭桌上的聊天，睡前的一本书，中国超市里的几个字。今天，我的两个孩子中英双语流利，中文在我们家不是一门课，而是感受情绪、理解经历的一种语言。如果你也怀着同样的心愿，我很想和你一起，把中文传承这件事做下去。",
    moreHref: "/about",
    moreLabel: "了解更多 →",
  },
  en: {
    hi: "I'm Jing — like Jinglebell.",
    body: "I taught Chinese at a top high school in Wuhan, China, then at a university in Ohio, and for twelve years I've watched how a language takes root in a group of people and grows into a tree that gives shade. Language is a tool: to truly learn it, it has to be useful. So when my kids were born, I designed our home Chinese on purpose — dinner-table talk, a book before bed, characters in the grocery store. Today both my kids speak English and Mandarin fluently, and Chinese isn't a subject in our house. It's how we feel things and make sense of our lives. If you want the same for your family, I'd love to build it with you.",
    moreHref: "/en/about",
    moreLabel: "More about Jing →",
  },
} as const;

const C = {
  zh: {
    eyebrow: "关于我",
    hi: "关于我",
    intro: [
      <p key="p1">汉语言文学专业本科毕业后，我进入武汉一所重点高中，成为一名语文老师。语文课上，我和一百三十多个孩子一起做两件事：学习如何聆听，听懂他人话里的意思与心事；也学习如何表达，用中文把自己的想法和见解讲得清楚、讲得有分量。</p>,
      <p key="p2">后来，我来到美国，在俄亥俄州的一所大学教美国学生中文。课堂上，我和几十名学生一起感受中文的词语与句式，也一起看见文化如何塑造一门语言的样子。</p>,
      <p key="p3">再后来，我的学生换成了一群在美国长大的孩子——有的从零起步，有的已在中高级。</p>,
      <p key="p4">过去十二年，我一直在看同一件事：一门语言怎样在某一群人身上扎根、抽枝，最后长成一棵遮荫的树。一边是把中文当&quot;语文&quot;来学的母语孩子，一边是把中文当外语来学的英语母语学习者——他们生长的路径全然不同。我看见后者为了真正习得这门语言，怎样与遗忘反复拉锯，怎样抵抗母语负迁移的拉扯：那些来自英语的语序、时态与表达习惯，总在不经意间改写他们的中文。我看见了这份艰辛。我也看见了另一种艰辛——在英语的大环境里，家长为了守住中文的一席之地，不惜重金、不辞路远，周末驱车送孩子去中文学校；而孩子面对被中文占去的周末，爱与怨交织。</p>,
      <p key="belief">我始终相信一句话：</p>,
      <blockquote key="quote" className="ab-quote"><p>语言是工具。要真正习得它，就得让它有可用之处。</p></blockquote>,
      <p key="p5">所以孩子出生后，我们家的中文环境是我特意设计过的。现在，我是两个中英双语流利孩子的妈妈。中文在我们家不是一门课，而是每天要说的话：饭桌上聊今天发生的事，睡前读一本书，在中国超市里认几个字。我希望中文不只是&quot;妈妈的语言&quot;，也是他们在成长中用来感受情绪、理解经历的一种语言。我希望有一天，他们也会把这份语言，交给他们自己的孩子。</p>,
      <p key="p6">如果你也怀着同样的心愿，我很想和你一起，把中文传承这件事做下去。</p>,
    ],
    methodH: "我怎么带孩子学中文",
    method: [
      { icon: "chat" as const, t: "一、先让他愿意开口，再让他说得对。", d: "孩子不怕说错，怕的是说了没人接。所以我先接住他的话，再一点点把他的句子说完整。" },
      { icon: "dinner" as const, t: "二、中文不长在课本里，长在生活里。", d: "与其多上一节课，不如把中文放回饭桌、路上、睡前那十分钟。每天有一点点中文，比周末补两小时更管用。" },
      { icon: "heart" as const, t: "三、我教的其实是家长。", d: "自己在家做了这些年，最深的体会是：孩子能不能坚持，取决于爸爸妈妈知不知道下一步该做什么。所以我给的是能落地的做法，不是一套理论。" },
    ],
    endH: "想先聊一聊？",
    end: [
      <>欢迎来跟我聊聊你家孩子现在的情况，我帮你看一眼，下一步该从哪里开始。</>,
    ],
    cta: [["/contact", "给晶晶留言"], ["/workshop#waitlist", "加入工作坊等候名单"]],
    small: "我会定期一封封回复。",
    follow: "关注我",
    photoAlt: "晶晶",
  },
  en: {
    eyebrow: "About Jing",
    hi: "I'm Jing — like Jinglebell.",
    intro: [
      <p key="p1">I studied Chinese language and literature, and after graduation I taught Chinese at a top high school in Wuhan, China. In my classroom, more than 130 students and I worked on two things: learning to listen — really hearing what someone means, and what they feel underneath the words — and learning to speak, so they could say what they thought in Chinese, clearly and with substance.</p>,
      <p key="p2">Then I moved to the US to teach Chinese at a university in Ohio. Same language, completely different classroom. Together we felt our way through Chinese words and sentence patterns, and saw how culture shapes a language from the inside.</p>,
      <p key="p3">After that, my students became children growing up in America — some starting from zero, some already intermediate or advanced.</p>,
      <p key="p4">For twelve years, I&apos;ve been watching the same thing: how a language takes root in a group of people, puts out branches, and grows into a tree that gives shade. On one side, children learning Chinese as their mother tongue, the way I did. On the other, English-speaking learners working to make it their own. The paths are nothing alike. I watched the second group fight forgetting, again and again, and fight the pull of their first language — English word order, English tenses, English habits quietly rewriting their Chinese. I saw how hard that is. And I know the worry that sits behind it: will speaking Mandarin at home hold their English back? It&apos;s the question I hear most.</p>,
      <p key="p5">And I saw another kind of hard: parents in an English-speaking world, doing everything they can to keep a place for Chinese — paying for weekend school, driving long distances on Saturdays — while their children feel both love and resentment toward the weekends that Chinese takes over.</p>,
      <p key="belief">I believe one thing, and I&apos;ve believed it all along:</p>,
      <blockquote key="quote" className="ab-quote"><p>Language is a tool. To truly learn it, it has to be useful.</p></blockquote>,
      <p key="p6">So when my own kids were born, I designed our home Chinese on purpose. Today I&apos;m the mom of two kids who speak English and Mandarin fluently. In our house, Chinese isn&apos;t a subject. It&apos;s what we talk about at the dinner table — what happened today — the book we read before bed, the characters we sound out together in the Chinese grocery store. I don&apos;t want Chinese to be just &quot;Mom&apos;s language.&quot; I want it to be a language they use to feel things and make sense of their lives. And one day, I hope they pass it on to their own children.</p>,
      <p key="p7">If you want the same thing for your family, I&apos;d love to build it with you.</p>,
    ],
    methodH: "How I approach it",
    method: [
      { icon: "chat" as const, t: "1. Talking first, perfect later.", d: "Kids aren't afraid of getting it wrong. They stop when nobody picks up what they said. So I respond first, then help them finish the sentence." },
      { icon: "dinner" as const, t: "2. Chinese lives in everyday life, not in a textbook.", d: "Ten minutes at dinner, in the car, or at bedtime beats a two-hour class on the weekend." },
      { icon: "heart" as const, t: "3. I'm really coaching the parents.", d: "Whether a kid sticks with it comes down to whether mom and dad know what to do next. So you get practical steps, not theory." },
    ],
    endH: "Start where your family is",
    end: [<>You don&apos;t need to know where this ends up. Tell me where your child is right now, and I&apos;ll help you find the first step.</>],
    cta: [["/en/contact", "Message Jing"], ["/en/workshop#waitlist", "Join the workshop waitlist"]],
    small: "I read every message and reply personally.",
    follow: "Follow along",
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
  strip,
}: { lang?: Lang; short?: boolean; photo?: string; strip?: boolean }) {
  const c = C[lang];
  const s = ABOUT_SHORT[lang];
  const src = asset(photo);
  const showStrip = strip ?? !short;
  return (
    <section className="lp-about2" id="about">
      <div className="lp-about2__photo">
        {src ? <img src={src} alt={c.photoAlt} loading="lazy" decoding="async" /> : <Placeholder>照片</Placeholder>}
      </div>
      <div className="lp-about2__body">
        {!(!short && c.hi === c.eyebrow) && <p className="lp-eyebrow">{c.eyebrow}</p>}
        <h2 className="lp-h2">{short ? s.hi : c.hi}</h2>
        {short ? <p>{s.body}</p> : c.intro}
        {short && <p><a className="lp-link" href={s.moreHref}>{s.moreLabel}</a></p>}
      </div>
      {showStrip && <div className="lp-about2__strip"><TeachStrip lang={lang} /></div>}
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

          <div className="ab-end">
            <h3 className="lp-about2__h">{c.endH}</h3>
            {c.end.map((p, i) => <p key={i}>{p}</p>)}
            <div className="lp-ctas lp-ctas--center">
              <a href={contactHref(lang)} className="lp-btn lp-btn--primary">{c.cta[0][1]}</a>
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

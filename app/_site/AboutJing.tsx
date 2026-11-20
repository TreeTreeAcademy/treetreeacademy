import Placeholder from "./Placeholder";
import { Icon } from "./Visuals";
import { PHOTOS, asset } from "@/lib/site/assets";
import { contactHref } from "@/lib/site/social";
import { SocialLinks } from "./Social";

// Jing's About Me (2026-11-20). Chinese is verbatim from Jing.
// English is a US-parent version: same story arc, not a literal translation.

type Lang = "zh" | "en";

const C = {
  zh: {
    eyebrow: "关于我",
    hi: "我是晶晶。",
    intro: [
      <p key="p1">汉语言文学专业本科毕业后，我进入武汉一所重点高中，成为一名语文老师。语文课上，我和一百六十多个孩子一起做两件事：学习如何<strong>聆听</strong>，听懂他人话里的意思与心事；也学习如何表达，用中文把自己的想法和见解讲得清楚、讲得有分量。</p>,
      <p key="p2">后来，我申请到孔子学院的项目，在俄亥俄州的一所大学教美国学生中文。课堂上，我和几十名学生一起感受中文的词语与句式，也一起看见文化如何塑造一门语言的样子。</p>,
      <p key="p3">再后来，我的学生换成了一群在美国长大的孩子——有的从零起步，有的已在中高级。</p>,
      <p key="p4">过去十二年，我一直在看同一件事：<strong>一门语言怎样在某一群人身上扎根、抽枝，最后长成一棵遮荫的树。</strong> 一边是把中文当“语文”来学的母语孩子，一边是把中文当外语来学的英语母语学习者——他们生长的路径全然不同。我看见后者为了真正习得这门语言，怎样与遗忘反复拉锯，怎样抵抗<strong>母语负迁移</strong>的拉扯：那些来自英语的语序、时态与表达习惯，总在不经意间改写他们的中文。我看见了这份艰辛。我也看见了另一种艰辛——在英语的大环境里，家长为了守住中文的一席之地，不惜重金、不辞路远，周末驱车送孩子去中文学校；而孩子面对被中文占去的周末，爱与怨交织。</p>,
      <p key="belief">我始终相信一句话：</p>,
      <blockquote key="quote" className="ab-quote"><p>语言是工具。要真正习得它，就得让它有可用之处。</p></blockquote>,
      <p key="p5">所以孩子出生后，我们家的中文环境是我特意设计过的。现在，我是两个中英双语流利孩子的妈妈。中文在我们家不是一门课，而是每天要说的话：饭桌上聊今天发生的事，睡前读一本书，在中国超市里认几个字。我希望中文不只是“妈妈的语言”，也是他们在成长中用来感受情绪、理解经历的一种语言。我希望有一天，他们也会把这份语言，交给他们自己的孩子。</p>,
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
    more: ["/#about", "读我的完整故事 →"],
    photoAlt: "晶晶",
  },
  en: {
    eyebrow: "About Jing",
    hi: "I'm Jing — like jingle bell.",
    intro: [
      <p key="p1">After I graduated with a degree in Chinese language and literature, I became a Chinese teacher at a top high school in Wuhan. In those classes, I worked with more than 160 students on two things: learning how to <strong>listen</strong> — to hear both the meaning and the feeling in what someone says — and learning how to speak, so they could say what they thought in Chinese, clearly and with real weight.</p>,
      <p key="p2">Later I came to the United States through a Confucius Institute program, and taught Chinese to American students at a university in Ohio. Together we explored the words and sentence patterns of Chinese, and we saw how a culture shapes the way a language works.</p>,
      <p key="p3">Then my students changed again: a group of kids growing up in America — some starting from zero, some already at an intermediate or advanced level.</p>,
      <p key="p4">For the past twelve years, I have been watching the same thing: <strong>how a language takes root in a group of people, puts out branches, and finally grows into a tree that can give shade.</strong> Some were learning Chinese as their first language, the way children in China study it as language arts. Others were learning it as a new language, with English already in their bones. The two paths could not be more different. I watched the second group wrestle with forgetting, and with the quiet pull of English — its word order, its tenses, its habits — rewriting their Chinese without them noticing. I saw how hard that is. I also saw another kind of hard: parents in an English-speaking world, spending real money and long Saturday drives to hold onto a place for Chinese; and children who feel both love and resentment about the weekends it takes from them. Maybe that is your family. Or maybe you speak only a little Chinese, or none at all — and your child understands you, then answers in English. <strong>You don&apos;t have to be fluent to start.</strong></p>,
      <p key="belief">I have always believed one thing:</p>,
      <blockquote key="quote" className="ab-quote"><p>Language is a tool. To really learn it, it has to have a use.</p></blockquote>,
      <p key="p5">So after my children were born, I designed the Chinese environment in our home on purpose. Today I&apos;m the mom of two kids who are fluent in both Chinese and English. In our house, Chinese isn&apos;t a class. It&apos;s what we speak every day: talking about the day at dinner, reading a book at bedtime, picking out a few characters at the Chinese grocery store. I hope Chinese is not only &ldquo;Mom&apos;s language,&rdquo; but a language they can use, as they grow, to feel what they feel and make sense of what they live through. And I hope that one day, they will pass this language on to their own children.</p>,
      <p key="p6">If you hold the same hope, I would love to keep this going with you.</p>,
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
  const intro = short ? c.intro.slice(0, 2) : c.intro;
  return (
    <section className="lp-about2" id="about">
      <div className="lp-about2__photo">
        {src ? <img src={src} alt={c.photoAlt} loading="lazy" decoding="async" /> : <Placeholder>照片</Placeholder>}
      </div>
      <div className="lp-about2__body">
        <p className="lp-eyebrow">{c.eyebrow}</p>
        <h2 className="lp-h2">{c.hi}</h2>
        {intro}
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

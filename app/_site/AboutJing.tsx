import Placeholder from "./Placeholder";
import { PHOTOS, asset } from "@/lib/site/assets";

const ZH = [
  "我是晶晶。",
  "我曾是武汉一所重点高中的语文老师，陪学生走过从高中到大学最关键的语言阶段——不只是应对考试，更是学会用中文思考、用中文表达。",
  "后来我来到美国，在俄亥俄州的一所大学教本地大学生中文；之后又一直教在美国长大的孩子，从零基础入门，到中高级水平。",
  "这些年，我一次次看到一门语言在一个人身上从无到有、从有到好。我也越来越确定：孩子学不会中文，很少是因为孩子不行，更多是因为家里缺少一套每天都能用起来的方法。",
  "现在，我是两个双语孩子的妈妈。我在家里为他们搭起了一套双语体系，中文和英文一起长，到今天还在一天天进步。",
  "树儿学院想做的，就是把我在课堂上和家里验证过的方法，变成普通家长也能上手的小步骤，让中文真正活在你家的日常里。",
];

const EN = [
  "I'm Jingjing.",
  "I started as a Chinese language and literature teacher at a top high school in Wuhan, China, guiding students through the leap from high-school to university-level Chinese — not just for exams, but to think and express themselves in Chinese.",
  "In the U.S., I taught Chinese to American college students at a university in Ohio, and then kept teaching kids growing up here, from complete beginners to intermediate and advanced learners.",
  "Again and again I've watched a language grow in a person from nothing to something, and from something to fluent. And I've learned this: when kids don't pick up Chinese, it's rarely the child — it's usually that the family doesn't have a method they can use every day.",
  "Today I'm raising two bilingual kids. I built a bilingual system at home, and both languages keep growing with them.",
  "Tree Tree Academy turns what I've tested in the classroom and at home into small, doable steps for everyday parents, so Chinese can truly live in your family's daily life.",
];

function Photo({ src, alt, className }: { src: string; alt: string; className: string }) {
  const s = asset(src);
  return s ? (
    <img src={s} alt={alt} className={className} loading="lazy" decoding="async" />
  ) : (
    <div className={className + " lp-photo-missing"}><Placeholder>照片</Placeholder></div>
  );
}

export default function AboutJing({
  lang = "zh",
  short = false,
  photo = PHOTOS.about,
}: { lang?: "zh" | "en"; short?: boolean; photo?: string }) {
  const zh = lang === "zh";
  const paras = zh ? ZH : EN;
  const shown = short ? [paras[0], paras[1], paras[2], paras[4]] : paras;
  const teach = PHOTOS.teaching.filter((p) => asset(p.src));
  return (
    <section className="lp-about" id="about">
      <div className="lp-about__head">
        <Photo src={photo} alt={zh ? "晶晶" : "Jingjing"} className="lp-about__photo" />
        <h2>{zh ? "关于我" : "About Jingjing"}</h2>
      </div>
      <div className="lp-about__body">
        {shown.map((p, i) => <p key={i} className={i === 0 ? "lp-about__hi" : undefined}>{p}</p>)}
      </div>
      {!short && (
        <figure className="lp-teach">
          <figcaption>
            <strong>{zh ? "课堂里的我" : "In the classroom"}</strong>
            {zh
              ? " · 在俄亥俄州的大学，给美国大学生上中文课：野餐、中国文化活动、剪纸。"
              : " · Teaching Chinese to American college students in Ohio: a class picnic, a Chinese culture event, paper-cutting."}
          </figcaption>
          {teach.length ? (
            <div className="lp-teach__row">
              {teach.map((p) => <img key={p.src} src={p.src} alt={p.alt} loading="lazy" decoding="async" />)}
            </div>
          ) : (
            <Placeholder>3 张教学照片</Placeholder>
          )}
        </figure>
      )}
    </section>
  );
}

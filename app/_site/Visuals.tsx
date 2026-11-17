// Visual blocks for landing pages: inline SVG icons in the brand palette, no stock photos, no numbers.
import { PHOTOS, asset } from "@/lib/site/assets";

type L = "zh" | "en";
const Y = "#fdc302", LI = "#8fca02", MG = "#50bb18", DG = "#028a41", INK = "#022e02";

const P = { width: 40, height: 40, viewBox: "0 0 48 48", fill: "none", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const Icon = {
  words: () => (<svg {...P}><rect x="6" y="9" width="22" height="16" rx="5" fill={Y} /><path d="M12 25l-3 7 8-7" fill={Y} /><rect x="20" y="19" width="22" height="16" rx="5" fill={DG} /><path d="M36 35l3 7-8-7" fill={DG} /><path d="M25 27h12" stroke="#fff" /></svg>),
  heart: () => (<svg {...P}><path d="M24 41s-15-8.6-15-19a8 8 0 0115-4 8 8 0 0115 4c0 10.4-15 19-15 19z" fill={MG} /><path d="M17 22l5 5 9-9" stroke="#fff" /></svg>),
  repeat: () => (<svg {...P}><circle cx="24" cy="24" r="17" fill={LI} /><path d="M16 21a9 9 0 0115-4l2 2M32 27a9 9 0 01-15 4l-2-2" stroke={INK} /><path d="M33 13v6h-6M15 35v-6h6" stroke={INK} /></svg>),
  chat: () => (<svg {...P}><rect x="5" y="8" width="38" height="26" rx="8" fill={DG} /><path d="M14 34l-4 8 12-8" fill={DG} /><circle cx="16" cy="21" r="2.5" fill="#fff" /><circle cx="24" cy="21" r="2.5" fill="#fff" /><circle cx="32" cy="21" r="2.5" fill="#fff" /></svg>),
  target: () => (<svg {...P}><circle cx="24" cy="24" r="18" fill={Y} /><circle cx="24" cy="24" r="11" fill="#fff" /><circle cx="24" cy="24" r="5" fill={DG} /></svg>),
  calendar: () => (<svg {...P}><rect x="6" y="10" width="36" height="32" rx="6" fill={LI} /><rect x="6" y="10" width="36" height="9" rx="4" fill={DG} /><path d="M15 6v8M33 6v8" stroke={INK} /><path d="M14 27h5M22 27h5M30 27h5M14 34h5M22 34h5" stroke={INK} /></svg>),
  dinner: () => (<svg {...P}><circle cx="24" cy="25" r="14" fill={Y} /><circle cx="24" cy="25" r="8" fill="#fff" /><path d="M5 10v10M8 10v30M5 20h6M43 10c-4 2-4 10 0 12v18" stroke={DG} /></svg>),
  car: () => (<svg {...P}><path d="M8 30l4-11a5 5 0 015-3h14a5 5 0 015 3l4 11v7H8z" fill={MG} /><rect x="14" y="19" width="20" height="8" rx="2" fill="#fff" /><circle cx="15" cy="37" r="4" fill={INK} /><circle cx="33" cy="37" r="4" fill={INK} /></svg>),
  moon: () => (<svg {...P}><path d="M32 6a16 16 0 1010 26A14 14 0 0132 6z" fill={DG} /><circle cx="36" cy="14" r="2" fill={Y} /><circle cx="40" cy="22" r="1.5" fill={Y} /></svg>),
  seed: () => (<svg {...P}><ellipse cx="24" cy="34" rx="16" ry="6" fill={Y} /><path d="M24 34V20" stroke={DG} /><path d="M24 24c-8 0-10-6-10-10 6 0 10 3 10 10z" fill={LI} /></svg>),
  sprout: () => (<svg {...P}><ellipse cx="24" cy="38" rx="16" ry="5" fill={Y} /><path d="M24 38V14" stroke={DG} /><path d="M24 26c-9 0-12-7-12-12 7 0 12 4 12 12zM24 20c8 0 11-6 11-10-6 0-11 3-11 10z" fill={MG} /></svg>),
  tree: () => (<svg {...P}><circle cx="24" cy="18" r="13" fill={DG} /><circle cx="15" cy="22" r="8" fill={MG} /><circle cx="33" cy="22" r="8" fill={LI} /><path d="M24 22v20" stroke={INK} /><path d="M17 42h14" stroke={Y} /></svg>),
  book: () => (<svg {...P}><path d="M6 10c7-2 13 0 18 4 5-4 11-6 18-4v28c-7-2-13 0-18 4-5-4-11-6-18-4z" fill={LI} /><path d="M24 14v28" stroke={DG} /></svg>),
  clock: () => (<svg {...P}><circle cx="24" cy="24" r="18" fill={Y} /><path d="M24 13v11l7 5" stroke={INK} /></svg>),
};

export function IconCards({ items, cols = 3 }: { items: { icon: keyof typeof Icon; title: string; text: string }[]; cols?: 3 | 4 }) {
  return (
    <div className={`vz-cards vz-cards--${cols}`}>
      {items.map((it) => {
        const I = Icon[it.icon];
        return (
          <div className="vz-card" key={it.title}>
            <span className="vz-card__icon"><I /></span>
            <h3>{it.title}</h3>
            <p>{it.text}</p>
          </div>
        );
      })}
    </div>
  );
}

export function StuckPoints({ lang = "zh" }: { lang?: L }) {
  const zh = lang === "zh";
  return (
    <IconCards
      items={[
        { icon: "words", title: zh ? "词汇" : "Vocabulary", text: zh ? "听得懂的，比能说出来的多" : "Understands more than they can say" },
        { icon: "heart", title: zh ? "信心" : "Confidence", text: zh ? "会说，但怕说错就停下" : "Knows the words, afraid to get them wrong" },
        { icon: "repeat", title: zh ? "习惯" : "Habit", text: zh ? "会说，但在家英文更快" : "Can say it, but English is faster at home" },
      ]}
    />
  );
}

export function DailyMoments({ lang = "zh" }: { lang?: L }) {
  const zh = lang === "zh";
  const items: [keyof typeof Icon, string][] = zh
    ? [["dinner", "饭桌"], ["car", "车上"], ["moon", "睡前"]]
    : [["dinner", "Dinner"], ["car", "The car"], ["moon", "Bedtime"]];
  return (
    <div className="vz-moments">
      <div className="vz-moments__clock"><Icon.clock /><strong>{zh ? "每天 15 分钟" : "15 min a day"}</strong></div>
      <span className="vz-moments__eq" aria-hidden="true">=</span>
      {items.map(([ic, t]) => { const I = Icon[ic]; return <div className="vz-moment" key={t}><I /><span>{t}</span></div>; })}
    </div>
  );
}

export function FlowSteps({ steps }: { steps: { icon: keyof typeof Icon; tag: string; title: string; text: string }[] }) {
  return (
    <ol className="vz-flow">
      {steps.map((s, i) => {
        const I = Icon[s.icon];
        return (
          <li className="vz-flow__step" key={s.title}>
            <div className="vz-flow__badge"><I /><span className="vz-flow__n">{i + 1}</span></div>
            <p className="vz-flow__tag">{s.tag}</p>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function TreeSystem({ lang = "zh" }: { lang?: L }) {
  const zh = lang === "zh";
  return (
    <FlowSteps
      steps={[
        { icon: "seed", tag: zh ? "测" : "Check", title: zh ? "找到卡点" : "Find the stuck place", text: zh ? "词汇、信心，还是习惯" : "Vocabulary, confidence, or habit" },
        { icon: "sprout", tag: zh ? "练" : "Practice", title: zh ? "每天 15 分钟" : "15 minutes a day", text: zh ? "同一个例程，天天做" : "Same small routine, every day" },
        { icon: "tree", tag: zh ? "读" : "Read", title: zh ? "按顺序来" : "In the right order", text: zh ? "听 → 说 → 拼音 → 部首 → 阅读" : "Listen → speak → pinyin → radicals → reading" },
      ]}
    />
  );
}

export function WorkshopAgenda({ lang = "zh" }: { lang?: L }) {
  const zh = lang === "zh";
  return (
    <FlowSteps
      steps={[
        { icon: "target", tag: zh ? "现场诊断" : "Diagnose", title: zh ? "3 问诊断" : "The 3-question check", text: zh ? "看清卡点，定下第一步" : "See where your child is stuck and pick a first step" },
        { icon: "chat", tag: zh ? "现场练习" : "Practice", title: zh ? "饭桌 3 句话术" : "3 dinner-table phrases", text: zh ? "孩子回英文时，怎么接回中文" : "What to say when they answer in English" },
        { icon: "calendar", tag: zh ? "带走" : "Take home", title: zh ? "一周计划表" : "Your one-week plan", text: zh ? "每天 15 分钟，写好带走" : "15 minutes a day, filled in before you leave" },
      ]}
    />
  );
}

const WEEK_ZH = ["找卡点", "15 分钟例程", "5 句接回中文", "看动画的方法", "10 个字·部首起", "一个场景 10 个词", "一页纸计划"];
const WEEK_EN = ["Find the stuck place", "The 15-min routine", "5 turn-back phrases", "Watch a show right", "10 characters", "One scene, 10 words", "Your week, one page"];

export function WeekTimeline({ lang = "zh", title }: { lang?: L; title?: string }) {
  const zh = lang === "zh";
  const days = zh ? WEEK_ZH : WEEK_EN;
  return (
    <div className="vz-week">
      {title && <p className="vz-week__title">{title}</p>}
      <ol className="vz-week__row">
        {days.map((d, i) => (
          <li key={d} className="vz-week__day">
            <span className="vz-week__dot">{zh ? `第${i + 1}天` : `Day ${i + 1}`}</span>
            <span className="vz-week__label">{d}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PullQuote({ children, by }: { children: React.ReactNode; by?: string }) {
  const photo = asset(PHOTOS.about);
  return (
    <figure className="vz-quote">
      {photo && <img src={photo} alt="" className="vz-quote__img" loading="lazy" />}
      <blockquote>
        <p>{children}</p>
        {by && <figcaption>— {by}</figcaption>}
      </blockquote>
    </figure>
  );
}

export function ClassroomMosaic({ lang = "zh" }: { lang?: L }) {
  const zh = lang === "zh";
  const ph = PHOTOS.teaching.filter((p) => asset(p.src));
  if (!ph.length) return null;
  return (
    <figure className="vz-mosaic">
      <div className="vz-mosaic__grid">
        {ph.map((p) => <img key={p.src} src={p.src} alt={zh ? p.alt : p.altEn} loading="lazy" decoding="async" />)}
      </div>
      <figcaption>{zh ? "课堂里的我：在俄亥俄州的大学，给美国大学生上中文课" : "In the classroom: teaching Chinese to American college students in Ohio"}</figcaption>
    </figure>
  );
}

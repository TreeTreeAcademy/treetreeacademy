import SignupForm from "./SignupForm";
import { Icon, WEEK_ZH, WEEK_EN } from "./Visuals";

const C = {
  zh: {
    eyebrow: "免费资料", h: "免费领取：7天家庭中文启动包",
    lead: "不用报班，不用另找时间。7 天，每天一小步，从你家已经有的时间开始。",
    pts: [["clock", "每天 15 分钟", "一天只做一件小事，做完就停。"], ["dinner", "饭桌 · 车上 · 睡前", "用家里本来就有的时间，不额外加课。"], ["chat", "照着说就行", "每天给你现成的中文句子和玩法。"]] as const,
    btn: "免费领取", small: "免费，随时可以退订。",
    ok: "请去邮箱点一下确认邮件，资料会发到你的邮箱。",
    mock: ["7 天", "家庭中文", "启动包"], days: ["一", "二", "三", "四", "五", "六", "七"], dayPre: "第", daySuf: "天",
  },
  en: {
    eyebrow: "Free download", h: "Free 7-Day Starter Kit",
    lead: "No extra classes. No extra time. Seven small steps that fit into the day your family already has.",
    pts: [["clock", "15 minutes a day", "One small thing each day, then you're done."], ["dinner", "Dinner · the car · bedtime", "Built into moments you already have."], ["chat", "Works even if your Chinese is rusty", "Ready-to-use phrases with pinyin, every day."]] as const,
    btn: "Send me the kit", small: "Free. Unsubscribe anytime.",
    ok: "Check your inbox and click the confirmation link — the kit will come to you by email.",
    mock: ["7-Day", "Starter Kit", "Chinese at home"], days: ["1", "2", "3", "4", "5", "6", "7"], dayPre: "Day ", daySuf: "",
  },
};

export default function KitBlock({ lang = "zh", source }: { lang?: "zh" | "en"; source: string }) {
  const c = C[lang];
  return (
    <section className="lp-band kit-band" id="kit" lang={lang === "en" ? "en" : undefined}>
      <div className="lp-wrap kit">
        <div className="kit__mock" aria-hidden="true">
          <div className="kit__paper kit__paper--back" />
          <div className="kit__paper">
            <div className="kit__cover">
              <span className="kit__leaf">{Icon.sprout()}</span>
              <b>{c.mock[0]}</b><b>{c.mock[1]}</b><span>{c.mock[2]}</span>
            </div>
            <ol className="kit__days">
              {(lang === "en" ? WEEK_EN : WEEK_ZH).map(([t], i) => (
                <li key={t}><small>{c.dayPre}{c.days[i]}{c.daySuf}</small>{t}</li>
              ))}
            </ol>
          </div>
        </div>
        <div className="kit__text">
          <p className="lp-eyebrow">{c.eyebrow}</p>
          <h2 className="lp-h2">{c.h}</h2>
          <p className="lp-sub">{c.lead}</p>
          <ul className="kit__pts">
            {c.pts.map(([ic, t, d]) => (
              <li key={t}><span className="kit__ic">{Icon[ic]()}</span><span><strong>{t}</strong><br />{d}</span></li>
            ))}
          </ul>
          <SignupForm lang={lang} source={source} kit compact button={c.btn} smallPrint={c.small}
                      success={<p style={{ margin: 0 }}><strong>{c.ok}</strong></p>} />
        </div>
      </div>
    </section>
  );
}

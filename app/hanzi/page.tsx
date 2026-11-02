import type { Metadata } from "next";
import plan from "@/content/hanzi-lunch.json";
import HanziPlan from "./HanziPlan";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "汉字学习·午餐秘密游戏", description: "30张午餐纸条，工作日每天认3—4个字：早上教法、午餐独立阅读、放学游戏。" };

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function HanziPage() {
  const i = plan.intro;
  return (
    <>
      <a href="/" className="back-link">← 返回首页</a>
      <h1>汉字学习·午餐秘密游戏</h1>
      <p className="lead">{i.lead}</p>
      <HanziPlan days={plan.days as any} initialToday={today()} />
      <section className="card" style={{ marginTop: 24 }}>
        <h2 className="card__title">完整玩法</h2>
        <p><strong>早上1–2分钟教法：</strong>{i.method}</p>
        <p>{i.mastery}</p>
        <p>{i.polyphones}</p>
        <p>{i.safety}</p>
        <p>{i.structure}</p>
        <p>{i.charcheck}</p>
        <p>{i.dates}</p>
        <h3>70字清单</h3>
        <div style={{ fontSize: "1.5rem", letterSpacing: "0.25em", lineHeight: 1.6 }}>{i.chars70.join("")}</div>
      </section>
    </>
  );
}

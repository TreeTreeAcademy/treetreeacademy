"use client";
import { useEffect, useState } from "react";

type Day = { no: string; date: string; dateLabel: string; weekday: string; theme: string; kind: "new" | "review"; chars: string[]; text: string; hint: string; morning: string; afterschool: string };

export function chicagoToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function Card({ d, state }: { d: Day; state: "past" | "today" | "future" }) {
  return (
    <article id={`day-${d.no}`} className="card" style={{ opacity: state === "past" ? 0.5 : 1, border: state === "today" ? "2px solid #2f7d4f" : undefined, marginBottom: 16 }}>
      <div className="card__eyebrow">
        <span className="badge">{d.no}</span>
        <span className="meta">{d.dateLabel} {d.weekday}{state === "today" ? " · 今天" : ""}</span>
      </div>
      <h3 className="card__title" style={{ fontSize: "1.15rem" }}>{d.no} · {d.dateLabel}　{d.theme}</h3>
      <div style={{ fontSize: "0.85rem", color: "#666" }}>{d.kind === "new" ? "新字" : "复习字"}</div>
      <div style={{ fontSize: "2.6rem", letterSpacing: "0.3em", lineHeight: 1.3, fontWeight: 700 }}>{d.chars.join("")}</div>
      <p style={{ fontSize: "1.15rem", margin: "8px 0" }}>{d.text}</p>
      <p style={{ color: "#999", fontSize: "0.95rem", margin: "4px 0 12px" }}>{d.hint}</p>
      <p><strong>🌅 早上教法（7:00）：</strong>{d.morning}</p>
      <p><strong>🎒 放学玩法（2:50）：</strong>{d.afterschool}</p>
    </article>
  );
}

export default function HanziPlan({ days, initialToday }: { days: Day[]; initialToday: string }) {
  const [today, setToday] = useState(initialToday);
  useEffect(() => setToday(chicagoToday()), []);
  const st = (d: Day) => (d.date < today ? "past" : d.date === today ? "today" : "future");
  const todayCard = days.find((d) => d.date === today) ?? days.find((d) => d.date > today);
  const weeks: Day[][] = [];
  days.forEach((d, i) => { if (i % 5 === 0) weeks.push([]); weeks[weeks.length - 1].push(d); });
  return (
    <>
      <section style={{ margin: "16px 0" }}>
        <div className="section-label">{todayCard?.date === today ? "今天" : "下一张"}</div>
        {todayCard ? <Card d={todayCard} state={todayCard.date === today ? "today" : "future"} /> : <div className="empty-state">30 张纸条已全部完成 🎉</div>}
      </section>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 20px" }}>
        {weeks.map((w, i) => (
          <a key={i} href={`#week-${i + 1}`} className="btn btn--ghost">第{i + 1}周 {w[0].dateLabel}</a>
        ))}
      </nav>
      {weeks.map((w, i) => (
        <section key={i} id={`week-${i + 1}`}>
          <div className="section-label">第{i + 1}周 · {w[0].dateLabel}–{w[w.length - 1].dateLabel}</div>
          {w.map((d) => <Card key={d.no} d={d} state={st(d)} />)}
        </section>
      ))}
    </>
  );
}

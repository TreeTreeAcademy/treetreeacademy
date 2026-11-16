"use client";
import { useState } from "react";
import SignupForm from "./SignupForm";

type Lang = "zh" | "en";
type Ans = "yes" | "no" | null;
type Result = "vocab" | "confidence" | "habit" | "none";

const COPY = {
  zh: {
    intro: "先做自查，3 分钟，就知道从哪一步开始。",
    yes: "是",
    no: "不是",
    qs: [
      ["词汇", "孩子不用帮忙，能自己用中文说出 10 个日常的东西吗？比如：水、饭、鞋子、累。"],
      ["信心", "孩子一说错，就停下来不说了吗？"],
      ["习惯", "你说中文，孩子还是回你英文吗？"],
    ],
    see: "看结果",
    results: {
      vocab: ["卡在：词汇", "孩子听得懂的，比能说出来的多。", "第一步：只教一个场景的 10 个词。今晚就试一句：我要喝水。"],
      confidence: ["卡在：信心", "孩子会这些词，但怕说错。", "第一步：先回应孩子想说的意思，再用对的说法说一遍，只说一遍。一次只纠一个音。"],
      habit: ["卡在：习惯", "孩子会说，但在家说英文更快。", "第一步：固定一个说中文的时间，比如晚饭。每顿晚饭，问一个问题。"],
      none: ["这三处都没明显卡住", "", "【待 Jing 填写：三题都没卡住时给家长的一句话和下一步】"],
    } as Record<Result, [string, string, string]>,
    close: "一个原因，一个第一步。就从这里开始。",
  },
  en: {
    intro: "Take the check first — it takes 3 minutes, and it tells you which day to start with.",
    yes: "Yes",
    no: "No",
    qs: [
      ["Vocabulary", "Can your child say 10 everyday things in Mandarin, without help? Water, food, shoes, tired."],
      ["Confidence", "Does your child stop when they make a mistake?"],
      ["Habit", "Does your child answer in English, even when you speak Mandarin?"],
    ],
    see: "See my result",
    results: {
      vocab: ["Vocabulary", "Your child understands more than they can say.", "First step: teach 10 words for one scene only. Try it tonight: 我要喝水。"],
      confidence: ["Confidence", "Your child knows the words but is afraid of getting them wrong.", "First step: answer what they meant first, then say it back the right way, once. Fix one sound only."],
      habit: ["Habit", "Your child can say it, but English is faster at home.", "First step: pick one fixed time for Mandarin — dinner, for example. One question, every dinner."],
      none: ["No clear stuck place", "", "[TODO Jing: one line for parents who answered Yes / No / No]"],
    } as Record<Result, [string, string, string]>,
    close: "One cause. One first step. That is how you start.",
  },
};

// 判断规则（自查表原文）：Q1 否 = 词汇；Q1 是 + Q2 是 = 信心；Q1 是 + Q2 否 + Q3 是 = 习惯。
function judge(a: Ans[]): Result {
  if (a[0] === "no") return "vocab";
  if (a[1] === "yes") return "confidence";
  if (a[2] === "yes") return "habit";
  return "none";
}

export default function StartFlow({
  lang,
  form,
}: {
  lang: Lang;
  form: { source: string; button: string; smallPrint: string; success: React.ReactNode; showWechat?: boolean; title: string };
}) {
  const c = COPY[lang];
  const [ans, setAns] = useState<Ans[]>([null, null, null]);
  const [shown, setShown] = useState(false);
  const done = ans.every((x) => x);
  const res = done ? judge(ans) : null;

  return (
    <>
      <section className="lp-check" id="check">
        <p className="lp-check__intro">{c.intro}</p>
        <ol className="lp-check__list">
          {c.qs.map(([tag, q], i) => (
            <li key={tag}>
              <p><strong>{tag}</strong> — {q}</p>
              <div className="lp-check__btns" role="group" aria-label={tag}>
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={"lp-pill" + (ans[i] === v ? " lp-pill--on" : "")}
                    aria-pressed={ans[i] === v}
                    onClick={() => { const n = [...ans]; n[i] = v; setAns(n); setShown(false); }}
                  >
                    {v === "yes" ? c.yes : c.no}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn--primary" disabled={!done} onClick={() => setShown(true)}>
          {c.see}
        </button>
        {shown && res && (
          <div className="lp-result" aria-live="polite">
            <h3>{c.results[res][0]}</h3>
            {c.results[res][1] && <p>{c.results[res][1]}</p>}
            <p><strong>{c.results[res][2]}</strong></p>
            <p className="meta">{c.close}</p>
          </div>
        )}
      </section>

      <section className="lp-box" id="form">
        <h2>{form.title}</h2>
        <SignupForm
          lang={lang}
          source={form.source}
          result={shown && res ? res : ""}
          button={form.button}
          smallPrint={form.smallPrint}
          success={form.success}
          showWechat={form.showWechat}
        />
      </section>
    </>
  );
}

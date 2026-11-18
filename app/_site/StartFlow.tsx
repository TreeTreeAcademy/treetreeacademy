"use client";
import { useState } from "react";
import SignupForm from "./SignupForm";

type Lang = "zh" | "en";
type Ans = "yes" | "no" | null;
type Result = "vocab" | "confidence" | "habit" | "none";

const COPY = {
  zh: {
    intro: "先测 3 分钟，知道孩子卡在哪，再领启动包。",
    rule: "怎么看结果：第 1 题答“不能”= 词汇，哪怕第 2、3 题也是。第 1 题能 + 第 2 题会停 = 信心。第 1 题能 + 第 2 题不会停 + 第 3 题还是英文 = 习惯。",
    yes: "是",
    no: "不是",
    qs: [
      ["词汇", "孩子能不用帮忙，用中文说出 10 个日常的东西吗？水、饭、鞋子、累了。"],
      ["信心", "孩子说错了，会停下来不敢说了吗？"],
      ["习惯", "你说中文，孩子还是用英文答你吗？"],
    ],
    see: "看结果",
    results: {
      vocab: ["卡在：词汇", "孩子听得懂的比会说的多。", "第一步：只教一个场景的 10 个词。今晚就试一句：我要喝水。"],
      confidence: ["卡在：信心", "孩子会说，但怕说错。", "第一步：先接住他想说的意思，再用正确的说法说一遍，只纠一个音。"],
      habit: ["卡在：习惯", "孩子会说，但家里英文更快。", "第一步：固定一个中文时间，比如晚饭，一顿饭只问一个问题。"],
      none: ["这三处都没明显卡住", "", "【待 Jing 填写：三题都没卡住时给家长的一句话和下一步】"],
    } as Record<Result, [string, string, string]>,
    close: "一个卡点，一个第一步。这就是从哪开始。",
  },
  en: {
    intro: "Take the check first — it takes 3 minutes, and it tells you which day to start with.",
    rule: "How to read your answer: No on Question 1 = Vocabulary, even if you also said Yes to 2 or 3. Yes on 1, Yes on 2 = Confidence. Yes on 1, No on 2, Yes on 3 = Habit.",
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
  form: { source: string; button: string; smallPrint: string; success: React.ReactNode; title: string };
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
        <p className="lp-check__rule">{c.rule}</p>
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
          kit
        />
      </section>
    </>
  );
}

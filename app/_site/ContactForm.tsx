"use client";
import { useState } from "react";

const T = {
  zh: {
    name: "称呼", namePh: "怎么称呼你",
    email: "邮箱（必填，我会回复到这里）",
    age: "孩子年龄（选填）", agePh: "比如：6 岁、4 岁和 8 岁",
    msg: "留言（必填）",
    msgPh: "说说你家现在的情况：孩子平时用什么语言回答你？你们已经试过哪些方法？最想先解决什么？",
    btn: "发送留言", sending: "发送中…",
    ok: "收到你的留言了，我会定期一封封回复。",
    errEmail: "请填写正确的邮箱。", errMsg: "请写几句留言。", err: "发送没成功，请稍后再试。",
  },
  en: {
    name: "Name", namePh: "What should I call you?",
    email: "Email (required — I'll reply here)",
    age: "Child's age (optional)", agePh: "e.g. 6, or 4 and 8",
    msg: "Message (required)",
    msgPh: "Tell me where things are: what language does your child answer you in? What have you tried so far? What would you most like help with?",
    btn: "Send message", sending: "Sending…",
    ok: "Got it — I read every message and reply personally.",
    errEmail: "Please enter a valid email address.", errMsg: "Please write a short message.", err: "Something went wrong. Please try again in a minute.",
  },
};

export default function ContactForm({ lang = "zh" }: { lang?: "zh" | "en" }) {
  const t = T[lang];
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"), email: fd.get("email"), age: fd.get("age"),
          message: fd.get("message"), website: fd.get("website") || "", lang,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error === "email" ? t.errEmail : j.error === "message" ? t.errMsg : t.err);
      setState("done");
    } catch (err) {
      setMsg(err instanceof Error && err.name !== "TypeError" ? err.message : t.err);
      setState("error");
    }
  }

  if (state === "done") return <div className="lp-success" role="status"><p style={{ margin: 0, fontWeight: 600 }}>{t.ok}</p></div>;

  return (
    <form className="lp-form ct-form" onSubmit={onSubmit}>
      <label><span>{t.name}</span><input name="name" autoComplete="given-name" maxLength={60} placeholder={t.namePh} /></label>
      <label><span>{t.email}</span><input name="email" type="email" required autoComplete="email" inputMode="email" maxLength={120} /></label>
      <label><span>{t.age}</span><input name="age" maxLength={40} placeholder={t.agePh} /></label>
      <label><span>{t.msg}</span><textarea name="message" required maxLength={2000} placeholder={t.msgPh} /></label>
      {/* honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" className="lp-hp" aria-hidden="true" />
      <button className="btn btn--primary lp-form__btn" disabled={state === "sending"}>{state === "sending" ? t.sending : t.btn}</button>
      {state === "error" && <p className="lp-form__err" role="alert">{msg || t.err}</p>}
    </form>
  );
}

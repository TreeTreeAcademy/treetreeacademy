"use client";
import { useState } from "react";

type Lang = "zh" | "en";

const T = {
  zh: {
    name: "怎么称呼你",
    email: "邮箱（必填）",
    wechat: "微信号（选填）",
    sending: "提交中…",
    err: "提交没成功，请稍后再试。",
  },
  en: {
    name: "Name",
    email: "Email",
    wechat: "",
    sending: "Sending…",
    err: "That didn't go through. Please try again in a minute.",
  },
};

export default function SignupForm({
  lang = "zh",
  source,
  result = "",
  button,
  smallPrint,
  success,
  showWechat = false,
}: {
  lang?: Lang;
  source: string;
  result?: string;
  button: string;
  smallPrint?: string;
  success: React.ReactNode;
  showWechat?: boolean;
}) {
  const t = T[lang];
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          wechat: fd.get("wechat") || "",
          website: fd.get("website") || "",
          source,
          result,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || t.err);
      setState("done");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t.err);
      setState("error");
    }
  }

  if (state === "done") return <div className="lp-success">{success}</div>;

  return (
    <form className="lp-form" onSubmit={onSubmit}>
      <label>
        <span>{t.name}</span>
        <input name="name" autoComplete="given-name" maxLength={60} />
      </label>
      <label>
        <span>{t.email}</span>
        <input name="email" type="email" required autoComplete="email" inputMode="email" maxLength={120} />
      </label>
      {showWechat && (
        <label>
          <span>{t.wechat}</span>
          <input name="wechat" maxLength={60} />
        </label>
      )}
      {/* honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" className="lp-hp" aria-hidden="true" />
      <button className="btn btn--primary lp-form__btn" disabled={state === "sending"}>
        {state === "sending" ? t.sending : button}
      </button>
      {state === "error" && <p className="lp-form__err">{msg || t.err}</p>}
      {smallPrint && <p className="lp-form__small">{smallPrint}</p>}
    </form>
  );
}

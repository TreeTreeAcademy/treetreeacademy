"use client";
import { KIT_FORMS } from "@/lib/site/kit";
import { useState } from "react";

type Lang = "zh" | "en";

const T = {
  zh: {
    name: "姓名（选填）",
    email: "邮箱 Email（必填）",
    sending: "提交中…",
    err: "提交没成功，请稍后再试。",
  },
  en: {
    name: "Name (optional)",
    email: "Email",
    sending: "Sending…",
    err: "Something went wrong. Please try again in a minute.",
  },
};

export default function SignupForm({
  lang = "zh",
  source,
  result = "",
  button,
  smallPrint,
  success,
  kit = false,
  compact = false,
}: {
  lang?: Lang;
  source: string;
  result?: string;
  button: string;
  smallPrint?: string;
  success: React.ReactNode;
  /** Send to Kit (7-day kit) via /api/kit-subscribe instead of the plain waitlist. */
  kit?: boolean;
  /** Email-only inline form (lead-magnet block). */
  compact?: boolean;
}) {
  const t = T[lang];
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    try {
      // Kit: submit from the visitor's browser (server-side posts get quarantined by Kit's bot guard).
      let kitStatus = "";
      let guardUrl = "";
      if (kit && !fd.get("website")) {
        const email = String(fd.get("email") || "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error(lang === "en" ? "Please enter a valid email address." : "请填写正确的邮箱。");
        const body = new URLSearchParams({ email_address: email });
        const nm = String(fd.get("name") || "").trim();
        if (nm) body.set("fields[first_name]", nm);
        try {
          const kr = await fetch(`https://app.kit.com/forms/${KIT_FORMS[lang].id}/subscriptions`, {
            method: "POST", headers: { Accept: "application/json" }, body,
          });
          const kj = (await kr.json().catch(() => ({}))) as { status?: string; url?: string };
          kitStatus = kj.status || `http_${kr.status}`;
          guardUrl = kj.status === "quarantined" && kj.url ? kj.url : "";
        } catch { kitStatus = "network"; }
        if (kitStatus === "failed") throw new Error(lang === "en" ? "Please enter a valid email address." : "请填写正确的邮箱。");
      }
      const r = await fetch(kit ? "/api/kit-subscribe" : "/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          website: fd.get("website") || "",
          source,
          result,
          lang,
          ...(kit ? { kitClient: kitStatus || "skip" } : {}),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (lang === "en") throw new Error(r.status === 400 ? "Please enter a valid email address." : t.err);
        if (j.error === "email") throw new Error("请填写正确的邮箱。");
        if (kit) throw new Error(t.err);
        throw new Error(j.error || t.err);
      }
      if (guardUrl) { window.location.href = guardUrl; return; }
      setState("done");
    } catch (err) {
      setMsg(err instanceof Error && !(lang === "en" && err.name === "TypeError") ? err.message : t.err);
      setState("error");
    }
  }

  if (state === "done") return <div className="lp-success">{success}</div>;

  if (compact) {
    return (
      <form className="lp-form kit-form" onSubmit={onSubmit}>
        <div className="kit-form__row">
          <input name="email" type="email" required autoComplete="email" inputMode="email" maxLength={120}
                 placeholder={lang === "en" ? "Your email" : "你的邮箱"} aria-label={lang === "en" ? "Email" : "邮箱"} />
          <button className="btn btn--primary lp-form__btn" disabled={state === "sending"}>
            {state === "sending" ? t.sending : button}
          </button>
        </div>
        <input name="website" tabIndex={-1} autoComplete="off" className="lp-hp" aria-hidden="true" />
        {state === "error" && <p className="lp-form__err" role="alert">{msg || t.err}</p>}
        {smallPrint && <p className="lp-form__small">{smallPrint}</p>}
      </form>
    );
  }

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

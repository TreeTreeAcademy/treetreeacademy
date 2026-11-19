"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// zh ↔ en page pairs. English "home" is /en/start (there is no /en homepage).
const PAIRS: [string, string][] = [
  ["/start", "/en/start"],
  ["/workshop", "/en/workshop"],
  ["/contact", "/en/contact"],
  ["/members", "/en/members"],
];
export const LANG_KEY = "tta-lang";
const DISMISS_KEY = "tta-lang-banner-dismissed";

export function otherLangHref(path: string): { lang: "zh" | "en"; href: string } {
  const p = (path || "/").replace(/\/$/, "") || "/";
  if (p === "/en" || p.startsWith("/en/")) {
    const hit = PAIRS.find(([, en]) => en === p);
    return { lang: "zh", href: hit ? hit[0] : "/" };
  }
  const hit = PAIRS.find(([zh]) => zh === p);
  return { lang: "en", href: hit ? hit[1] : "/en/start" };
}

function remember(lang: "zh" | "en") {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
}

/** Header button: "English" on Chinese pages, "中文" on English pages. */
export function LangSwitch({ className = "site-nav__lang" }: { className?: string }) {
  const { lang, href } = otherLangHref(usePathname() || "/");
  return (
    <a href={href} className={className} lang={lang === "en" ? "en" : "zh-CN"} hrefLang={lang === "en" ? "en" : "zh-CN"}
       onClick={() => remember(lang)}>
      {lang === "en" ? "English" : "中文"}
    </a>
  );
}

/** Footer backup pair: 中文 / English. */
export function FooterLangPair() {
  const path = usePathname() || "/";
  const o = otherLangHref(path);
  const onEn = o.lang === "zh";
  const zhHref = onEn ? o.href : path;
  const enHref = onEn ? path : o.href;
  return (
    <p className="lang-pair">
      <a href={zhHref} lang="zh-CN" hrefLang="zh-CN" aria-current={!onEn ? "true" : undefined} onClick={() => remember("zh")}>中文</a>
      <span aria-hidden="true"> / </span>
      <a href={enHref} lang="en" hrefLang="en" aria-current={onEn ? "true" : undefined} onClick={() => remember("en")}>English</a>
    </p>
  );
}

/** Suggestion banner on Chinese pages for English-language browsers. Never redirects. */
export function LangBanner() {
  const path = usePathname() || "/";
  const [show, setShow] = useState(false);
  const o = otherLangHref(path);
  useEffect(() => {
    if (o.lang !== "en") { setShow(false); return; }
    try {
      if (localStorage.getItem(LANG_KEY) || localStorage.getItem(DISMISS_KEY)) return;
    } catch { return; }
    if ((navigator.language || "").toLowerCase().startsWith("en")) setShow(true);
  }, [o.lang]);
  if (!show) return null;
  return (
    <div className="lang-banner" role="region" aria-label="Language" lang="en">
      <span>This site is also in English →</span>
      <a href={o.href} hrefLang="en" onClick={() => remember("en")}>Continue in English</a>
      <button type="button" aria-label="Dismiss" onClick={() => { try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ } setShow(false); }}>×</button>
    </div>
  );
}

import { SOCIAL, contactHref, type Platform } from "@/lib/site/social";
import { BRAND_PATHS } from "./brandIcons";
import SphCopy from "./SphCopy";

// Official brand colours.
const COLOR: Record<Platform | "wechat", string> = {
  instagram: "url(#ig-grad)",
  youtube: "#FF0000",
  facebook: "#0866FF",
  tiktok: "#000000",
  xiaohongshu: "#FF2442",
  wechat: "#07C160",
};

export function BrandIcon({ kind, size = 22 }: { kind: Platform | "wechat"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {kind === "instagram" && (
        <defs>
          <radialGradient id="ig-grad" cx="0.3" cy="1.07" r="1.2">
            <stop offset="0" stopColor="#FFDD55" />
            <stop offset="0.1" stopColor="#FFDD55" />
            <stop offset="0.5" stopColor="#FF543E" />
            <stop offset="1" stopColor="#C837AB" />
          </radialGradient>
        </defs>
      )}
      {kind === "xiaohongshu" ? (
        // 小红书 app icon: white wordmark on the brand-red rounded square
        <>
          <rect width="24" height="24" rx="5.5" fill={COLOR.xiaohongshu} />
          <path d={BRAND_PATHS.xiaohongshu} fill="#fff" transform="translate(1.2 1.2) scale(0.9)" />
        </>
      ) : (
        <path d={BRAND_PATHS[kind]} fill={COLOR[kind]} />
      )}
    </svg>
  );
}

export function SocialLinks({ lang = "zh", sph = lang === "zh" }: { lang?: "zh" | "en"; sph?: boolean }) {
  const pre = lang === "en" ? "Tree Tree Academy on " : "晶晶的";
  return (
    <div className="soc">
      <ul className="soc-list">
        {SOCIAL[lang].map((s) => (
          <li key={s.href}>
            <a href={s.href} target="_blank" rel="noopener noreferrer" className="soc-btn"
               aria-label={`${pre}${s.label}${lang === "en" ? " (opens in a new tab)" : "（新窗口打开）"}`}>
              <BrandIcon kind={s.kind} /><span>{s.label}</span>
            </a>
          </li>
        ))}
      </ul>
      {sph && <SphCopy icon={<BrandIcon kind="wechat" />} />}
    </div>
  );
}

export function ContactLink({ lang = "zh" }: { lang?: "zh" | "en" }) {
  return (
    <a href={contactHref(lang)} className="soc-contact">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H8l-4 4V6a2 2 0 012-2z" opacity=".15"/><path d="M4 3h16a3 3 0 013 3v10a3 3 0 01-3 3H8.4L3 23V6a3 3 0 013-3zm0 2a1 1 0 00-1 1v12.2L7.6 17H20a1 1 0 001-1V6a1 1 0 00-1-1zm3 4h10v2H7zm0 4h7v2H7z"/></svg>
      <span>{lang === "en" ? "Message Jing" : "给晶晶留言"}</span>
    </a>
  );
}

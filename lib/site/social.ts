// Jing's accounts (from her account list, updated 2026-11-18).
export type Platform = "instagram" | "youtube" | "facebook" | "tiktok" | "xiaohongshu";

export const SOCIAL: Record<"zh" | "en", { kind: Platform; label: string; href: string }[]> = {
  en: [
    { kind: "instagram", label: "Instagram", href: "https://www.instagram.com/mandarinmamaruby/" },
    { kind: "youtube", label: "YouTube", href: "https://www.youtube.com/@mandarinmamaruby" },
    { kind: "facebook", label: "Facebook", href: "https://www.facebook.com/mandarinmamaruby" },
    { kind: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@mandarinmamaruby" },
  ],
  zh: [
    { kind: "youtube", label: "YouTube", href: "https://www.youtube.com/@jingjingrwby" },
    { kind: "xiaohongshu", label: "小红书", href: "https://www.xiaohongshu.com/user/profile/599703a882ec393e158fbecb" },
  ],
};

export const SPH_ID = "sph27n4Tn8zG8Ls"; // 视频号 ID (no public link)

export const contactHref = (lang: "zh" | "en") => (lang === "en" ? "/en/contact" : "/contact");
export const CONTACT_KEY = "site:contact:v1"; // Upstash list for site messages

// Jing's accounts (from her account list, 2026-11-18) and contact email.
export const CONTACT_EMAIL = "jingtreetreeacademy@gmail.com";

export const SOCIAL = {
  en: [
    { kind: "instagram", label: "Instagram @mandarinmamaruby", href: "https://www.instagram.com/mandarinmamaruby/" },
    { kind: "youtube", label: "YouTube @mandarinmamaruby", href: "https://www.youtube.com/@mandarinmamaruby" },
  ],
  zh: [
    { kind: "youtube", label: "YouTube @jingjingrwby", href: "https://www.youtube.com/@jingjingrwby" },
    { kind: "xhs", label: "小红书", href: "https://www.xiaohongshu.com/user/profile/599703a882ec393e158fbecb" },
  ],
} as const;

export const SPH_ID = "sph27n4Tn8zG8Ls"; // 视频号 ID (no public link)

const BODY = {
  zh: "你好晶晶，\n\n孩子年龄：\n孩子平时用什么语言回答你：\n我们已经试过的方法：\n我最想解决的问题：\n\n",
  en: "Hi Jing,\n\nMy child's age:\nWhat language they usually answer in:\nWhat we've tried so far:\nWhat I'd most like help with:\n\n",
};

export function mailto(lang: "zh" | "en") {
  const subject = lang === "zh" ? "我家孩子的中文情况" : "About my child's Chinese";
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(BODY[lang])}`;
}

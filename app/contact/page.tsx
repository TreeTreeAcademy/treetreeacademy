import type { Metadata } from "next";
import ContactPage from "../_site/ContactPage";

export const metadata: Metadata = {
  title: "给晶晶留言",
  description: "说说你家孩子现在的中文情况，晶晶会定期一封封回复。",
  alternates: { canonical: "/contact", languages: { "zh-CN": "/contact", en: "/en/contact" } },
};

export default function Page() { return <ContactPage lang="zh" />; }

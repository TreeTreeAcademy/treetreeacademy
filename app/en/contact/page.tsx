import type { Metadata } from "next";
import ContactPage from "../../_site/ContactPage";

export const metadata: Metadata = {
  title: { absolute: "Message Jing | Tree Tree Academy" },
  description: "Tell Jing where your child is with Chinese right now. She reads every message and replies personally.",
  alternates: { canonical: "/en/contact", languages: { "zh-CN": "/contact", en: "/en/contact" } },
};

export default function Page() { return <ContactPage lang="en" />; }

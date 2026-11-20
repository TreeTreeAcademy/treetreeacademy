import type { Metadata } from "next";
import AboutJing from "../_site/AboutJing";

export const metadata: Metadata = {
  title: { absolute: "关于我｜树儿学院 Tree Tree Academy" },
  description:
    "汉语言文学专业本科毕业后，晶晶在武汉重点高中教语文，后来到美国俄亥俄州的大学教中文。过去十二年，她一直在看一门语言怎样在一群人身上扎根。现在，她是两个中英双语流利孩子的妈妈。",
  alternates: { canonical: "/about", languages: { "zh-CN": "/about", en: "/en/about" } },
};

export default function AboutPage() {
  return (
    <div className="lp-page">
      <section className="lp-band lp-band--white">
        <div className="lp-wrap">
          <AboutJing />
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import AboutJing from "../../_site/AboutJing";

export const metadata: Metadata = {
  title: { absolute: "About Jing | Tree Tree Academy" },
  description:
    "I'm Jing — like Jinglebell. I taught Chinese at a top high school in Wuhan, China, then at a university in Ohio. For twelve years I've watched how a language takes root in a group of people and grows into a tree that gives shade. Today I'm the mom of two kids who speak English and Mandarin fluently.",
  alternates: { canonical: "/en/about", languages: { "zh-CN": "/about", en: "/en/about" } },
};

export default function EnAboutPage() {
  return (
    <div className="lp-page">
      <section className="lp-band lp-band--white">
        <div className="lp-wrap">
          <AboutJing lang="en" />
        </div>
      </section>
    </div>
  );
}

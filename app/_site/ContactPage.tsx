import ContactForm from "./ContactForm";
import { SocialLinks } from "./Social";
import { PHOTOS, asset } from "@/lib/site/assets";

const C = {
  zh: {
    eyebrow: "联系我", h1: "给晶晶留言",
    lead: "说说你家孩子现在的中文情况。不用写得很完整，几句话就好。",
    small: "我会定期一封封回复。", follow: "关注我", toggle: ["/en/contact", "English →"],
  },
  en: {
    eyebrow: "Contact", h1: "Message Jing",
    lead: "Tell me where your child is with Chinese right now. It doesn't need to be polished — a few sentences is plenty.",
    small: "I read every message and reply personally.", follow: "Follow along", toggle: ["/contact", "中文版 →"],
  },
};

export default function ContactPage({ lang }: { lang: "zh" | "en" }) {
  const c = C[lang];
  const photo = asset(PHOTOS.about);
  return (
    <div className="lp-page" lang={lang === "en" ? "en" : undefined}>
      <section className="lp-band lp-band--hero">
        <div className="lp-wrap ct-wrap">
          <div className="ct-side">
            <p className="lp-small"><a href={c.toggle[0]} lang={lang === "en" ? "zh-CN" : "en"}>{c.toggle[1]}</a></p>
            <p className="lp-eyebrow">{c.eyebrow}</p>
            <h1 className="lp-h1 lp-h1--md">{c.h1}</h1>
            <p className="lp-sub">{c.lead}</p>
            {photo && <img src={photo} alt={lang === "en" ? "Jing" : "晶晶"} width={720} height={900} />}
          </div>
          <div className="lp-card">
            <ContactForm lang={lang} />
            <p className="lp-form__small" style={{ marginTop: 12 }}>{c.small}</p>
            <div className="ab-follow ct-follow">
              <p className="ab-follow__h">{c.follow}</p>
              <SocialLinks lang={lang} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

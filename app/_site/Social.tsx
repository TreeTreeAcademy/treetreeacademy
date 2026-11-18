import { SOCIAL, CONTACT_EMAIL } from "@/lib/site/social";
import SphCopy from "./SphCopy";

const S = { width: 22, height: 22, viewBox: "0 0 24 24", "aria-hidden": true, fill: "currentColor" };
const ICONS: Record<string, React.ReactNode> = {
  instagram: (<svg {...S}><path d="M12 7.3A4.7 4.7 0 1012 16.7 4.7 4.7 0 0012 7.3zm0 7.7a3 3 0 110-6 3 3 0 010 6zm4.9-7.9a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0zM12 3.6c2.7 0 3 0 4.1.1 2.7.1 4 1.4 4.1 4.1.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 2.7-1.4 4-4.1 4.1-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-2.7-.1-4-1.4-4.1-4.1C3.7 15 3.6 14.7 3.6 12s0-3 .1-4.1C3.8 5.2 5.1 3.9 7.8 3.8 9 3.7 9.3 3.6 12 3.6zM12 2C9.3 2 8.9 2 7.8 2.1 4.1 2.3 2.3 4.1 2.1 7.8 2 8.9 2 9.3 2 12s0 3.1.1 4.2c.2 3.7 2 5.5 5.7 5.7 1.1.1 1.5.1 4.2.1s3.1 0 4.2-.1c3.7-.2 5.5-2 5.7-5.7.1-1.1.1-1.5.1-4.2s0-3.1-.1-4.2c-.2-3.7-2-5.5-5.7-5.7C15.1 2 14.7 2 12 2z" /></svg>),
  youtube: (<svg {...S}><path d="M23 7.2a3 3 0 00-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 001 7.2 31 31 0 00.5 12a31 31 0 00.5 4.8 3 3 0 002.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 002.1-2.1 31 31 0 00.5-4.8 31 31 0 00-.5-4.8zM9.8 15.1V8.9L15.6 12z" /></svg>),
  xhs: (<svg {...S}><rect x="2" y="2" width="20" height="20" rx="5" /><text x="12" y="15.6" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#fff" fontFamily="sans-serif">小红书</text></svg>),
  mail: (<svg {...S}><path d="M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm9 7.2L4 7.3V17h16V7.3zM5.2 7l6.8 4.2L18.8 7z" /></svg>),
};

export function SocialLinks({ lang = "zh", sph = lang === "zh" }: { lang?: "zh" | "en"; sph?: boolean }) {
  return (
    <div className="soc">
      <ul className="soc-list">
        {SOCIAL[lang].map((s) => (
          <li key={s.href}>
            <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className="soc-link">
              {ICONS[s.kind]}<span className="soc-text">{s.label}</span>
            </a>
          </li>
        ))}
      </ul>
      {sph && <SphCopy />}
    </div>
  );
}

export function EmailLink({ label }: { label?: string }) {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="soc-link soc-mail">{ICONS.mail}<span className="soc-text">{label ?? CONTACT_EMAIL}</span></a>
  );
}

import type { Metadata } from "next";
import { SocialLinks, ContactLink } from "../_site/Social";

// English section (/en/*). The root layout's header/footer are Chinese; on /en pages they are hidden
// with CSS (body:has(.en-section)) and this layout renders English chrome instead.
// The inline script switches <html lang> to "en"; the wrapper also carries lang="en".
export const metadata: Metadata = {
  title: { default: "Tree Tree Academy", template: "%s | Tree Tree Academy" },
  description:
    "Help your child actually speak the Chinese they understand. Simple, 15-minute daily steps for heritage-Chinese and mixed-heritage families, from Jing, a former Chinese teacher raising two bilingual kids.",
  openGraph: { siteName: "Tree Tree Academy", locale: "en_US", type: "website" },
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div lang="en" className="en-section">
      <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.lang="en"' }} />
      <header className="site-header en-header">
        <div className="site-header__inner">
          <a href="/en/start" className="site-logo">
            <img src="/brand/logo-header.webp" alt="Tree Tree Academy" width={150} height={56} className="site-logo__full" />
          </a>
          <nav className="site-nav" aria-label="Main">
            <a href="/en/start">Free Starter Kit</a>
            <a href="/en/workshop">Live Workshop</a>
            <a href="https://www.etsy.com/shop/TreeTreeLab" target="_blank" rel="noopener noreferrer" className="site-nav__shop" aria-label="Shop: Tree Tree Lab on Etsy (opens in a new tab)">Shop<span aria-hidden="true">↗</span></a>
            <a href="/" lang="zh-CN" className="site-nav__learn">中文</a>
          </nav>
        </div>
      </header>
      {children}
      <footer className="site-footer en-footer">
        <div className="site-footer__inner site-footer__grid">
          <div>
            <img src="/brand/logo-header.webp" alt="Tree Tree Academy" width={150} height={56} className="site-footer__logo" />
            <p>Helping heritage-Chinese and mixed-heritage families keep Chinese alive at home.</p>
            <p className="site-footer__h">Follow along</p>
            <SocialLinks lang="en" />
            <p className="site-footer__h" style={{ marginTop: "0.8rem" }}>Contact</p>
            <p><ContactLink lang="en" /></p>
          </div>
          <div>
            <p className="site-footer__h">Get started</p>
            <p><a href="/en/start">Free 7-Day Starter Kit</a></p>
            <p><a href="/en/workshop">Live workshop · Join the waitlist</a></p>
          </div>
          <div>
            <p className="site-footer__h">In Chinese</p>
            <p><a href="/">Chinese homepage</a></p>
            <p><a href="/workshop">Chinese-language workshop</a></p>
          </div>
          <div className="site-footer__fine">
            <p>© {year} Tree Tree Academy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

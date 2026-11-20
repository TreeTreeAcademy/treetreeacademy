import type { Metadata } from "next";
import "./globals.css";
import { SocialLinks, ContactLink } from "./_site/Social";
import { LangSwitch, FooterLangPair, LangBanner } from "./_site/LangSwitch";

export const metadata: Metadata = {
  title: {
    default: "树儿学院",
    template: "%s · 树儿学院",
  },
  description:
    "树儿学院：给海外华裔和混合家庭的中文传承方法。你会说中文，不等于孩子能学会中文——先找到孩子卡在词汇、信心还是习惯，再做第一步。",
  metadataBase: new URL("https://treetreeacademy.com"),
  openGraph: {
    siteName: "树儿学院",
    locale: "zh_CN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LangBanner />
        <header className="site-header">
          <div className="site-header__inner">
            <a href="/" className="site-logo">
              <img
                src="/brand/logo-header.webp"
                alt="树儿学院 Tree Tree Academy"
                width={150}
                height={56}
                className="site-logo__full"
              />
            </a>
            <div className="site-header__end">
              <nav className="site-nav" aria-label="主导航">
                <a href="/start">免费启动包</a>
                <a href="/workshop">工作坊</a>
                <a href="/members" title="需要登录">会员独享<span className="nav-lock" aria-label="需要登录">🔒</span></a>
              </nav>
              <div className="site-header__actions">
                <a href="https://www.etsy.com/shop/TreeTreeLab" target="_blank" rel="noopener noreferrer" className="site-nav__shop" aria-label="Shop：Tree Tree Lab（Etsy，新窗口打开）">Shop<span aria-hidden="true">↗</span></a>
                <LangSwitch />
              </div>
            </div>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <div className="site-footer__inner site-footer__grid">
            <div>
              <img src="/brand/logo-header.webp" alt="树儿学院 Tree Tree Academy" width={150} height={56} className="site-footer__logo" />
              <p>中文生命力：给海外华裔与混合家庭的中文传承方法。</p>
              <p className="site-footer__h">关注我</p>
              <SocialLinks lang="zh" />
              <p className="site-footer__h" style={{ marginTop: "0.8rem" }}>联系我</p>
              <p><ContactLink lang="zh" /></p>
            </div>
            <div>
              <p className="site-footer__h">开始</p>
              <p><a href="/start">免费 7 天启动包</a></p>
              <p><a href="/en/start">Free 7-Day Starter Kit (EN)</a></p>
              <p><a href="/workshop">直播工作坊 · 等候名单</a></p>
            </div>
            <div>
              <p className="site-footer__h"><a href="/members">会员独享</a>（需登录）</p>
              <p><a href="/xiaoqun">故事精听</a></p>
              <p><a href="/hanzi">汉字学习</a></p>
              <p><a href="/reader">中文共读AI陪读官</a></p>
            </div>
            <div className="site-footer__fine">
              <p>© {new Date().getFullYear()} 树儿学院 Tree Tree Academy</p>
              <FooterLangPair />
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

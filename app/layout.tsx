import type { Metadata } from "next";
import "./globals.css";
import { SocialLinks, ContactLink } from "./_site/Social";

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
            <nav className="site-nav" aria-label="主导航">
              <a href="/start">免费启动包</a>
              <a href="/workshop">工作坊</a>
              <a href="/xiaoqun" title="需要登录">小群姐姐<span className="nav-lock" aria-label="需要登录">🔒</span></a>
              <a href="/hanzi" title="需要登录">汉字学习<span className="nav-lock" aria-label="需要登录">🔒</span></a>
              <a href="/reader" className="site-nav__learn" title="需要登录">树儿读读乐<span className="nav-lock" aria-label="需要登录">🔒</span></a>
            </nav>
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
              <p className="site-footer__h">会员练习（需登录）</p>
              <p><a href="/xiaoqun">小群姐姐 · 听故事复述</a></p>
              <p><a href="/hanzi">汉字学习 · 午餐秘密游戏</a></p>
              <p><a href="/reader">树儿读读乐</a></p>
            </div>
            <div className="site-footer__fine">
              <p>
                小群姐姐栏目内容整理自小群姐姐讲故事公众号，供亲子练习使用；故事版权归原作者与出版社。
                复述方法框架参考「愿闻表达训练」思路（听后问题 · 阶段对照 · 示范跟讲）。
              </p>
              <p className="site-footer__shop">
                {/* TODO: confirm Etsy URL — no live TreeTreeLab shop found; Pinkoi has https://www.pinkoi.com/store/treetreelab */}
                <a href="https://www.etsy.com/shop/TreeTreeLab" target="_blank" rel="noopener noreferrer" className="shop-link">
                  <img src="/tree-tree-lab.png" alt="" width={36} height={36} className="shop-link__logo" />
                  <span>Tree Tree Lab</span>
                </a>
              </p>
              <p>© {new Date().getFullYear()} 树儿学院 Tree Tree Academy</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

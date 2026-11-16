import type { Metadata } from "next";
import "./globals.css";

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
              <a href="/start">免费自查</a>
              <a href="/workshop">工作坊</a>
              <a href="/xiaoqun">小群姐姐</a>
              <a href="/hanzi">汉字学习</a>
              <a href="/reader" className="site-nav__learn">树儿读读乐</a>
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <div className="site-footer__inner">
            <p>
              内容整理自小群姐姐讲故事公众号，供亲子练习使用；故事版权归原作者与出版社。
            </p>
            <p>
              复述方法框架参考「愿闻表达训练」思路（听后问题 ·
              阶段对照 · 示范跟讲）。
            </p>
            <p className="site-footer__shop">
              {/* TODO: confirm Etsy URL — no live TreeTreeLab shop found; Pinkoi has https://www.pinkoi.com/store/treetreelab */}
              <a
                href="https://www.etsy.com/shop/TreeTreeLab"
                target="_blank"
                rel="noopener noreferrer"
                className="shop-link"
              >
                <img
                  src="/tree-tree-lab.png"
                  alt=""
                  width={36}
                  height={36}
                  className="shop-link__logo"
                />
                <span>Tree Tree Lab</span>
              </a>
            </p>
            <p style={{ marginTop: "1rem" }}>
              © {new Date().getFullYear()} 树儿学院
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

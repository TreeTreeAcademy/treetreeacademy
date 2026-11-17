// English section: marks content as English and adds an English sub-nav.
// The root <html> is zh-CN (one root layout); the inline script switches it to "en" on /en pages,
// and the wrapper carries lang="en" for crawlers that don't run JS.
export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="en" className="en-section">
      <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.lang="en"' }} />
      <nav className="en-subnav" aria-label="English">
        <div className="en-subnav__inner">
          <span className="en-subnav__label">English</span>
          <a href="/en/start">Free Starter Kit</a>
          <a href="/en/workshop">Live Workshop</a>
          <a href="/" lang="zh-CN">中文首页</a>
        </div>
      </nav>
      {children}
    </div>
  );
}

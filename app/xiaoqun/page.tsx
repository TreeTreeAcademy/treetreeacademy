import { getAllEpisodes, formatDate, themeLabels } from "@/lib/episodes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "小群姐姐 · 听故事复述",
  description:
    "小群姐姐栏目工作日简报索引：故事大概、听后问题、表达阶段、示范跟讲。",
};

export default function XiaoqunIndexPage() {
  const episodes = getAllEpisodes();

  return (
    <>
      <a href="/" className="back-link">
        ← 返回首页
      </a>
      <h1>小群姐姐 · 听故事复述</h1>
      <p className="lead">
        工作日故事简报，按期更新。每期含故事大概、愿闻式听后问题、当前阶段说明与示范稿。
      </p>

      {episodes.length === 0 ? (
        <div className="empty-state">暂无简报，敬请期待。</div>
      ) : (
        <div className="card-list">
          {episodes.map((ep) => (
            <a
              key={ep.slug}
              href={`/xiaoqun/${ep.slug}`}
              className="card-link"
            >
              <article className="card">
                <div className="card__eyebrow">
                  <span className="badge">第 {ep.episode} 期</span>
                  <span className="meta">{formatDate(ep.date)}</span>
                </div>
                <h2 className="card__title" style={{ fontSize: "1.15rem" }}>
                  第 {ep.episode} 期
                </h2>
                <p className="card__themes">{themeLabels(ep)}</p>
                <ul className="card__stories">
                  {ep.stories.map((s) => (
                    <li key={s.title}>《{s.title}》</li>
                  ))}
                </ul>
              </article>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

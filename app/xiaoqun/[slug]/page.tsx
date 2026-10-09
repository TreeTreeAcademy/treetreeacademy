import {
  getAllEpisodes,
  getEpisodeBySlug,
  formatDate,
  themeLabels,
} from "@/lib/episodes";
import type { Metadata } from "next";
import { CORE_RULE_DEFAULT } from "@/lib/types";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllEpisodes().map((ep) => ({ slug: ep.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const ep = getEpisodeBySlug(slug);
  if (!ep) return { title: "未找到" };

  const title = `第${ep.episode}期 · ${formatDate(ep.date)}`;
  const description = `小群姐姐听故事复述 · ${themeLabels(ep)}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} · 小群姐姐`,
      description,
      type: "article",
      publishedTime: ep.date,
    },
  };
}

export default async function EpisodePage({ params }: PageProps) {
  const { slug } = await params;
  const ep = getEpisodeBySlug(slug);
  if (!ep) notFound();

  return (
    <div className="episode-layout">
      <nav className="toc" aria-label="本页目录">
        <div className="toc__title">本页目录</div>
        <ul>
          <li>
            <a href="#gist">一、故事大概</a>
          </li>
          <li>
            <a href="#questions">二、听后问题</a>
          </li>
          <li>
            <a href="#stage">三、当前阶段</a>
          </li>
          <li>
            <a href="#demos">四、示范</a>
          </li>
          <li>
            <a href="#transcript">五、音频文案要点</a>
          </li>
        </ul>
      </nav>

      <a href="/xiaoqun" className="back-link">
        ← 全部简报
      </a>

      <header className="episode-header">
        <div className="card__eyebrow">
          <span className="badge">第 {ep.episode} 期</span>
          <span className="badge badge--warm">小群姐姐</span>
          <span className="meta">{formatDate(ep.date)}</span>
        </div>
        <h1>
          第 {ep.episode} 期 · {formatDate(ep.date)}
        </h1>
        <p className="episode-themes">{themeLabels(ep)}</p>
        {ep.source_url && (
          <p className="source-link">
            <a href={ep.source_url} target="_blank" rel="noopener noreferrer">
              原文链接（小群姐姐讲故事公众号）↗
            </a>
          </p>
        )}
      </header>

      {/* 一、故事大概 */}
      <section id="gist" className="section-block">
        <span className="section-block__num">第一部分</span>
        <h2>一、故事大概</h2>
        {ep.stories.map((story) => (
          <div key={story.title} className="story-block">
            <h3>《{story.title}》</h3>
            <p className="gist">{story.gist}</p>
          </div>
        ))}
      </section>

      {/* 二、听后问题 */}
      <section id="questions" className="section-block">
        <span className="section-block__num">第二部分</span>
        <h2>二、听后问题</h2>
        <p className="meta" style={{ marginBottom: "0.75rem" }}>
          愿闻式 · 按情节顺序，只问 3 个主问题
        </p>
        <div className="method-note">{ep.questions_method}</div>

        {ep.questions.map((sq) => {
          const core = ep.cores?.find((c) => c.story_title === sq.story_title);
          const labels = core?.labels ?? ["问题", "办法", "结果"];
          return (
          <div key={sq.story_title} className="story-block">
            <h3>《{sq.story_title}》</h3>
            {core && (
              <div className="core-card">
                <div className="core-card__label">复述核心</div>
                <dl className="core-card__list">
                  <div className="core-card__row">
                    <dt>{labels[0]}</dt>
                    <dd>{core.problem}</dd>
                  </div>
                  <div className="core-card__row">
                    <dt>{labels[1]}</dt>
                    <dd>{core.solution}</dd>
                  </div>
                  <div className="core-card__row">
                    <dt>{labels[2]}</dt>
                    <dd>{core.result}</dd>
                  </div>
                </dl>
              </div>
            )}
            <ol className="q-list">
              {sq.items.map((item, i) => (
                <li key={i}>
                  <span className="q-text">{item.q}</span>
                  <span className="answer-hint">{item.answer_hint}</span>
                </li>
              ))}
            </ol>
            {sq.bonus && (
              <div className="bonus-q">
                <div className="bonus-q__label">如果答得出再问</div>
                <div className="q-text" style={{ marginTop: "0.35rem" }}>
                  {sq.bonus.q}
                </div>
                <span className="answer-hint">{sq.bonus.answer_hint}</span>
              </div>
            )}
          </div>
          );
        })}
      </section>

      {/* 三、当前阶段 */}
      <section id="stage" className="section-block">
        <span className="section-block__num">第三部分</span>
        <h2>三、当前阶段</h2>
        <p>
          <strong>5岁从零 · 表达一阶</strong>
        </p>
        <p>{ep.stage.day_note}</p>
        <p>{ep.stage.success_criteria}</p>

        <h3>对照大纲</h3>
        <ul className="outline-list">
          <li>
            <strong>现在</strong>
            {ep.stage.outline.now}
          </li>
          <li>
            <strong>复述核心</strong>
            {ep.stage.outline.core_rule ?? CORE_RULE_DEFAULT}
          </li>
          <li>
            <strong>接下来 4 周</strong>
            {ep.stage.outline.next_4_weeks}
          </li>
          <li>
            <strong>一阶后面</strong>
            {ep.stage.outline.after_stage1}
          </li>
          <li>
            <strong>10 工具 · 本周 1 号</strong>
            {ep.stage.outline.tools_this_week}
          </li>
        </ul>
      </section>

      {/* 四、示范 */}
      <section id="demos" className="section-block">
        <span className="section-block__num">第四部分</span>
        <h2>四、示范</h2>
        <p>成人先讲，孩子跟讲。</p>

        {ep.demos.map((demo, i) => (
          <div key={demo.story_title}>
            <h3>
              示范 {i + 1}《{demo.story_title}》
            </h3>
            <div className="demo-script">{demo.script}</div>
          </div>
        ))}

        <h3>三步用法</h3>
        <ol className="steps-list">
          {ep.demo_usage.three_steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>

        <h3>三段式反馈例句</h3>
        <ul className="feedback-list">
          {ep.demo_usage.feedback_examples.map((ex, i) => (
            <li key={i}>{ex}</li>
          ))}
        </ul>
      </section>

      {/* 五、音频文案要点 */}
      <section id="transcript" className="section-block">
        <span className="section-block__num">第五部分</span>
        <h2>五、音频文案要点</h2>
        <p className="meta" style={{ marginBottom: "0.75rem" }}>
          听音频时对照浏览 · 短要点，不是绘本/音频全文
        </p>
        <div className="method-note">
          以下为家长跟听用的情节节拍（约 6–12 条/故事）。标注「提炼要点·非绘本全文」。请以小群姐姐公众号音频与原书为准。
        </div>

        {ep.transcripts.map((tr) => (
          <div key={tr.story_title} className="story-block">
            <h3>《{tr.story_title}》</h3>
            {tr.note && <p className="transcript-note">{tr.note}</p>}
            <ol className="beat-list">
              {tr.beats.map((beat, i) => (
                <li key={i}>{beat}</li>
              ))}
            </ol>
          </div>
        ))}
      </section>
    </div>
  );
}

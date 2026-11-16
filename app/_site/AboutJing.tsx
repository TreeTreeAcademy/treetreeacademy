import Placeholder from "./Placeholder";

// 创始人介绍：只用已确认的事实（规划文档里的履历）。故事细节和照片待 Jing 补。
export default function AboutJing({ short = false }: { short?: boolean }) {
  return (
    <section className="lp-about">
      <div className="lp-about__photo" aria-label="Jing 的照片（待补）">
        <Placeholder>照片</Placeholder>
      </div>
      <div>
        <h2>我是 Jing</h2>
        <p>
          我在国内教过高中语文，后来在美国的大学教中文。现在我在海外带两个孩子，他们的中文和英文都说得流利。
          我把家里真正用得上的这套方法，一点一点整理出来，分享给同样在海外养孩子的家庭。
        </p>
        {!short && (
          <p>
            <Placeholder>一段你自己的故事：你是什么时候发现"会说中文，不等于会把中文传给孩子"的？家里的一个真实小场景（不露孩子的脸、全名和学校）。</Placeholder>
          </p>
        )}
      </div>
    </section>
  );
}

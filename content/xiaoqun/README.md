# 小群姐姐栏目 · 如何新增一期

每期一个 JSON 文件，放在本目录。文件名建议与 `slug` 一致，例如：

```
2026-10-06-ep1.json
2026-10-07-ep2.json
```

构建时 `lib/episodes.ts` 会读取全部 `.json`，按 `date`（再按 `episode`）倒序排列。首页「最新一期」取排序后的第一条；`/xiaoqun/[slug]` 用 `slug` 匹配。

## 字段说明

```jsonc
{
  "slug": "2026-10-07-ep2",          // URL 路径段，唯一
  "episode": 2,                       // 期数（数字）
  "date": "2026-10-07",               // YYYY-MM-DD
  "themes": [
    { "category": "主题分类", "title": "故事名（无书名号）" }
  ],
  "source_url": "https://mp.weixin.qq.com/s/...",
  "stories": [
    { "title": "故事名", "gist": "一两段大概……" }
  ],
  "questions_method": "用法: ……",
  "questions": [
    {
      "story_title": "故事名",
      "items": [
        { "q": "问题？", "answer_hint": "答案落点" }
      ],
      "bonus": {                      // 可选：如果答得出再问
        "q": "附加问题？",
        "answer_hint": "答案落点"
      }
    }
  ],
  "stage": {
    "day_note": "今天是项目第N天。……",
    "success_criteria": "今天成功标准：……",
    "outline": {
      "now": "现在：……",
      "next_4_weeks": "接下来4周：……",
      "after_stage1": "一阶后面：……",
      "tools_this_week": "10工具本周N号：……"
    }
  },
  "demos": [
    { "story_title": "故事名", "script": "大家好，我是____，……" }
  ],
  "demo_usage": {
    "three_steps": [
      "成人先完整讲一遍示范……",
      "孩子跟讲：……",
      "孩子自己讲：……"
    ],
    "feedback_examples": [
      "你说出了「首先」——真棒……",
      "……",
      "……"
    ]
  }
}
```

## 工作日例行流程（建议）

1. 从公众号拿到当日两则故事的大概与主题。
2. 按愿闻式写 3 个主问题 + 可选「如果答得出再问」（附答案落点）。
3. 更新 `stage`（项目第几天、本周工具号）。
4. 写两则示范稿（填空名用 `____`）。
5. 复制本目录某期 JSON 为模板 → 改字段 → 存为新文件。
6. 本地 `npm run dev` 打开 `/xiaoqun/<slug>` 检查；推送后 Vercel 自动构建。

**不要**改已发布期的 `slug`（分享链接会断）。改内容可以，改 slug 等于新页面。

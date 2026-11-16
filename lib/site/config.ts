// 本周测试的可调参数。改这里即可，页面会跟着变。
// 标了 TODO 的都是还没定、需要 Jing 拍板的。

export const SITE_URL = "https://treetreeacademy.com";

export const WORKSHOP = {
  titleZh: "孩子不肯说中文，家长先做哪一步",
  // 依据：测试方案 第九节（2026-11-10）：中文 ¥99、限 30 人、"测试价"口径。
  priceZh: "¥99", // TODO(Jing)：确认价格
  seats: 30,
  durationMin: 60,
  // TODO(Jing)：日期 / 时间（美中时间）/ 平台 / 付款方式。未定前页面只收"意向登记"，不收钱。
  dateText: null as string | null,
  platformText: null as string | null,
};

// 英文 Starter Kit PDF。放到 public/starter-kit.pdf 后改成 "/starter-kit.pdf"，
// 提交表单后页面上就会出现下载按钮。
export const STARTER_KIT_PDF: string | null = null; // TODO(Jing)：提供 7 页 PDF

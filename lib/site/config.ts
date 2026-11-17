// 本周测试的可调参数。改这里即可，页面会跟着变。
// 标了 TODO 的都是还没定、需要 Jing 拍板的。

export const SITE_URL = "https://treetreeacademy.com";

export const WORKSHOP = {
  titleZh: "孩子不肯说中文，家长先做哪一步",
  // 2026-11-16 19:00 Jing：家庭大多在海外，全站只显示美元价 $29。现在只收等候名单，不收钱。
  price: "$29",
  seats: 30,
  durationMin: 60,
  // TODO(Jing)：日期 / 时间（美中时间）/ 平台 / 付款方式。未定前页面只收"意向登记"，不收钱。
  dateText: null as string | null,
  platformText: null as string | null,
};

// 英文 Starter Kit PDF。放到 public/starter-kit.pdf 后改成 "/starter-kit.pdf"，
// 提交表单后页面上就会出现下载按钮。
export const STARTER_KIT_PDF: string | null = null; // TODO(Jing)：提供 7 页 PDF

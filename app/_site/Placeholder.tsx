// 明显的"待填写"标记：上线前 Jing 必须替换或删除。
export default function Placeholder({ children }: { children: React.ReactNode }) {
  return <span className="lp-todo">【待 Jing 填写：{children}】</span>;
}

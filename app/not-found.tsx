export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>页面未找到</h1>
      <p>这期简报还不存在，或链接有误。</p>
      <p>
        <a href="/xiaoqun" className="btn btn--primary">
          查看全部简报
        </a>
      </p>
    </div>
  );
}

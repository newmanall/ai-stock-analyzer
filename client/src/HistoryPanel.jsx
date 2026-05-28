import { Database, Trash2 } from "lucide-react";
import { RiskBadge, SentimentBadge } from "./components/common/Badges.jsx";

export default function HistoryPanel({ recent, onDelete }) {
  return (
    <div className="card history-panel">
      <div className="card-header">
        <h2><Database size={18} /> 最近分析</h2>
      </div>
      {recent.length > 0 ? (
        <div className="history-list">
          {recent.map((item) => (
            <article key={item.id} className="history-item">
              <div className="hi-top">
                <button
                  className="hi-delete"
                  onClick={() => onDelete(item.id)}
                  title="删除此条"
                >
                  <Trash2 size={14} />
                </button>
                <div className="hi-symbol">
                  <strong>{item.symbol}</strong>
                  {item.name && <span className="hi-name">{item.name}</span>}
                </div>
                <span className="hi-date">
                  {new Date(item.created_at).toLocaleString("zh-CN")}
                </span>
              </div>
              <p>{item.summary}</p>
              <div className="hi-tags">
                <SentimentBadge value={item.sentiment} />
                <RiskBadge value={item.risk_level} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">完成 AI 分析后，此处会展示最近 5 条分析记录</div>
      )}
    </div>
  );
}
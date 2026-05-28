import { CheckCircle2 } from "lucide-react";
import { RiskBadge, SentimentBadge } from "./components/common/Badges.jsx";

export default function AIAnalysisPanel({ analysis }) {
  return (
    <div className="card analysis-panel">
      <div className="card-header">
        <h2>AI 分析结果</h2>
        {analysis && <CheckCircle2 size={20} className="icon-success" />}
      </div>

      {analysis ? (
        <>
          <p className="summary-text">{analysis.summary}</p>

          <div className="analysis-tags">
            <div className="tag-group">
              <label>情绪</label>
              <SentimentBadge value={analysis.sentiment} />
            </div>
            <div className="tag-group">
              <label>风险</label>
              <RiskBadge value={analysis.risk_level} />
            </div>
            {analysis.suggestion && (
              <div className="tag-group">
                <label>建议</label>
                <span className="badge badge-suggestion">{analysis.suggestion}</span>
              </div>
            )}
            <div className="tag-group">
              <label>存储</label>
              <span className={`badge ${analysis.saved ? "saved" : "not-saved"}`}>
                {analysis.saved ? "已保存" : "未配置"}
              </span>
            </div>
          </div>

          {analysis.key_factors && analysis.key_factors.length > 0 && (
            <div className="key-factors">
              <h4>关键因素</h4>
              <ul>
                {analysis.key_factors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">获取数据后点击"AI 分析"，由大模型生成分析结果</div>
      )}
    </div>
  );
}
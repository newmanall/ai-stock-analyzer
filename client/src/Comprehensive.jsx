import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

function ConfidenceBadge({ confidence }) {
  const map = {
    "高": { color: "#22c55e", icon: <CheckCircle size={14} /> },
    "中": { color: "#f59e0b", icon: <AlertCircle size={14} /> },
    "低": { color: "#ef4444", icon: <XCircle size={14} /> },
  };
  const conf = map[confidence] || map["中"];
  return (
    <span className="confidence-badge" style={{ background: `${conf.color}20`, color: conf.color }}>
      {conf.icon} 置信度: {confidence}
    </span>
  );
}

function AssessmentBadge({ assessment }) {
  const map = {
    "Bullish": { text: "看多", color: "#22c55e" },
    "Bearish": { text: "看空", color: "#ef4444" },
    "Neutral": { text: "中性", color: "#f59e0b" },
  };
  const ass = map[assessment] || map["Neutral"];
  return (
    <span className="assessment-badge" style={{ background: `${ass.color}20`, color: ass.color }}>
      {ass.text}
    </span>
  );
}

export default function Comprehensive({ comprehensive, loading, onAnalyze }) {
  if (loading) {
    return (
      <section className="card comprehensive">
        <div className="card-header">
          <h2>综合研判</h2>
        </div>
        <div className="empty-state">
          <Loader2 className="spin" size={20} />
          <span style={{ marginLeft: "8px" }}>正在分析中…</span>
        </div>
      </section>
    );
  }

  if (!comprehensive) {
    return (
      <section className="card comprehensive">
        <div className="card-header">
          <h2>综合研判</h2>
        </div>
        <div className="empty-state">
          <button className="btn-analyze" onClick={onAnalyze}>一键综合研判</button>
          <p style={{ marginTop: "10px", fontSize: "0.82rem" }}>
            结合技术面、资金面、北向资金、市场情绪，给出多维度投资建议
          </p>
        </div>
      </section>
    );
  }

  const comp = comprehensive;

  return (
    <section className="card comprehensive">
      <div className="card-header">
        <h2>综合研判</h2>
        <button className="btn-analyze btn-sm" onClick={onAnalyze}>重新研判</button>
      </div>

      <div className="comp-header">
        <AssessmentBadge assessment={comp.overall_assessment} />
        <ConfidenceBadge confidence={comp.confidence} />
      </div>

      <div className="comp-logic">
        <strong>投资逻辑:</strong>
        <p>{comp.key_logic}</p>
      </div>

      {comp.risk_factors?.length > 0 && (
        <div className="comp-risks">
          <strong>风险因素:</strong>
          <ul>
            {comp.risk_factors.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      {comp.entry_signals?.length > 0 && (
        <div className="comp-signals">
          <strong>进场信号:</strong>
          <div className="signal-tags">
            {comp.entry_signals.map((sig, i) => (
              <span key={i} className="signal-tag positive">{sig}</span>
            ))}
          </div>
        </div>
      )}

      <div className="comp-summary">
        <strong>综合论述:</strong>
        <p>{comp.summary}</p>
      </div>
    </section>
  );
}
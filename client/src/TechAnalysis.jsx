import { TrendingUp, TrendingDown } from "lucide-react";

function formatIndicator(val) {
  if (val === null || val === undefined) return "--";
  if (typeof val === "number") return val.toFixed(2);
  return String(val);
}

function SignalTag({ signal }) {
  const typeMap = {
    "MACD金叉": { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    "MACD死叉": { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
    "MACD底背离": { bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
    "MACD顶背离": { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
    "RSI超卖": { bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
    "RSI超卖拐头": { bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
    "RSI超买": { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
    "RSI超买拐头": { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
    "KDJ超卖": { bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
    "KDJ超买": { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
    "布林上轨": { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
    "布林下轨": { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
    "突破MA20": { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
    "回踩MA20": { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
    "MA60支撑": { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
  };

  const style = typeMap[signal.type] || { bg: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" };

  return (
    <span className="signal-tag" style={{ background: style.bg, color: style.color }}>
      {signal.type}
    </span>
  );
}

export default function TechAnalysis({ techData, techAI, onAnalyze }) {
  if (!techData) {
    return (
      <section className="card tech-analysis">
        <div className="card-header">
          <h2><TrendingUp size={18} /> 技术面分析</h2>
        </div>
        <div className="empty-state">
          <button className="btn-analyze" onClick={onAnalyze}>查看技术面</button>
          <p style={{ marginTop: "10px", fontSize: "0.82rem" }}>
            基于 MACD、RSI、KDJ、布林带等多指标综合分析
          </p>
        </div>
      </section>
    );
  }

  const ind = techData.allIndicators || {};
  const sigs = techData.allSignals || [];

  return (
    <section className="card tech-analysis">
      <div className="card-header">
        <h2><TrendingUp size={18} /> 技术面分析</h2>
        <button className="btn-analyze btn-sm" onClick={onAnalyze}>刷新</button>
      </div>

      {/* Indicator Cards */}
      <div className="tech-indicators-grid">
        {ind.ma5 !== undefined && (
          <div className="tech-ind-card">
            <span className="tech-ind-label">均线系统</span>
            <div className="tech-ind-values">
              <span>MA5: {formatIndicator(ind.ma5)}</span>
              <span>MA10: {formatIndicator(ind.ma10)}</span>
              <span>MA20: {formatIndicator(ind.ma20)}</span>
            </div>
            <span className="tech-ind-status">
              {ind.ma5 > ind.ma10 && ind.ma10 > ind.ma20 ? "多头排列" : 
               ind.ma5 > ind.ma10 ? "短期偏多" : "偏空/交织"}
            </span>
          </div>
        )}
        {ind.macd && (
          <div className="tech-ind-card">
            <span className="tech-ind-label">MACD</span>
            <div className="tech-ind-values">
              <span>DIF: {formatIndicator(ind.macd.dif)}</span>
              <span>DEA: {formatIndicator(ind.macd.dea)}</span>
            </div>
            <span className="tech-ind-status">
              {ind.macd.signal === "golden_cross" ? "金叉" : 
               ind.macd.signal === "death_cross" ? "死叉" : 
               ind.macd.signal === "bullish" ? "偏多" : "偏空"}
            </span>
          </div>
        )}
        {ind.rsi && (
          <div className="tech-ind-card">
            <span className="tech-ind-label">RSI (14)</span>
            <div className="tech-ind-values">
              <span className="tech-ind-big">{formatIndicator(ind.rsi.value)}</span>
            </div>
            <span className="tech-ind-status">
              {ind.rsi.status === "overbought" ? "超买" : 
               ind.rsi.status === "oversold" ? "超卖" : "中性"}
            </span>
          </div>
        )}
        {ind.kdj && ind.kdj.k !== null && (
          <div className="tech-ind-card">
            <span className="tech-ind-label">KDJ</span>
            <div className="tech-ind-values">
              <span>K: {formatIndicator(ind.kdj.k)}</span>
              <span>D: {formatIndicator(ind.kdj.d)}</span>
              <span>J: {formatIndicator(ind.kdj.j)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Signals */}
      {sigs.length > 0 && (
        <div className="tech-signals">
          <h4>技术信号</h4>
          <div className="signal-tags">
            {sigs.map((s, i) => (
              <div key={i} className="signal-item">
                <SignalTag signal={s} />
                <span className="signal-desc">{s.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Interpretation */}
      {techAI && (
        <div className="ai-narrative">
          <strong>AI 解读</strong>
          <p>{techAI.narrative}</p>
          {techAI.key_points?.length > 0 && (
            <div className="ai-points">
              <span className="ai-label positive">看多信号:</span>
              {techAI.key_points.map((p, i) => <span key={i} className="ai-tag positive">{p}</span>)}
            </div>
          )}
          {techAI.warning_signals?.length > 0 && (
            <div className="ai-points">
              <span className="ai-label negative">警示信号:</span>
              {techAI.warning_signals.map((p, i) => <span key={i} className="ai-tag negative">{p}</span>)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
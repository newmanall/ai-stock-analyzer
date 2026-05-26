import { Loader2, Sparkles } from "lucide-react";

function ScoreBar({ score }) {
  const percent = Math.min(Math.max(score, 0), 100);
  const color = percent >= 80 ? "#22c55e" : percent >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="score-bar">
      <div className="score-bar-bg">
        <div className="score-bar-fill" style={{ width: `${percent}%`, background: color }} />
      </div>
      <span className="score-bar-text">{score}</span>
    </div>
  );
}

function ScoreTag({ label, value, max = 20 }) {
  const percent = (value / max) * 100;
  let color = "#ef4444";
  if (percent >= 80) color = "#22c55e";
  else if (percent >= 50) color = "#f59e0b";
  return (
    <span className="score-tag" style={{ background: `${color}20`, color }}>
      {label}: {value}
    </span>
  );
}

export default function SmartScreener({ 
  smartPicks, 
  pickExplanations, 
  scanLoading, 
  onScan,
  onSelectStock
}) {
  if (!smartPicks) {
    return (
      <section className="card smart-screener">
        <div className="card-header">
          <h2><Sparkles size={18} /> AI 智能选股</h2>
        </div>
        <div className="empty-state">
          <button
            className="btn-scan"
            onClick={onScan}
            disabled={scanLoading}
          >
            {scanLoading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {scanLoading ? "扫描中…" : "AI 选股"}
          </button>
          <p style={{ marginTop: "12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            基于均线、MACD、量价、RSI、资金、估值六维度综合评分，筛选全市场优质个股
          </p>
        </div>
      </section>
    );
  }

  const explanationsMap = {};
  if (pickExplanations) {
    for (const exp of pickExplanations) {
      explanationsMap[exp.symbol] = exp;
    }
  }

  return (
    <section className="card smart-screener">
      <div className="card-header">
        <h2><Sparkles size={18} /> AI 智能选股 (共{smartPicks.length}只)</h2>
        <button
          className="btn-rescan"
          onClick={onScan}
          disabled={scanLoading}
        >
          {scanLoading ? <Loader2 className="spin" size={16} /> : "重新扫描"}
        </button>
      </div>

      <div className="screener-grid">
        {smartPicks.map((stock) => {
          const exp = explanationsMap[stock.symbol];
          return (
            <div key={stock.symbol} className="screener-card">
              <div className="screener-header">
                <div className="screener-symbol">
                  <strong>{stock.symbol}</strong>
                  <span className="screener-name">{stock.name}</span>
                </div>
                <button
                  className="btn-view-detail"
                  onClick={() => onSelectStock(stock.symbol)}
                  title="查看详情"
                >
                  详情
                </button>
              </div>

              <div className="screener-score">
                <ScoreBar score={stock.totalScore} />
                <div className="score-tags">
                  <ScoreTag label="均线" value={stock.scoreDetail?.ma || 0} />
                  <ScoreTag label="MACD" value={stock.scoreDetail?.macd || 0} />
                  <ScoreTag label="量价" value={stock.scoreDetail?.volume || 0} />
                  <ScoreTag label="RSI" value={stock.scoreDetail?.rsi || 0} />
                  <ScoreTag label="资金" value={stock.scoreDetail?.capital || 0} />
                  <ScoreTag label="估值" value={stock.scoreDetail?.pe || 0} max={10} />
                </div>
              </div>

              {exp && (
                <div className="screener-ai">
                  <div className="ai-reason">
                    <strong>AI 选股理由:</strong> {exp.reason}
                  </div>
                  {exp.risk && (
                    <div className="ai-risk">
                      <strong>风险提示:</strong> {exp.risk}
                    </div>
                  )}
                  <div className="ai-suggestion">
                    <strong>建议:</strong> {exp.suggestion}
                  </div>
                </div>
              )}

              <div className="screener-stats">
                <div className="stat">
                  <span>最新价</span>
                  <strong>¥{stock.close.toFixed(2)}</strong>
                </div>
                <div className="stat">
                  <span>涨跌幅</span>
                  <strong className={stock.changePercent >= 0 ? "text-up" : "text-down"}>
                    {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                  </strong>
                </div>
                <div className="stat">
                  <span>换手率</span>
                  <strong>{stock.turnoverRate.toFixed(2)}%</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
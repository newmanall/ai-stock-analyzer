import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

function ScoreBar({ score }) {
  const value = score == null ? 0 : Math.min(Math.max(score, 0), 100);
  const color = value >= 80 ? "#10a37f" : value >= 60 ? "#b45309" : "#ef4444";

  return (
    <div className="score-bar">
      <div className="score-bar-label">综合评分</div>
      <div className="score-bar-bg">
        <div className="score-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="score-bar-text">{score ?? "--"}</span>
    </div>
  );
}

function ScoreTag({ label, value, max = 20 }) {
  if (value == null) {
    return <span className="score-tag muted">{label}: --</span>;
  }

  const pct = Math.min(Math.max(value / max, 0), 1);
  const color = pct >= 0.75 ? "#10a37f" : pct >= 0.5 ? "#b45309" : "#ef4444";
  return (
    <span className="score-tag" style={{ background: `${color}18`, color }}>
      {label}: {value}
    </span>
  );
}

function WorkflowScores({ detail }) {
  const workflow = detail?.workflow || {};
  return (
    <div className="score-tags">
      <ScoreTag label="板块匹配" value={workflow.sectorFit ?? detail?.capital ?? null} max={15} />
      <ScoreTag label="技术结构" value={workflow.technical ?? null} max={40} />
      <ScoreTag label="流动性" value={workflow.liquidity ?? detail?.volume ?? null} max={20} />
      <ScoreTag label="估值" value={workflow.valuation ?? detail?.pe ?? null} max={20} />
      <ScoreTag label="质量代理" value={workflow.quality ?? null} max={5} />
      <ScoreTag label="风险扣分" value={workflow.riskPenalty ?? 0} max={10} />
    </div>
  );
}

export default function SmartScreener({
  smartPicks,
  pickExplanations,
  scanLoading,
  scanError,
  onScan,
  onSelectStock,
}) {
  const explanationsMap = {};
  if (Array.isArray(pickExplanations)) {
    for (const exp of pickExplanations) explanationsMap[exp.symbol] = exp;
  }

  if (!smartPicks) {
    return (
      <section className="card smart-screener">
        <div className="card-header">
          <h2><Sparkles size={18} /> 智能选股研究</h2>
        </div>

        {scanError && (
          <div className="scan-error">
            <AlertTriangle size={16} /> {scanError}
          </div>
        )}

        <div className="empty-state">
          <button className="btn-scan" onClick={onScan} disabled={scanLoading}>
            {scanLoading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            {scanLoading ? "扫描中..." : "开始选股研究"}
          </button>
          <p style={{ marginTop: "12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            按板块股票池、行情、历史 K 线、估值、流动性和风险项生成精选清单，参考机构级金融研究的工作流。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="card smart-screener">
      <div className="card-header">
        <h2><Sparkles size={18} /> 智能选股研究 ({smartPicks.length} 只)</h2>
        <button className="btn-rescan" onClick={onScan} disabled={scanLoading}>
          {scanLoading ? <Loader2 className="spin" size={16} /> : "重新扫描"}
        </button>
      </div>

      {scanError && (
        <div className="scan-warning">
          <AlertTriangle size={16} /> {scanError}
        </div>
      )}

      <div className="screener-grid">
        {smartPicks.map((stock) => {
          const exp = explanationsMap[stock.symbol];
          const thesis = stock.investmentThesis || [];
          const risks = stock.riskFactors || [];

          return (
            <div key={stock.symbol} className="screener-card">
              <div className="screener-header">
                <div className="screener-symbol">
                  <strong>{stock.rank ? `${stock.rank}. ` : ""}{stock.symbol}</strong>
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
                <ScoreBar score={stock.totalScore ?? null} />
                <WorkflowScores detail={stock.scoreDetail} />
              </div>

              <div className="screener-ai">
                <div className="ai-reason">
                  <strong>研究假设</strong>
                  <ul>
                    {(thesis.length ? thesis : [exp?.reason || "暂无研究假设"]).slice(0, 3).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="ai-risk">
                  <strong>待复核风险</strong>
                  <ul>
                    {(risks.length ? risks : [exp?.risk || "暂无风险项"]).slice(0, 3).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="screener-stats">
                <div className="stat">
                  <span>最新价</span>
                  <strong>¥{stock.close != null ? stock.close.toFixed(2) : "--"}</strong>
                </div>
                <div className="stat">
                  <span>涨跌幅</span>
                  <strong className={stock.changePercent != null && stock.changePercent >= 0 ? "text-up" : "text-down"}>
                    {stock.changePercent != null ? `${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(2)}%` : "--"}
                  </strong>
                </div>
                <div className="stat">
                  <span>换手率</span>
                  <strong>{stock.turnoverRate != null ? `${stock.turnoverRate.toFixed(2)}%` : "--"}</strong>
                </div>
                <div className="stat">
                  <span>K线来源</span>
                  <strong>{stock.kline?.source || "--"}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

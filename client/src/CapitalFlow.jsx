import { DollarSign } from "lucide-react";

function MiniSparkline({ values = [], height = 32, width = 120 }) {
  if (!values.length) return null;
  const nums = values.map(v => v.value !== undefined ? v.value : v);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const points = nums.map((v, i) => {
    const x = nums.length === 1 ? width / 2 : (i / (nums.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  const isUp = nums.length >= 2 && nums[nums.length - 1] >= nums[0];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mini-sparkline" style={{ color: isUp ? "var(--up)" : "var(--down)" }}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function CapitalFlow({ capitalData, capitalAI, onAnalyze }) {
  if (!capitalData) {
    return (
      <section className="card capital-flow">
        <div className="card-header">
          <h2><DollarSign size={18} /> 资金面分析</h2>
        </div>
        <div className="empty-state">
          <button className="btn-analyze" onClick={onAnalyze}>查看资金面</button>
          <p style={{ marginTop: "10px", fontSize: "0.82rem" }}>
            分析主力、超大单、大单、中单、小单资金流向
          </p>
        </div>
      </section>
    );
  }

  const cd = capitalData;
  const mainColor = cd.todayMainNetInflow >= 0 ? "var(--up)" : "var(--down)";
  const mainSign = cd.todayMainNetInflow >= 0 ? "+" : "";

  return (
    <section className="card capital-flow">
      <div className="card-header">
        <h2><DollarSign size={18} /> 资金面分析</h2>
        <button className="btn-analyze btn-sm" onClick={onAnalyze}>刷新</button>
      </div>

      <div className="capital-main">
        <div className="capital-main-value">
          <span className="capital-main-label">主力净流入</span>
          <strong style={{ color: mainColor }}>
            {mainSign}{cd.todayMainNetInflow.toFixed(2)}亿
          </strong>
        </div>
        <div className="capital-main-info">
          <span className="capital-trend">
            连续{cd.consecutiveInflowDays}日{cd.flowTrend === "连续流入" ? "流入" : cd.flowTrend === "连续流出" ? "流出" : "震荡"}
          </span>
          <span className="capital-ratio">占比: {cd.mainForceRatio.toFixed(2)}%</span>
        </div>
      </div>

      <div className="capital-details">
        <div className="capital-item">
          <span>超大单</span>
          <strong style={{ color: cd.todaySuperLargeNetInflow >= 0 ? "var(--up)" : "var(--down)" }}>
            {cd.todaySuperLargeNetInflow >= 0 ? "+" : ""}{cd.todaySuperLargeNetInflow.toFixed(2)}亿
          </strong>
        </div>
        <div className="capital-item">
          <span>大单</span>
          <strong style={{ color: cd.todayLargeNetInflow >= 0 ? "var(--up)" : "var(--down)" }}>
            {cd.todayLargeNetInflow >= 0 ? "+" : ""}{cd.todayLargeNetInflow.toFixed(2)}亿
          </strong>
        </div>
        <div className="capital-item">
          <span>中单</span>
          <strong style={{ color: cd.todayMediumNetInflow >= 0 ? "var(--up)" : "var(--down)" }}>
            {cd.todayMediumNetInflow >= 0 ? "+" : ""}{cd.todayMediumNetInflow.toFixed(2)}亿
          </strong>
        </div>
        <div className="capital-item">
          <span>小单</span>
          <strong style={{ color: cd.todaySmallNetInflow >= 0 ? "var(--up)" : "var(--down)" }}>
            {cd.todaySmallNetInflow >= 0 ? "+" : ""}{cd.todaySmallNetInflow.toFixed(2)}亿
          </strong>
        </div>
      </div>

      <div className="capital-trend-section">
        <span className="capital-section-label">近5日资金流向趋势</span>
        <div className="capital-mini-chart">
          <MiniSparkline values={cd.recent5DaysFlow || []} />
        </div>
        <div className="capital-status">
          <span>量价状态: <strong>{cd.volumePriceMatch}</strong></span>
          <span>综合评估: <strong>{cd.assessment}</strong></span>
        </div>
      </div>

      {capitalAI && (
        <div className="ai-narrative">
          <strong>AI 解读</strong>
          <p>{capitalAI.narrative}</p>
          {capitalAI.position_analysis && (
            <div className="ai-position">
              <span className="ai-label">进场时机:</span>
              <span>{capitalAI.position_analysis}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
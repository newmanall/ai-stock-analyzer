import { Globe } from "lucide-react";

function MiniSparkline({ values = [], height = 28, width = 120 }) {
  if (!values || !values.length) return null;
  const nums = values.map(v => v.value !== undefined ? v.value : v);
  const validNums = nums.filter(v => v != null && typeof v === 'number');
  if (validNums.length < 2) return null;

  const min = Math.min(...validNums);
  const max = Math.max(...validNums);
  const range = max - min || 1;

  const points = validNums.map((v, i) => {
    const x = (i / (validNums.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  const isUp = validNums[validNums.length - 1] >= validNums[0];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`mini-sparkline ${isUp ? "text-up" : "text-down"}`}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatMoney(value) {
  if (value == null) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}亿`;
}

export default function Northbound({ nbData, nbAI, onAnalyze }) {
  if (!nbData) {
    return (
      <section className="card northbound">
        <div className="card-header">
          <h2><Globe size={18} /> 北向资金</h2>
        </div>
        <div className="empty-state">
          <button className="btn-analyze" onClick={onAnalyze}>查看北向资金</button>
          <p className="empty-state-desc">
            实时追踪沪股通、深股通资金流入流出
          </p>
        </div>
      </section>
    );
  }

  const nd = nbData;
  const isMock = nd.warning && nd.warning.includes("模拟");
  const totalSign = nd.todayTotalNetInflow >= 0 ? "+" : "";
  const totalColor = nd.todayTotalNetInflow >= 0 ? "amount-up" : "amount-down";
  const shColor = nd.todaySHNetInflow >= 0 ? "amount-up" : "amount-down";
  const szColor = nd.todaySZNetInflow >= 0 ? "amount-up" : "amount-down";

  const signalColorMap = {
    "积极做多": "#22c55e",
    "谨慎偏多": "#86efac",
    "中性": "#94a3b8",
    "偏空": "#f87171",
  };

  const consecutiveLabel = nd.consecutiveInflowDays != null
    ? (nd.consecutiveInflowDays >= 0 ? "净流入" : "净流出")
    : "--";

  return (
    <section className="card northbound">
      <div className="card-header">
        <h2><Globe size={18} /> 北向资金</h2>
        <button className="btn-analyze btn-sm" onClick={onAnalyze}>刷新</button>
      </div>

      {isMock && (
        <div className="mock-warning">
          ⚠️ {nd.warning}
        </div>
      )}

      <div className="nb-grid">
        <div className="nb-item">
          <span className="nb-label">今日合计</span>
          <strong className={totalColor}>{formatMoney(nd.todayTotalNetInflow)}</strong>
        </div>
        <div className="nb-item">
          <span className="nb-label">沪股通</span>
          <strong className={shColor}>
            {formatMoney(nd.todaySHNetInflow)}
          </strong>
        </div>
        <div className="nb-item">
          <span className="nb-label">深股通</span>
          <strong className={szColor}>
            {formatMoney(nd.todaySZNetInflow)}
          </strong>
        </div>
        <div className="nb-item">
          <span className="nb-label">态度信号</span>
          <strong style={{ color: signalColorMap[nd.signal] || "var(--text-primary)" }}>
            {nd.signal ?? "--"}
          </strong>
        </div>
      </div>

      <div className="nb-trend">
        <span>近5日趋势</span>
        <MiniSparkline values={nd.recent5Days || []} height={36} width={150} />
      </div>

      <div className="nb-summary">
        <span>{nd.summary ?? "--"}</span>
        <span className="nb-consecutive">
          连续{nd.consecutiveInflowDays != null ? nd.consecutiveInflowDays : "--"}日{consecutiveLabel}
        </span>
      </div>

      {nbAI && (
        <div className="ai-narrative">
          <strong>AI 解读</strong>
          <p>{nbAI.narrative || nbAI.summary}</p>
        </div>
      )}
    </section>
  );
}
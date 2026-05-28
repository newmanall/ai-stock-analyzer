import { DollarSign } from "lucide-react";

function MiniSparkline({ values = [], height = 32, width = 120 }) {
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

function formatPercent(value) {
  if (value == null) return "--";
  return `${value.toFixed(2)}%`;
}

const VOLUME_PRICE_MAP = {
  "量价齐升": "量价齐升",
  "量价背离": "量价背离",
  "放量下跌": "放量下跌",
  "缩量上涨": "缩量上涨",
  "放量上涨": "放量上涨",
  "缩量下跌": "缩量下跌",
  "平衡": "量价平衡",
};

const CAPITAL_ASSESSMENT_MAP = {
  "Bullish": "看涨",
  "Bearish": "看跌",
  "Neutral": "中性",
  "Strong Buy": "强烈买入",
  "Buy": "买入",
  "Hold": "持有",
  "Sell": "卖出",
  "Strong Sell": "强烈卖出",
  "Overweight": "超配",
  "Underweight": "低配",
};

function translateVolumePrice(value) {
  if (!value) return "--";
  return VOLUME_PRICE_MAP[value] || value;
}

function translateAssessment(value) {
  if (!value) return "--";
  return CAPITAL_ASSESSMENT_MAP[value] || value;
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
          <p className="empty-state-desc">
            分析主力、超大单、大单、中单、小单资金流向
          </p>
        </div>
      </section>
    );
  }

  const cd = capitalData;
  const isMock = cd.warning && (cd.warning.includes("模拟") || cd.warning.includes("不可用"));
  const mainColor = cd.todayMainNetInflow !== null && cd.todayMainNetInflow >= 0 ? "amount-up" : "amount-down";
  const mainSign = cd.todayMainNetInflow !== null && cd.todayMainNetInflow >= 0 ? "+" : "";

  const flowTrendLabel = cd.flowTrend === "连续流入" ? "流入" : cd.flowTrend === "连续流出" ? "流出" : cd.flowTrend && cd.flowTrend !== "暂无数据" ? "震荡" : "--";

  return (
    <section className="card capital-flow">
      <div className="card-header">
        <h2><DollarSign size={18} /> 资金面分析</h2>
        <button className="btn-analyze btn-sm" onClick={onAnalyze}>刷新</button>
      </div>

      {isMock && (
        <div className="mock-warning">
          ⚠️ {cd.warning}
        </div>
      )}

      <div className="capital-main">
        <div className="capital-main-value">
          <span className="capital-main-label">主力净流入</span>
          <strong className={mainColor}>
            {mainSign}{cd.todayMainNetInflow != null ? cd.todayMainNetInflow.toFixed(2) : "--"}亿
          </strong>
        </div>
        <div className="capital-main-info">
          <span className="capital-trend">
            连续{cd.consecutiveInflowDays != null ? cd.consecutiveInflowDays : "--"}日{flowTrendLabel}
          </span>
          <span className="capital-ratio">占比: {formatPercent(cd.mainForceRatio)}</span>
        </div>
      </div>

      <div className="capital-details">
        <div className={`capital-item${cd.dataUnavailable ? " capital-item-disabled" : ""}`}>
          <span>超大单</span>
          <strong className={cd.todaySuperLargeNetInflow != null && cd.todaySuperLargeNetInflow >= 0 ? "amount-up" : "amount-down"}>
            {formatMoney(cd.todaySuperLargeNetInflow)}
          </strong>
        </div>
        <div className={`capital-item${cd.dataUnavailable ? " capital-item-disabled" : ""}`}>
          <span>大单</span>
          <strong className={cd.todayLargeNetInflow != null && cd.todayLargeNetInflow >= 0 ? "amount-up" : "amount-down"}>
            {formatMoney(cd.todayLargeNetInflow)}
          </strong>
        </div>
        <div className={`capital-item${cd.dataUnavailable ? " capital-item-disabled" : ""}`}>
          <span>中单</span>
          <strong className={cd.todayMediumNetInflow != null && cd.todayMediumNetInflow >= 0 ? "amount-up" : "amount-down"}>
            {formatMoney(cd.todayMediumNetInflow)}
          </strong>
        </div>
        <div className={`capital-item${cd.dataUnavailable ? " capital-item-disabled" : ""}`}>
          <span>小单</span>
          <strong className={cd.todaySmallNetInflow != null && cd.todaySmallNetInflow >= 0 ? "amount-up" : "amount-down"}>
            {formatMoney(cd.todaySmallNetInflow)}
          </strong>
        </div>
      </div>

      <div className="capital-trend-section">
        <span className="capital-section-label">近5日资金流向趋势</span>
        <div className="capital-mini-chart">
          <MiniSparkline values={cd.recent5DaysFlow || []} />
        </div>
        <div className="capital-status">
          <span>量价状态: <strong>{translateVolumePrice(cd.volumePriceMatch)}</strong></span>
          <span>综合评估: <strong>{translateAssessment(cd.assessment)}</strong></span>
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
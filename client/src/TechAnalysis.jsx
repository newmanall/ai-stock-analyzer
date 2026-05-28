import { TrendingUp } from "lucide-react";

function formatIndicator(value) {
  if (value === null || value === undefined) return "--";
  if (typeof value === "number") return value.toFixed(2);
  return String(value);
}

const MACD_SIGNAL_MAP = {
  golden_cross: "金叉",
  death_cross: "死叉",
  bullish: "看涨",
  bearish: "看跌",
  up: "向上",
  down: "向下",
};

const RSI_STATUS_MAP = {
  overbought: "超买",
  oversold: "超卖",
  neutral: "中性",
  "over-bought": "超买",
  "over-sold": "超卖",
};

const SIGNAL_DESC_MAP = {
  golden_cross: "MACD 快线向上穿越慢线，看涨信号",
  death_cross: "MACD 快线向下穿越慢线，看跌信号",
  bullish: "MACD 柱状图转正，多头占优",
  bearish: "MACD 柱状图转负，空头占优",
  up: "指标呈上升趋势",
  down: "指标呈下降趋势",
  break_out: "突破关键阻力位",
  support: "获得关键支撑",
  divergence: "出现背离信号",
};

function translateSignalType(type) {
  return MACD_SIGNAL_MAP[type] || type;
}

function translateRsiStatus(status) {
  return RSI_STATUS_MAP[status] || status;
}

function getSignalDescription(signal) {
  if (signal.description) return signal.description;
  return SIGNAL_DESC_MAP[signal.type] || signal.type;
}

function SignalTag({ signal }) {
  const displayType = translateSignalType(signal.type);
  const isPositive = /金叉|超卖|突破|支撑|看涨|golden|bullish/i.test(displayType);
  const isNegative = /死叉|超买|压力|看跌|death|bearish/i.test(displayType);
  const style = isPositive
    ? { background: "rgba(16,163,127,0.12)", color: "#0d8f70" }
    : isNegative
      ? { background: "rgba(239,68,68,0.12)", color: "#dc2626" }
      : { background: "#f4f4f5", color: "var(--text-secondary)" };

  return (
    <span className="signal-tag" style={style}>
      {displayType}
    </span>
  );
}

function KLineChart({ items = [] }) {
  const data = items.slice(-60).filter((item) => item.high > 0 && item.low > 0);
  if (!data.length) return null;

  const width = 720;
  const height = 220;
  const padding = 18;
  const max = Math.max(...data.map((item) => item.high));
  const min = Math.min(...data.map((item) => item.low));
  const range = max - min || 1;
  const candleWidth = Math.max(3, (width - padding * 2) / data.length * 0.55);
  const xStep = (width - padding * 2) / Math.max(data.length - 1, 1);
  const y = (value) => padding + (max - value) / range * (height - padding * 2);

  return (
    <div className="kline-chart-wrap">
      <svg className="kline-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="K-line chart">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const yy = padding + ratio * (height - padding * 2);
          return <line key={ratio} x1={padding} x2={width - padding} y1={yy} y2={yy} className="kline-grid" />;
        })}

        {data.map((item, index) => {
          const x = padding + index * xStep;
          const openY = y(item.open);
          const closeY = y(item.close);
          const highY = y(item.high);
          const lowY = y(item.low);
          const up = item.close >= item.open;
          const top = Math.min(openY, closeY);
          const bodyHeight = Math.max(2, Math.abs(openY - closeY));

          return (
            <g key={`${item.date}-${index}`} className={up ? "kline-up" : "kline-down"}>
              <line x1={x} x2={x} y1={highY} y2={lowY} />
              <rect
                x={x - candleWidth / 2}
                y={top}
                width={candleWidth}
                height={bodyHeight}
                rx="1"
              />
            </g>
          );
        })}
      </svg>
      <div className="kline-meta">
        <span>{data[0]?.date}</span>
        <span>{data.at(-1)?.date}</span>
      </div>
    </div>
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
            读取历史 K 线后计算 MA、MACD、RSI、KDJ、BOLL 等指标。
          </p>
        </div>
      </section>
    );
  }

  const indicators = techData.allIndicators || {};
  const signals = techData.allSignals || [];
  const klineItems = techData.kline?.items || [];

  return (
    <section className="card tech-analysis">
      <div className="card-header">
        <h2><TrendingUp size={18} /> 技术面分析</h2>
        <button className="btn-analyze btn-sm" onClick={onAnalyze}>刷新</button>
      </div>

      <div className="kline-header">
        <span>K线图</span>
        <span>{techData.kline?.source || "--"} · {techData.kline?.count ?? klineItems.length} 条</span>
      </div>
      <KLineChart items={klineItems} />

      <div className="tech-indicators-grid">
        {indicators.ma5 !== undefined && (
          <div className="tech-ind-card">
            <span className="tech-ind-label">均线系统</span>
            <div className="tech-ind-values">
              <span>MA5: {formatIndicator(indicators.ma5)}</span>
              <span>MA10: {formatIndicator(indicators.ma10)}</span>
              <span>MA20: {formatIndicator(indicators.ma20)}</span>
              <span>MA60: {formatIndicator(indicators.ma60)}</span>
            </div>
          </div>
        )}

        {indicators.macd && (
          <div className="tech-ind-card">
            <span className="tech-ind-label">MACD</span>
            <div className="tech-ind-values">
              <span>DIF: {formatIndicator(indicators.macd.dif)}</span>
              <span>DEA: {formatIndicator(indicators.macd.dea)}</span>
              <span>信号: {translateSignalType(indicators.macd.signal)}</span>
            </div>
          </div>
        )}

        {indicators.rsi && (
          <div className="tech-ind-card">
            <span className="tech-ind-label">RSI (14)</span>
            <div className="tech-ind-values">
              <span className="tech-ind-big">{formatIndicator(indicators.rsi.value)}</span>
              <span>{translateRsiStatus(indicators.rsi.status)}</span>
            </div>
          </div>
        )}

        {indicators.kdj && indicators.kdj.k !== null && (
          <div className="tech-ind-card">
            <span className="tech-ind-label">KDJ</span>
            <div className="tech-ind-values">
              <span>K: {formatIndicator(indicators.kdj.k)}</span>
              <span>D: {formatIndicator(indicators.kdj.d)}</span>
              <span>J: {formatIndicator(indicators.kdj.j)}</span>
            </div>
          </div>
        )}
      </div>

      {signals.length > 0 && (
        <div className="tech-signals">
          <h4>技术信号</h4>
          <div className="signal-tags">
            {signals.map((signal, index) => (
              <div key={index} className="signal-item">
                <SignalTag signal={signal} />
                <span className="signal-desc">{getSignalDescription(signal)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {techAI && (
        <div className="ai-narrative">
          <strong>AI 解读</strong>
          <p>{techAI.narrative}</p>
        </div>
      )}
    </section>
  );
}

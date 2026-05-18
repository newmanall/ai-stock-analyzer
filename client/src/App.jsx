import { useMemo, useState } from "react";
import { fetchStockData } from "./api.js";

function formatNumber(value, options = {}) {
  if (typeof value !== "number") return "-";
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
    ...options
  }).format(value);
}

function formatCurrency(value) {
  if (typeof value !== "number") return "-";
  return `$${formatNumber(value)}`;
}

export default function App() {
  const [symbol, setSymbol] = useState("AAPL");
  const [stockData, setStockData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isPositive = (stockData?.changePercent || 0) >= 0;

  async function handleFetchStock() {
    const cleanSymbol = symbol.trim().toUpperCase();

    if (!cleanSymbol) {
      setError("请输入股票代码，例如 AAPL、MSFT、TSLA。");
      return;
    }

    try {
      setError("");
      setIsLoading(true);
      setStockData(null);

      const data = await fetchStockData(cleanSymbol);
      setStockData(data);
    } catch (err) {
      setError(err.message || "获取行情数据失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-topline">
          <span className="status-dot" />
          第二阶段 · 已接入真实行情 API
        </div>

        <div className="hero-layout">
          <div>
            <div className="eyebrow">AI 股票分析面板</div>
            <h1>输入股票代码，获取实时市场快照</h1>
            <p className="subtitle">
              当前页面已从 Mock 数据升级为 Alpha Vantage 日线行情。下一阶段将把这些结构化数据交给 LLM，生成严格 JSON 格式的投资分析摘要。
            </p>
          </div>

          <div className="hero-note">
            <strong>数据链路</strong>
            <span>前端输入 → Express 后端 → Alpha Vantage → 清洗后返回前端</span>
          </div>
        </div>

        <div className="input-row">
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleFetchStock();
            }}
            placeholder="例如 AAPL / MSFT / TSLA"
            aria-label="股票代码"
          />
          <button onClick={handleFetchStock} disabled={isLoading}>
            {isLoading ? "正在获取..." : "获取行情"}
          </button>
        </div>

        <div className="quick-symbols" aria-label="快捷股票代码">
          {["AAPL", "MSFT", "TSLA", "NVDA"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setSymbol(item);
                setError("");
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {error && <div className="error-box">{error}</div>}
      </section>

      <section className="content-grid">
        <div className="panel market-panel">
          <div className="panel-header">
            <div>
              <span>市场行情</span>
              <small>真实 API 返回并由后端清洗</small>
            </div>
            {stockData && <em>{stockData.source}</em>}
          </div>

          {!stockData ? (
            <div className="empty-state">
              <div className="empty-icon">⌘</div>
              <strong>还没有行情数据</strong>
              <p>输入股票代码后点击“获取行情”。如果免费 API 触发频率限制，页面会显示中文错误提示。</p>
            </div>
          ) : (
            <StockCard stockData={stockData} isPositive={isPositive} />
          )}
        </div>

        <div className="panel insight-panel">
          <div className="panel-header">
            <div>
              <span>AI 分析</span>
              <small>第三阶段接入 LLM</small>
            </div>
          </div>

          <div className="analysis-placeholder">
            <div className="json-badge">严格 JSON 输出预览</div>
            <p>
              下一阶段会把左侧行情数据发送给 LLM，并强制返回只有以下字段的 JSON，避免 Markdown、自然语言说明或多余字段。
            </p>
            <pre>{`{
  "summary": "...",
  "sentiment": "Bullish",
  "risk_level": "Medium"
}`}</pre>
          </div>

          <div className="todo-list">
            <div>
              <span>01</span>
              编写 LLM Prompt
            </div>
            <div>
              <span>02</span>
              后端校验 JSON 字段
            </div>
            <div>
              <span>03</span>
              保存分析结果到 Supabase
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StockCard({ stockData, isPositive }) {
  const chartData = useMemo(() => {
    const closes = stockData.recentCloses || [];
    const values = closes.map((item) => item.close);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return closes.map((item) => ({
      ...item,
      height: 28 + ((item.close - min) / range) * 72
    }));
  }, [stockData]);

  return (
    <div className="stock-card">
      <div className="stock-title-row">
        <div>
          <div className="symbol">{stockData.symbol}</div>
          <div className="date">
            最新交易日：{stockData.latestDate} · 前一交易日：{stockData.previousDate}
          </div>
        </div>
        <div className={isPositive ? "badge positive" : "badge negative"}>
          {isPositive ? "+" : ""}
          {stockData.changePercent}%
        </div>
      </div>

      <div className="price-strip">
        <span>最新收盘价</span>
        <strong>{formatCurrency(stockData.close)}</strong>
        <small className={isPositive ? "positive-text" : "negative-text"}>
          {isPositive ? "+" : ""}
          {formatCurrency(stockData.change)} / {isPositive ? "+" : ""}
          {stockData.changePercent}%
        </small>
      </div>

      <div className="metrics-grid">
        <Metric label="开盘价" value={formatCurrency(stockData.open)} />
        <Metric label="最高价" value={formatCurrency(stockData.high)} />
        <Metric label="最低价" value={formatCurrency(stockData.low)} />
        <Metric label="昨收价" value={formatCurrency(stockData.previousClose)} />
        <Metric label="成交量" value={formatNumber(stockData.volume)} />
        <Metric label="日内振幅" value={`${stockData.dayRangePercent}%`} />
      </div>

      <div className="mini-chart-card">
        <div className="mini-chart-header">
          <span>近 7 个交易日收盘价</span>
          <small>用于下一阶段 AI 趋势判断</small>
        </div>
        <div className="mini-chart">
          {chartData.map((item) => (
            <div className="bar-item" key={item.date} title={`${item.date}: ${item.close}`}>
              <div className="bar-value">{formatNumber(item.close)}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ height: `${item.height}px` }} />
              </div>
              <div className="bar-date">{item.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

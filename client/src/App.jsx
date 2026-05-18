import { useEffect, useMemo, useState } from "react";
import { analyzeStockData, fetchRecentAnalyses, fetchStockData } from "./api.js";

const QUICK_SYMBOLS = ["AAPL", "MSFT", "TSLA", "NVDA"];

function formatNumber(value, options = {}) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
    ...options
  }).format(value);
}

function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `$${formatNumber(value)}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function translateSentiment(value) {
  const map = {
    Bullish: "看涨",
    Neutral: "中性",
    Bearish: "看跌"
  };
  return map[value] || value || "-";
}

function translateRisk(value) {
  const map = {
    Low: "低风险",
    Medium: "中等风险",
    High: "高风险"
  };
  return map[value] || value || "-";
}

function normalizeCloseItem(item) {
  if (typeof item === "number") {
    return { date: "", close: item };
  }

  return {
    date: item?.date || "",
    close: typeof item?.close === "number" ? item.close : Number(item?.close)
  };
}

export default function App() {
  const [symbol, setSymbol] = useState("AAPL");
  const [stockData, setStockData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [recentWarning, setRecentWarning] = useState("");

  async function loadRecentAnalyses() {
    try {
      const data = await fetchRecentAnalyses(5);
      setRecentAnalyses(data.records || []);
      setRecentWarning(data.warning || "");
    } catch (err) {
      setRecentWarning(err.message || "读取历史分析记录失败。");
    }
  }

  useEffect(() => {
    loadRecentAnalyses();
  }, []);

  async function handleFetchStock(nextSymbol = symbol) {
    const cleanSymbol = nextSymbol.trim().toUpperCase();

    if (!cleanSymbol) {
      setError("请输入股票代码，例如 AAPL、MSFT、TSLA。");
      return;
    }

    try {
      setError("");
      setIsFetching(true);
      setStockData(null);
      setAnalysis(null);

      const data = await fetchStockData(cleanSymbol);
      setSymbol(data.symbol);
      setStockData(data);
    } catch (err) {
      setError(err.message || "获取行情数据失败，请稍后再试。");
    } finally {
      setIsFetching(false);
    }
  }

  async function handleAnalyzeStock() {
    if (!stockData) {
      setError("请先获取行情数据，再生成 AI 分析。");
      return;
    }

    try {
      setError("");
      setIsAnalyzing(true);
      setAnalysis(null);

      const result = await analyzeStockData(stockData.symbol, stockData);
      setAnalysis(result);
      await loadRecentAnalyses();
    } catch (err) {
      setError(err.message || "生成 AI 分析失败，请检查模型服务配置后再试。");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="app-shell">
      <TopBar />

      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">AI Stock Insight</span>
          <h1>智能股票分析面板</h1>
          <p>
            输入股票代码，获取最新日线行情，并生成简洁的 AI 分析摘要。适合快速查看价格变化、市场情绪与风险等级。
          </p>

          <div className="search-card">
            <div className="search-row">
              <input
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleFetchStock();
                }}
                placeholder="输入股票代码，例如 AAPL"
                aria-label="股票代码"
              />
              <button className="primary-button" onClick={() => handleFetchStock()} disabled={isFetching || isAnalyzing}>
                {isFetching ? "获取中..." : "获取行情"}
              </button>
              <button
                className="accent-button"
                onClick={handleAnalyzeStock}
                disabled={!stockData || isFetching || isAnalyzing}
              >
                {isAnalyzing ? "分析中..." : "生成分析"}
              </button>
            </div>

            <div className="quick-row" aria-label="快捷股票代码">
              {QUICK_SYMBOLS.map((item) => (
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
          </div>

          {error && <div className="error-banner">{error}</div>}
        </div>

        <div className="hero-side-card" aria-label="系统状态">
          <div className="status-pill">
            <span />
            数据服务已连接
          </div>
          <div className="side-number">3</div>
          <p>行情获取、AI 分析、云端记录已整合为一条操作流程。</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <StockOverview stockData={stockData} loading={isFetching} />
        <AnalysisPanel stockData={stockData} analysis={analysis} loading={isAnalyzing} />
      </section>

      <HistorySection records={recentAnalyses} warning={recentWarning} />

      <footer className="footer-note">
        本项目仅用于技术演示和学习交流，AI 分析结果不构成任何投资建议。
      </footer>
    </main>
  );
}

function TopBar() {
  return (
    <header className="top-bar">
      <div className="brand-mark">AI</div>
      <div>
        <strong>AI Stock Insight</strong>
        <span>智能行情分析</span>
      </div>
      <nav aria-label="功能概览">
        <span>实时行情</span>
        <span>AI 摘要</span>
        <span>云端记录</span>
      </nav>
    </header>
  );
}

function StockOverview({ stockData, loading }) {
  if (loading) {
    return (
      <section className="panel market-panel">
        <PanelTitle title="市场概览" subtitle="正在获取最新行情" />
        <SkeletonMarket />
      </section>
    );
  }

  if (!stockData) {
    return (
      <section className="panel market-panel">
        <PanelTitle title="市场概览" subtitle="输入股票代码后开始查询" />
        <div className="empty-card">
          <div className="empty-icon">↗</div>
          <strong>等待行情数据</strong>
          <p>输入股票代码并点击“获取行情”，这里会展示最新收盘价、涨跌幅和近 7 日趋势。</p>
        </div>
      </section>
    );
  }

  const isPositive = (stockData.changePercent || 0) >= 0;

  return (
    <section className="panel market-panel">
      <PanelTitle
        title="市场概览"
        subtitle={stockData.cached ? "已使用缓存行情，避免重复请求" : "来自 Alpha Vantage 日线行情"}
        tag={stockData.cached ? "缓存" : "实时"}
      />

      {stockData.warning && <div className="soft-warning">{stockData.warning}</div>}

      <div className="stock-header">
        <div>
          <div className="symbol-title">{stockData.symbol}</div>
          <div className="trade-date">最新交易日：{stockData.latestDate}</div>
        </div>
        <TrendBadge isPositive={isPositive} value={stockData.changePercent} />
      </div>

      <div className="price-card">
        <span>最新收盘价</span>
        <strong>{formatCurrency(stockData.close)}</strong>
        <small className={isPositive ? "up-text" : "down-text"}>
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

      <MiniChart data={stockData.recentCloses || []} />
    </section>
  );
}

function AnalysisPanel({ stockData, analysis, loading }) {
  return (
    <section className="panel analysis-panel">
      <PanelTitle title="AI 分析" subtitle="结构化摘要、情绪与风险等级" />

      {loading ? (
        <div className="analysis-loading">
          <div className="pulse-orb" />
          <strong>正在生成分析</strong>
          <p>模型正在阅读行情数据，并返回固定 JSON 字段。</p>
        </div>
      ) : !stockData ? (
        <div className="empty-card compact">
          <div className="empty-icon">✦</div>
          <strong>等待生成分析</strong>
          <p>获取行情后，点击“生成分析”即可看到 AI 摘要。</p>
        </div>
      ) : analysis ? (
        <AnalysisResult analysis={analysis} />
      ) : (
        <div className="empty-card compact">
          <div className="empty-icon">✓</div>
          <strong>{stockData.symbol} 行情已就绪</strong>
          <p>点击顶部“生成分析”，AI 会根据当前行情输出摘要、情绪和风险等级。</p>
        </div>
      )}
    </section>
  );
}

function AnalysisResult({ analysis }) {
  const sentimentClass = `insight-chip sentiment-${analysis.sentiment?.toLowerCase()}`;
  const riskClass = `insight-chip risk-${analysis.risk_level?.toLowerCase()}`;

  return (
    <div className="analysis-result">
      <span className="section-label">AI 观点摘要</span>
      <p className="summary-text">{analysis.summary}</p>

      <div className="insight-grid">
        <div className={sentimentClass}>
          <span>市场情绪</span>
          <strong>{translateSentiment(analysis.sentiment)}</strong>
          <small>{analysis.sentiment}</small>
        </div>
        <div className={riskClass}>
          <span>风险等级</span>
          <strong>{translateRisk(analysis.risk_level)}</strong>
          <small>{analysis.risk_level}</small>
        </div>
      </div>

      <div className={analysis.saved_to_supabase ? "save-line success" : "save-line warning"}>
        {analysis.saved_to_supabase ? "分析结果已同步到云端记录" : analysis.save_warning || "分析结果尚未同步到云端。"}
      </div>

      {analysis.generated_at && <div className="time-line">生成时间：{formatDateTime(analysis.generated_at)}</div>}

      <details className="technical-details">
        <summary>查看原始 JSON</summary>
        <pre>{JSON.stringify({
          summary: analysis.summary,
          sentiment: analysis.sentiment,
          risk_level: analysis.risk_level
        }, null, 2)}</pre>
      </details>
    </div>
  );
}

function HistorySection({ records, warning }) {
  return (
    <section className="panel history-panel">
      <PanelTitle title="最近记录" subtitle="最近 5 条 AI 分析结果" tag="Supabase" />

      {warning ? (
        <div className="soft-warning">{warning}</div>
      ) : records.length === 0 ? (
        <div className="history-empty">完成一次 AI 分析后，历史记录会显示在这里。</div>
      ) : (
        <div className="history-list">
          {records.map((record) => (
            <article className="history-item" key={record.id}>
              <div>
                <div className="history-symbol">{record.symbol}</div>
                <p>{record.summary}</p>
              </div>
              <div className="history-meta">
                <span>{translateSentiment(record.sentiment)}</span>
                <strong>{translateRisk(record.risk_level)}</strong>
                <time>{formatDateTime(record.created_at)}</time>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MiniChart({ data }) {
  const chartData = useMemo(() => {
    const cleaned = data.map(normalizeCloseItem).filter((item) => Number.isFinite(item.close));
    if (cleaned.length === 0) return [];

    const values = cleaned.map((item) => item.close);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return cleaned.map((item, index) => ({
      ...item,
      label: item.date ? item.date.slice(5) : `D${index + 1}`,
      height: 24 + ((item.close - min) / range) * 76
    }));
  }, [data]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="chart-card">
      <div className="chart-title">
        <span>近 7 日收盘趋势</span>
        <small>用于辅助判断短期方向</small>
      </div>
      <div className="bar-chart">
        {chartData.map((item) => (
          <div className="bar-item" key={`${item.date}-${item.close}`} title={`${item.date || item.label}: ${item.close}`}>
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${item.height}%` }} />
            </div>
            <strong>{item.label}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelTitle({ title, subtitle, tag }) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {tag && <span>{tag}</span>}
    </div>
  );
}

function TrendBadge({ isPositive, value }) {
  return (
    <div className={isPositive ? "trend-badge up" : "trend-badge down"}>
      {isPositive ? "+" : ""}
      {value}%
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SkeletonMarket() {
  return (
    <div className="skeleton-wrap">
      <div className="skeleton-line wide" />
      <div className="skeleton-price" />
      <div className="skeleton-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="skeleton-box" key={index} />
        ))}
      </div>
    </div>
  );
}

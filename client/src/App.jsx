import { useEffect, useMemo, useState } from "react";
import { analyzeStockData, fetchRecentAnalyses, fetchStockData } from "./api.js";

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

export default function App() {
  const [symbol, setSymbol] = useState("AAPL");
  const [stockData, setStockData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [recentWarning, setRecentWarning] = useState("");

  const isPositive = (stockData?.changePercent || 0) >= 0;

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

  async function handleFetchStock() {
    const cleanSymbol = symbol.trim().toUpperCase();

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
      setError(err.message || "生成 AI 分析失败，请检查 LLM_API_KEY、LLM_BASE_URL、LLM_MODEL 是否配置正确。");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-topline">
          <span className="status-dot" />
          第四阶段 · 已接入 Supabase 存储
        </div>

        <div className="hero-layout">
          <div>
            <div className="eyebrow">AI 股票分析面板</div>
            <h1>获取行情、生成 AI 分析并入库</h1>
            <p className="subtitle">
              输入股票代码后先拉取 Alpha Vantage 日线行情，再调用商汤 SenseNova 生成严格 JSON 分析，并将行情数据与 AI 分析结果写入 Supabase。
            </p>
          </div>

          <div className="hero-note">
            <strong>当前链路</strong>
            <span>前端 → Express → Alpha Vantage → SenseNova → JSON 校验 → Supabase 入库</span>
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
          <button onClick={handleFetchStock} disabled={isFetching || isAnalyzing}>
            {isFetching ? "正在获取..." : "获取行情"}
          </button>
          <button
            className="secondary-button"
            onClick={handleAnalyzeStock}
            disabled={!stockData || isFetching || isAnalyzing}
          >
            {isAnalyzing ? "分析中..." : "生成 AI 分析"}
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
              <small>SenseNova 返回严格 JSON，Supabase 保存结果</small>
            </div>
          </div>

          {!stockData ? (
            <div className="analysis-placeholder">
              <div className="json-badge">等待行情数据</div>
              <p>先在左侧获取股票行情，然后点击“生成 AI 分析”。</p>
              <pre>{`{
  "summary": "...",
  "sentiment": "Bullish",
  "risk_level": "Medium"
}`}</pre>
            </div>
          ) : analysis ? (
            <AnalysisResult analysis={analysis} />
          ) : (
            <div className="analysis-placeholder">
              <div className="json-badge">严格 JSON 输出预览</div>
              <p>
                已获取 {stockData.symbol} 行情。点击上方“生成 AI 分析”后，后端会用强 Prompt + JSON.parse + 字段校验，要求模型只返回指定字段。
              </p>
              <pre>{`{
  "summary": "...",
  "sentiment": "Bullish | Neutral | Bearish",
  "risk_level": "Low | Medium | High"
}`}</pre>
            </div>
          )}

          <div className="todo-list">
            <div>
              <span>01</span>
              Prompt 强制只返回 JSON
            </div>
            <div>
              <span>02</span>
              后端 JSON.parse + 字段校验
            </div>
            <div>
              <span>03</span>
              分析成功后写入 Supabase
            </div>
          </div>

          <RecentHistory records={recentAnalyses} warning={recentWarning} />
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
          <small>用于 AI 趋势判断</small>
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

function AnalysisResult({ analysis }) {
  const sentimentClass = `sentiment-pill sentiment-${analysis.sentiment?.toLowerCase()}`;
  const riskClass = `risk-pill risk-${analysis.risk_level?.toLowerCase()}`;

  return (
    <div className="analysis-result">
      <div className="result-label">AI 结构化分析结果</div>
      <p className="summary-text">{analysis.summary}</p>

      <div className="analysis-pills">
        <div className={sentimentClass}>
          <span>情绪</span>
          <strong>{translateSentiment(analysis.sentiment)}</strong>
          <small>{analysis.sentiment}</small>
        </div>
        <div className={riskClass}>
          <span>风险</span>
          <strong>{translateRisk(analysis.risk_level)}</strong>
          <small>{analysis.risk_level}</small>
        </div>
      </div>

      <pre className="json-output">{JSON.stringify({
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        risk_level: analysis.risk_level
      }, null, 2)}</pre>

      <div className={analysis.saved_to_supabase ? "storage-status success" : "storage-status warning"}>
        {analysis.saved_to_supabase
          ? `已写入 Supabase，记录 ID：${analysis.db_record?.id || "-"}`
          : analysis.save_warning || "尚未写入 Supabase。"}
      </div>

      {analysis.generated_at && (
        <div className="generated-time">
          生成时间：{new Date(analysis.generated_at).toLocaleString("zh-CN")}
        </div>
      )}
    </div>
  );
}

function RecentHistory({ records, warning }) {
  return (
    <div className="recent-card">
      <div className="recent-header">
        <span>最近分析记录</span>
        <small>来自 Supabase</small>
      </div>

      {warning ? (
        <div className="recent-warning">{warning}</div>
      ) : records.length === 0 ? (
        <div className="recent-empty">暂无历史记录。完成一次 AI 分析并成功入库后会显示在这里。</div>
      ) : (
        <div className="recent-list">
          {records.map((record) => (
            <div className="recent-item" key={record.id}>
              <div>
                <strong>{record.symbol}</strong>
                <p>{record.summary}</p>
              </div>
              <div className="recent-meta">
                <span>{translateSentiment(record.sentiment)}</span>
                <small>{translateRisk(record.risk_level)}</small>
                <time>{new Date(record.created_at).toLocaleString("zh-CN")}</time>
              </div>
            </div>
          ))}
        </div>
      )}
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

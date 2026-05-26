import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  DollarSign,
  Trash2,
  Globe,
  Loader2,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  X,
  ZoomIn,
} from "lucide-react";
import {
  analyzeAStock,
  analyzeStock,
  fetchAStock,
  fetchMarketIndices,
  fetchRecentAnalyses,
  fetchSectorPerformance,
  fetchStock,
  scanMarket,
  explainSmartPick,
  analyzeTechnical,
  explainTechnical,
  analyzeCapitalFlow,
  explainCapitalFlow,
  analyzeNorthbound,
  explainNorthbound,
  comprehensiveAnalysis,
  deleteAnalysis,
  saveSearchHistory,
  fetchSearchHistory,
  deleteSearchHistory,
  clearAllSearchHistory,
  fetchResearchReports,
  deleteResearchReport,
  fetchInvestmentTheses,
  deleteInvestmentThesis,
} from "./api.js";
import SmartScreener from "./SmartScreener.jsx";
import TechAnalysis from "./TechAnalysis.jsx";
import CapitalFlow from "./CapitalFlow.jsx";
import Northbound from "./Northbound.jsx";
import Comprehensive from "./Comprehensive.jsx";

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: decimals }).format(
    Number(value)
  );
}

function formatVolume(value) {
  if (!value) return "--";
  const n = Number(value);
  if (n >= 1e8) return (n / 1e8).toFixed(2) + "亿";
  if (n >= 1e4) return (n / 1e4).toFixed(2) + "万";
  return String(n);
}

function formatMarketCap(value) {
  if (!value) return "--";
  const n = Number(value);
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "万亿";
  if (n >= 1e8) return (n / 1e8).toFixed(2) + "亿";
  return (n / 1e4).toFixed(2) + "万";
}

function Sparkline({ values = [], height = 48, color }) {
  const points = useMemo(() => {
    if (!values.length) return "";
    const width = 220;
    const h = height;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values
      .map((v, i) => {
        const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
      })
      .join(" ");
  }, [values, height]);

  const isUp = values.length >= 2 && values[values.length - 1] >= values[0];

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 220 ${height}`}
      style={{ color: color || (isUp ? "var(--up)" : "var(--down)") }}
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SentimentBadge({ value }) {
  const normalized = value || "Neutral";
  return <span className={`badge badge-${normalized.toLowerCase()}`}>{normalized}</span>;
}

function RiskBadge({ value }) {
  const normalized = value || "Medium";
  return <span className={`badge risk-${normalized.toLowerCase()}`}>{normalized}</span>;
}

const WATCHLIST_KEY = "ai-stock-dashboard-watchlist";

function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveWatchlist(items) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
}

export default function App() {
  const [market, setMarket] = useState("usstock"); // "usstock" | "astock"
  const [symbol, setSymbol] = useState("");
  const [stockData, setStockData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [recent, setRecent] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [indices, setIndices] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [watchlist, setWatchlist] = useState(loadWatchlist);
  const [indicesScroll, setIndicesScroll] = useState(0);

  // New feature states
  const [smartPicks, setSmartPicks] = useState(null);
  const [pickExplanations, setPickExplanations] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [techData, setTechData] = useState(null);
  const [techAI, setTechAI] = useState(null);
  const [capitalData, setCapitalData] = useState(null);
  const [capitalAI, setCapitalAI] = useState(null);
  const [nbData, setNbData] = useState(null);
  const [nbAI, setNbAI] = useState(null);
  const [comprehensive, setComprehensive] = useState(null);
  const [compLoading, setCompLoading] = useState(false);
  const [sector, setSector] = useState("all");
  // Data management states
  const [dataTab, setDataTab] = useState("searchHistory");
  const [searchHistory, setSearchHistory] = useState([]);
  const [researchReports, setResearchReports] = useState([]);
  const [investmentTheses, setInvestmentTheses] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const isLoading = status === "loading-stock" || status === "loading-astock";
  const isAnalyzing = status === "analyzing";
  const isPositive = Number(stockData?.changePercent || 0) >= 0;

  async function loadRecent() {
    try {
      const payload = await fetchRecentAnalyses();
      setRecent(payload.items || []);
    } catch {
      setRecent([]);
    }
  }

  async function loadMarketOverview() {
    try {
      const marketParam = market === "usstock" ? "us" : "cn";
      const [idxRes, secRes] = await Promise.all([
        fetchMarketIndices(marketParam),
        fetchSectorPerformance(),
      ]);
      setIndices(idxRes.items || []);
      setSectors(secRes.items || []);
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    loadRecent();
    loadMarketOverview();
  }, [market]);

  useEffect(() => {
    // 刷新自选列表收盘价
    if (watchlist.length > 0) {
      const updateWatchlistPrices = async () => {
        const updated = await Promise.all(
          watchlist.map(async (item) => {
            try {
              if (item.market === "usstock") {
                const data = await fetchStock(item.symbol);
                return { ...item, close: data.close, changePercent: data.changePercent };
              } else {
                const data = await fetchAStock(item.symbol);
                return { ...item, close: data.close, changePercent: data.changePercent };
              }
            } catch (err) {
              console.warn(`Failed to update price for ${item.symbol}:`, err);
              return item;
            }
          })
        );
        setWatchlist(updated);
        saveWatchlist(updated);
      };
      updateWatchlistPrices();
    }
  }, []); // 只在挂载时执行一次

  useEffect(() => {
    if (market === "usstock") setSymbol("AAPL");
    else setSymbol("600519");
  }, [market]);

  async function handleFetch(event) {
    event?.preventDefault();
    setError("");
    setAnalysis(null);

    if (market === "usstock") {
      setStatus("loading-stock");
      try {
        const data = await fetchStock(symbol);
        setStockData(data);
        setSymbol(data.symbol);
        setStatus("stock-loaded");
        // 保存搜索历史
        try {
          await saveSearchHistory({
            symbol: data.symbol,
            name: data.name || data.symbol,
            sector: data.sector || '',
            analysisType: 'stock_fetch',
            resultCount: 1
          });
        } catch (err) {
          console.warn('Failed to save search history:', err);
        }
      } catch (err) {
        setError(err.message || "获取美股数据失败");
        setStatus("error");
      }
    } else {
      setStatus("loading-astock");
      try {
        const data = await fetchAStock(symbol);
        setStockData(data);
        setSymbol(data.symbol);
        setStatus("stock-loaded");
        // 保存搜索历史
        try {
          await saveSearchHistory({
            symbol: data.symbol,
            name: data.name || data.symbol,
            sector: data.sector || '',
            analysisType: 'stock_fetch',
            resultCount: 1
          });
        } catch (err) {
          console.warn('Failed to save search history:', err);
        }
      } catch (err) {
        setError(err.message || "获取A股数据失败");
        setStatus("error");
      }
    }
  }

  async function handleAnalyze() {
    if (!stockData) {
      setError("请先获取股票数据");
      return;
    }
    setError("");
    setStatus("analyzing");
    try {
      let result;
      if (market === "usstock") {
        result = await analyzeStock(stockData.symbol, stockData);
      } else {
        result = await analyzeAStock(stockData.symbol, stockData);
      }
      setAnalysis(result);
      setStatus("done");
      await loadRecent();
    } catch (err) {
      setError(err.message || "AI 分析失败");
      setStatus("error");
    }
  }

  const addToWatchlist = useCallback(() => {
    if (!stockData) return;
    const item = {
      symbol: stockData.symbol,
      name: stockData.name || stockData.symbol,
      market,
      close: stockData.close,
      changePercent: stockData.changePercent,
    };
    setWatchlist((prev) => {
      const exists = prev.find((w) => w.symbol === item.symbol);
      if (exists) return prev;
      const next = [...prev, item];
      saveWatchlist(next);
      return next;
    });
  }, [stockData, market]);

  const removeFromWatchlist = useCallback((sym) => {
    setWatchlist((prev) => {
      const next = prev.filter((w) => w.symbol !== sym);
      saveWatchlist(next);
      return next;
    });
  }, []);

  const selectFromWatchlist = useCallback((item) => {
    setMarket(item.market);
    setSymbol(item.symbol);
    setStockData(null);
    setAnalysis(null);
    setError("");
    setStatus("idle");
    // auto-fetch
    setTimeout(() => {
      if (item.market === "usstock") {
        setStatus("loading-stock");
        fetchStock(item.symbol)
          .then((data) => {
            setStockData(data);
            setStatus("stock-loaded");
          })
          .catch((err) => {
            setError(err.message);
            setStatus("error");
          });
      } else {
        setStatus("loading-astock");
        fetchAStock(item.symbol)
          .then((data) => {
            setStockData(data);
            setStatus("stock-loaded");
          })
          .catch((err) => {
            setError(err.message);
            setStatus("error");
          });
      }
    }, 100);
  }, []);

  // ── New feature handlers ──────────────────────────────────────────────────

  async function handleSmartPick() {
    setScanLoading(true);
    setError("");
    try {
      const result = await scanMarket(sector);
      setSmartPicks(result.stocks);
      // 保存搜索历史
      try {
        await saveSearchHistory({
          symbol: 'SCAN',
          name: `智能选股-${sector}`,
          sector: sector,
          analysisType: 'screener',
          resultCount: result.stocks.length
        });
      } catch (err) {
        console.warn('Failed to save search history:', err);
      }
      // Auto-explain
      try {
        const explain = await explainSmartPick(result.stocks, "正常");
        setPickExplanations(explain);
      } catch {
        // ignore explanation failure
      }
    } catch (err) {
      setError("智能选股失败: " + (err.message || "未知错误"));
    } finally {
      setScanLoading(false);
    }
  }

  async function handleTechAnalysis() {
    if (!stockData?.symbol) {
      setError("请先获取股票数据");
      return;
    }
    try {
      const tech = await analyzeTechnical(stockData.symbol);
      setTechData(tech);
      const ai = await explainTechnical({
        stockName: stockData.name || stockData.symbol,
        indicators: tech.allIndicators,
        signals: tech.allSignals,
      });
      setTechAI(ai);
    } catch (err) {
      setError("技术分析失败: " + err.message);
    }
  }

  async function handleCapitalAnalysis() {
    if (!stockData?.symbol) {
      setError("请先获取股票数据");
      return;
    }
    try {
      const cap = await analyzeCapitalFlow(stockData.symbol);
      setCapitalData(cap);
      const ai = await explainCapitalFlow({
        stockName: stockData.name || stockData.symbol,
        flowData: cap,
        priceInfo: { close: stockData.close, changePercent: stockData.changePercent },
      });
      setCapitalAI(ai);
    } catch (err) {
      setError("资金分析失败: " + err.message);
    }
  }

  async function handleNorthboundAnalysis() {
    try {
      const nb = await analyzeNorthbound();
      setNbData(nb);
      const ai = await explainNorthbound({ nbData: nb, marketContext: "正常" });
      setNbAI(ai);
    } catch (err) {
      setError("北向资金分析失败: " + err.message);
    }
  }

  async function handleComprehensive() {
    if (!stockData?.symbol) {
      setError("请先获取股票数据");
      return;
    }
    setCompLoading(true);
    setError("");
    try {
      // Fetch all three dimensions
      const [tech, cap, nb] = await Promise.all([
        analyzeTechnical(stockData.symbol).catch(() => null),
        analyzeCapitalFlow(stockData.symbol).catch(() => null),
        analyzeNorthbound().catch(() => null),
      ]);

      const comp = await comprehensiveAnalysis({
        stockName: stockData.name || stockData.symbol,
        technical: tech,
        capital: cap,
        northbound: nb,
        marketIndex: "上证指数",
      });
      setComprehensive(comp);
    } catch (err) {
      setError("综合研判失败: " + err.message);
    } finally {
      setCompLoading(false);
    }
  }

  async function loadDataTab(tab) {
    setDataTab(tab);
    try {
      if (tab === "searchHistory") {
        const res = await fetchSearchHistory();
        setSearchHistory(res.items || []);
      } else if (tab === "researchReports") {
        const res = await fetchResearchReports();
        setResearchReports(res.items || []);
      } else if (tab === "investmentTheses") {
        const res = await fetchInvestmentTheses();
        setInvestmentTheses(res.items || []);
      }
    } catch {
      // silently ignore
    }
  }

  async function handleDeleteAnalysis(id) {
    try {
      await deleteAnalysis(id);
      setRecent((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // silently ignore
    }
  }

  async function handleDeleteRecord(tab, id) {
    setDeletingId(id);
    try {
      if (tab === "searchHistory") {
        await deleteSearchHistory(id);
        setSearchHistory((prev) => prev.filter((r) => r.id !== id));
      } else if (tab === "researchReports") {
        await deleteResearchReport(id);
        setResearchReports((prev) => prev.filter((r) => r.id !== id));
      } else if (tab === "investmentTheses") {
        await deleteInvestmentThesis(id);
        setInvestmentTheses((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClearAll(tab) {
    try {
      if (tab === "searchHistory") {
        await clearAllSearchHistory();
        setSearchHistory([]);
      } else if (tab === "researchReports") {
        // No bulk clear in backend; delete one by one
        await Promise.all(researchReports.map((r) => deleteResearchReport(r.id)));
        setResearchReports([]);
      }
    } catch {
      // silently ignore
    }
  }
  const handleIndicesScroll = useCallback(
    (dir) => {
      setIndicesScroll((prev) => {
        const max = Math.max(0, indices.length - 4);
        if (dir === "left") return Math.max(0, prev - 1);
        return Math.min(max, prev + 1);
      });
    },
    [indices.length]
  );

  const placeholder = market === "usstock" ? "AAPL, TSLA, MSFT" : "600519, 000858, 300750";

  const visibleIndices = indices.slice(indicesScroll, indicesScroll + 5);
  const topSectors = sectors.slice(0, 8);

  return (
    <div className="dashboard">
      {/* ==================== TopBar ==================== */}
      <header className="topbar">
        <div className="topbar-left">
          <BarChart3 size={22} />
          <h1>AI 股票 Dashboard</h1>
        </div>
        <div className="market-tabs" role="tablist">
          <button
            role="tab"
            className={market === "usstock" ? "tab active" : "tab"}
            onClick={() => setMarket("usstock")}
          >
            美股
          </button>
          <button
            role="tab"
            className={market === "astock" ? "tab active" : "tab"}
            onClick={() => setMarket("astock")}
          >
            A股
          </button>
        </div>
      </header>

      {/* ==================== Market Overview ==================== */}
      <section className="market-overview">
        <div className="indices-section">
          <div className="section-header">
            <h3>大盘指数</h3>
            <div className="scroll-arrows">
              <button onClick={() => scrollIndices("left")} disabled={indicesScroll === 0}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => scrollIndices("right")} disabled={indicesScroll >= indices.length - 5}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          {indices.length > 0 ? (
            <div className="indices-row">
              {visibleIndices.map((idx) => (
                <div key={idx.code} className={`index-card ${idx.changePercent >= 0 ? "up" : "down"}`}>
                  <span className="index-name">{idx.name}</span>
                  <strong className="index-value">{formatNumber(idx.close)}</strong>
                  <span className={`index-change ${idx.changePercent >= 0 ? "positive" : "negative"}`}>
                    {idx.changePercent >= 0 ? "+" : ""}
                    {formatNumber(idx.changePercent)}%
                  </span>
                  <Sparkline values={idx.recentCloses} height={32} />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-row">加载指数数据中…</div>
          )}
        </div>

        {topSectors.length > 0 && (
          <div className="sectors-section">
            <h3>行业板块</h3>
            <div className="sectors-row">
              {topSectors.map((sec) => {
                const pct = sec.changePercent;
                const intensity = Math.min(Math.abs(pct) / 8, 1);
                const bg =
                  pct >= 0
                    ? `rgba(239,68,68,${intensity * 0.3})`
                    : `rgba(34,197,94,${intensity * 0.3})`;
                const color = pct >= 0 ? "var(--up)" : "var(--down)";
                return (
                  <div key={sec.code} className="sector-tag" style={{ background: bg, color }}>
                    <span>{sec.name}</span>
                    <span className="sector-pct">
                      {pct >= 0 ? "+" : ""}
                      {formatNumber(pct)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ==================== Search & Action Panel ==================== */}
      <section className="search-panel">
        <form onSubmit={handleFetch} className="search-form">
          <input
            value={symbol}
            onChange={(e) => setSymbol(market === "usstock" ? e.target.value.toUpperCase() : e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
          />
          <button type="submit" disabled={isLoading || isAnalyzing || !symbol.trim()}>
            {isLoading ? <Loader2 className="spin" size={18} /> : <Activity size={18} />}
            获取数据
          </button>
        </form>
        <button
          className="btn-analyze"
          onClick={handleAnalyze}
          disabled={!stockData || isAnalyzing || isLoading}
        >
          {isAnalyzing ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
          AI 分析
        </button>
        {stockData && (
          <button className="btn-watchlist" onClick={addToWatchlist}>
            <Star size={18} /> 加入自选
          </button>
        )}

        {error && (
          <div className="message error-message">
            <AlertTriangle size={18} /> {error}
          </div>
        )}
        {analysis?.warning && (
          <div className="message warning-message">
            <AlertTriangle size={18} /> {analysis.warning}
          </div>
        )}
      </section>

      {/* ==================== Smart Screener + Northbound Row ==================== */}
      <div className="top-secondary-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #444",
              background: "#1a1a1a",
              color: "#ccc",
              fontSize: "14px",
              cursor: "pointer",
              width: "fit-content",
            }}
          >
            <option value="all">全市场</option>
            <option value="bank">银行</option>
            <option value="liquor">白酒</option>
            <option value="semiconductor">半导体</option>
            <option value="new_energy">新能源</option>
            <option value="auto">汽车</option>
            <option value="power">电力</option>
            <option value="real_estate">房地产</option>
            <option value="metal">有色金属</option>
            <option value="ai">人工智能</option>
          </select>
          <SmartScreener
            smartPicks={smartPicks}
            pickExplanations={pickExplanations}
            scanLoading={scanLoading}
            onScan={handleSmartPick}
            onSelectStock={(sym) => { setMarket("astock"); setSymbol(sym); }}
          />
        </div>
        <Northbound
          nbData={nbData}
          nbAI={nbAI}
          onAnalyze={handleNorthboundAnalysis}
        />
      </div>

      {/* ==================== Main Grid: Stock Detail + AI Analysis ==================== */}
      <section className="main-grid">
        {/* --- Stock Detail --- */}
        <div className="card stock-detail">
          <div className="card-header">
            <h2>
              {stockData?.name || stockData?.symbol || "尚未选择股票"}
            </h2>
            {stockData && (
              <span className="symbol-tag">
                {stockData.symbol}
                <span className={`market-badge ${market}`}>
                  {market === "usstock" ? "美股" : "A股"}
                </span>
              </span>
            )}
          </div>

          {stockData ? (
            <>
              <div className="price-section">
                <div className="price-main">
                  <span className="price-label">最新价</span>
                  <strong className="price-value">
                    {market === "usstock" ? "$" : "¥"}
                    {formatNumber(stockData.close)}
                  </strong>
                  <span className={`change-badge ${isPositive ? "positive" : "negative"}`}>
                    {isPositive ? "+" : ""}
                    {formatNumber(stockData.changePercent)}%
                  </span>
                </div>
                <Sparkline values={stockData.recentCloses} height={64} />
              </div>

              <div className="stats-grid">
                <div className="stat-item">
                  <span>开盘</span>
                  <strong>{market === "usstock" ? "$" : "¥"}{formatNumber(stockData.open)}</strong>
                </div>
                <div className="stat-item">
                  <span>最高</span>
                  <strong>{market === "usstock" ? "$" : "¥"}{formatNumber(stockData.high)}</strong>
                </div>
                <div className="stat-item">
                  <span>最低</span>
                  <strong>{market === "usstock" ? "$" : "¥"}{formatNumber(stockData.low)}</strong>
                </div>
                <div className="stat-item">
                  <span>成交量</span>
                  <strong>{formatVolume(stockData.volume)}</strong>
                </div>
              </div>

              {market === "astock" && (
                <div className="stats-grid astock-extras">
                  {stockData.limitUp !== undefined && (
                    <div className="stat-item">
                      <span>涨停价</span>
                      <strong className="text-up">¥{formatNumber(stockData.limitUp)}</strong>
                    </div>
                  )}
                  {stockData.limitDown !== undefined && (
                    <div className="stat-item">
                      <span>跌停价</span>
                      <strong className="text-down">¥{formatNumber(stockData.limitDown)}</strong>
                    </div>
                  )}
                  {stockData.pe !== undefined && (
                    <div className="stat-item">
                      <span>市盈率</span>
                      <strong>{formatNumber(stockData.pe)}</strong>
                    </div>
                  )}
                  {stockData.turnoverRate !== undefined && (
                    <div className="stat-item">
                      <span>换手率</span>
                      <strong>{formatNumber(stockData.turnoverRate)}%</strong>
                    </div>
                  )}
                  {stockData.totalMarketCap !== undefined && (
                    <div className="stat-item">
                      <span>总市值</span>
                      <strong>{formatMarketCap(stockData.totalMarketCap)}</strong>
                    </div>
                  )}
                  {stockData.amount !== undefined && (
                    <div className="stat-item">
                      <span>成交额</span>
                      <strong>{formatVolume(stockData.amount)}</strong>
                    </div>
                  )}
                </div>
              )}

              <p className="date-note">数据日期: {stockData.latestDate}</p>

              {market === "astock" && (
                <button
                  className="btn-comprehensive"
                  onClick={handleComprehensive}
                  disabled={compLoading}
                >
                  {compLoading ? <Loader2 className="spin" size={16} /> : <ZoomIn size={16} />}
                  {compLoading ? "研判中…" : "一键综合研判"}
                </button>
              )}
            </>
          ) : (
            <div className="empty-state">
              输入股票代码并点击"获取数据"，此处将展示实时行情
            </div>
          )}
        </div>

        {/* --- AI Analysis --- */}
        <div className="card analysis-panel">
          <div className="card-header">
            <h2>AI 分析结果</h2>
            {analysis && <CheckCircle2 size={20} className="icon-success" />}
          </div>

          {analysis ? (
            <>
              <p className="summary-text">{analysis.summary}</p>

              <div className="analysis-tags">
                <div className="tag-group">
                  <label>情绪</label>
                  <SentimentBadge value={analysis.sentiment} />
                </div>
                <div className="tag-group">
                  <label>风险</label>
                  <RiskBadge value={analysis.risk_level} />
                </div>
                {analysis.suggestion && (
                  <div className="tag-group">
                    <label>建议</label>
                    <span className="badge badge-suggestion">{analysis.suggestion}</span>
                  </div>
                )}
                <div className="tag-group">
                  <label>存储</label>
                  <span className={`badge ${analysis.saved ? "saved" : "not-saved"}`}>
                    {analysis.saved ? "已保存" : "未配置"}
                  </span>
                </div>
              </div>

              {analysis.key_factors && analysis.key_factors.length > 0 && (
                <div className="key-factors">
                  <h4>关键因素</h4>
                  <ul>
                    {analysis.key_factors.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              </>
          ) : (
            <div className="empty-state">获取数据后点击"AI 分析"，由大模型生成分析结果</div>
          )}
        </div>
      </section>

      {/* ==================== Technical + Capital Row ==================== */}
      {stockData && (
        <div className="analysis-row">
          <TechAnalysis
            techData={techData}
            techAI={techAI}
            onAnalyze={handleTechAnalysis}
          />
          <CapitalFlow
            capitalData={capitalData}
            capitalAI={capitalAI}
            onAnalyze={handleCapitalAnalysis}
          />
        </div>
      )}

      {/* ==================== Comprehensive ==================== */}
      {stockData && (
        <Comprehensive
          comprehensive={comprehensive}
          loading={compLoading}
          onAnalyze={handleComprehensive}
        />
      )}

      {/* ==================== Bottom Grid: Watchlist + History ==================== */}
      <section className="bottom-grid">
        {/* --- Watchlist --- */}
        <div className="card watchlist-panel">
          <div className="card-header">
            <h2><Star size={18} /> 自选列表</h2>
          </div>
          {watchlist.length > 0 ? (
            <div className="watchlist-items">
              {watchlist.map((item) => (
                <div
                  key={item.symbol}
                  className="watchlist-row"
                  onClick={() => selectFromWatchlist(item)}
                >
                  <div className="wl-info">
                    <strong>{item.symbol}</strong>
                    <span className="wl-name">{item.name}</span>
                    <span className={`wl-market ${item.market}`}>
                      {item.market === "usstock" ? "美股" : "A股"}
                    </span>
                  </div>
                  <div className="wl-price">
                    <span className="wl-close">
                      {item.market === "usstock" ? "$" : "¥"}
                      {formatNumber(item.close)}
                    </span>
                    <span className={`wl-change ${(item.changePercent ?? 0) >= 0 ? "positive" : "negative"}`}>
                      {(item.changePercent ?? 0) >= 0 ? "+" : ""}
                      {formatNumber(item.changePercent)}%
                    </span>
                  </div>
                  <button
                    className="wl-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWatchlist(item.symbol);
                    }}
                    title="移除自选"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">获取股票数据后点击"加入自选"，自选股票保存在本地浏览器</div>
          )}
        </div>

        {/* --- History --- */}
        <div className="card history-panel">
          <div className="card-header">
            <h2><Database size={18} /> 最近分析</h2>
          </div>
          {recent.length > 0 ? (
            <div className="history-list">
              {recent.map((item) => (
                <article key={item.id} className="history-item">
                  <div className="hi-top">
                    <button
                      className="hi-delete"
                      onClick={() => handleDeleteAnalysis(item.id)}
                      title="删除此条"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="hi-symbol">
                      <strong>{item.symbol}</strong>
                      {item.name && <span className="hi-name">{item.name}</span>}
                    </div>
                    <span className="hi-date">
                      {new Date(item.created_at).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  <p>{item.summary}</p>
                  <div className="hi-tags">
                    <SentimentBadge value={item.sentiment} />
                    <RiskBadge value={item.risk_level} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">完成 AI 分析后，此处会展示最近 5 条分析记录</div>
          )}
        </div>
      </section>

      {/* ==================== Data Management ==================== */}
      <section className="data-mgmt">
        <div className="card data-mgmt-card">
          <div className="card-header">
            <h2><Database size={18} /> 数据管理</h2>
            <div className="data-tabs">
              <button
                className={dataTab === "searchHistory" ? "tab active" : "tab"}
                onClick={() => loadDataTab("searchHistory")}
              >
                搜索历史
              </button>
              <button
                className={dataTab === "researchReports" ? "tab active" : "tab"}
                onClick={() => loadDataTab("researchReports")}
              >
                研判报告
              </button>
              <button
                className={dataTab === "investmentTheses" ? "tab active" : "tab"}
                onClick={() => loadDataTab("investmentTheses")}
              >
                投资论点
              </button>
            </div>
          </div>

          {/* Search History */}
          {dataTab === "searchHistory" && (
            <div className="data-table-wrap">
              {searchHistory.length > 0 ? (
                <>
                  <button
                    className="btn-clearall"
                    onClick={() => handleClearAll("searchHistory")}
                  >
                    清空全部
                  </button>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>搜索词</th>
                        <th>市场</th>
                        <th>结果数</th>
                        <th>时间</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchHistory.map((r) => (
                        <tr key={r.id}>
                          <td>{r.query || "--"}</td>
                          <td>{r.market || "--"}</td>
                          <td>{r.result_count ?? "--"}</td>
                          <td>{new Date(r.created_at).toLocaleString("zh-CN")}</td>
                          <td>
                            <button
                              className="btn-row-delete"
                              onClick={() => handleDeleteRecord("searchHistory", r.id)}
                              disabled={deletingId === r.id}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="empty-state">点击"搜索历史"标签加载数据</div>
              )}
            </div>
          )}

          {/* Research Reports */}
          {dataTab === "researchReports" && (
            <div className="data-table-wrap">
              {researchReports.length > 0 ? (
                <>
                  <button
                    className="btn-clearall"
                    onClick={() => handleClearAll("researchReports")}
                  >
                    清空全部
                  </button>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>股票</th>
                        <th>板块</th>
                        <th>推荐</th>
                        <th>时间</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {researchReports.map((r) => (
                        <tr key={r.id}>
                          <td>{r.symbol || "--"}</td>
                          <td>{r.sector || "--"}</td>
                          <td><RiskBadge value={r.recommendation} /></td>
                          <td>{new Date(r.created_at).toLocaleString("zh-CN")}</td>
                          <td>
                            <button
                              className="btn-row-delete"
                              onClick={() => handleDeleteRecord("researchReports", r.id)}
                              disabled={deletingId === r.id}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="empty-state">点击"研判报告"标签加载数据</div>
              )}
            </div>
          )}

          {/* Investment Theses */}
          {dataTab === "investmentTheses" && (
            <div className="data-table-wrap">
              {investmentTheses.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>股票</th>
                      <th>场景</th>
                      <th>状态</th>
                      <th>时间</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {investmentTheses.map((r) => (
                      <tr key={r.id}>
                        <td>{r.symbol || "--"}</td>
                        <td>{r.scenario || "--"}</td>
                        <td><span className={`badge thesis-${(r.status || "").toLowerCase()}`}>{r.status}</span></td>
                        <td>{new Date(r.created_at).toLocaleString("zh-CN")}</td>
                        <td>
                          <button
                            className="btn-row-delete"
                            onClick={() => handleDeleteRecord("investmentTheses", r.id)}
                            disabled={deletingId === r.id}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">点击"投资论点"标签加载数据</div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ==================== Footer ==================== */}
      <footer className="footer">
        <span>美股数据: Alpha Vantage</span>
        <span className="sep">|</span>
        <span>A股数据: 智兔数服</span>
        <span className="sep">|</span>
        <span>AI 分析: 商汤 SenseNova</span>
        <span className="sep">|</span>
        <span>存储: Supabase</span>
      </footer>
    </div>
  );
}
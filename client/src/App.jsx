import { useCallback, useEffect, useState } from "react";
import { BarChart3, Moon, Sun } from "lucide-react";
import {
  analyzeAStock, analyzeStock, fetchAStock, fetchMarketIndices,
  fetchRecentAnalyses, fetchSectorPerformance, fetchStock, scanMarket,
  explainSmartPick, analyzeTechnical, explainTechnical,
  analyzeCapitalFlow, explainCapitalFlow, analyzeNorthbound, explainNorthbound,
  comprehensiveAnalysis, deleteAnalysis, saveSearchHistory, fetchSearchHistory,
  deleteSearchHistory, clearAllSearchHistory, fetchResearchReports,
  deleteResearchReport, fetchInvestmentTheses, deleteInvestmentThesis,
  fetchEastMoneySectors, fetchEastMoneyQuote, fetchEastMoneyFlow
} from "./api.js";

import SmartScreener from "./SmartScreener.jsx";
import TechAnalysis from "./TechAnalysis.jsx";
import CapitalFlow from "./CapitalFlow.jsx";
import Northbound from "./Northbound.jsx";
import Comprehensive from "./Comprehensive.jsx";
import { MarketOverview } from "./components/index.js";
import StockDetail from "./StockDetail.jsx";
import AIAnalysisPanel from "./AIAnalysisPanel.jsx";
import SearchPanel from "./SearchPanel.jsx";
import WatchlistPanel from "./WatchlistPanel.jsx";
import HistoryPanel from "./HistoryPanel.jsx";
import DataManagement from "./DataManagement.jsx";

import { loadWatchlist, saveWatchlist } from "./utils/watchlistStorage.js";
import { useTheme } from "./hooks/useTheme.js";
import { useTabNavigation } from "./hooks/useTabNavigation.js";

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { activeTab, setActiveTab } = useTabNavigation();
  const [market, setMarket] = useState("usstock");
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
  const [dataTab, setDataTab] = useState("searchHistory");
  const [searchHistory, setSearchHistory] = useState([]);
  const [researchReports, setResearchReports] = useState([]);
  const [investmentTheses, setInvestmentTheses] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [eastMoneySectors, setEastMoneySectors] = useState([]);
  const [emQuote, setEmQuote] = useState(null);
  const [emFlow, setEmFlow] = useState(null);
  const [scanError, setScanError] = useState("");
  const [supabaseStatus, setSupabaseStatus] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("dashboardTheme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  const isLoading = status === "loading-stock" || status === "loading-astock";
  const isAnalyzing = status === "analyzing";

  // ── Data loading ──────────────────────────────────────────────────────────
  async function loadRecent() {
    // 加载最近分析记录
    try {
      const r = await fetchRecentAnalysis();
      setRecent(r.items || []);
    } catch (err) {
      console.error('[App] 加载最近分析失败:', err.message || err);
      setRecent([]);
    }
  }

  async function loadMarketOverview() {
    try {
      const mkt = market === "usstock" ? "us" : "cn";
      const [i, s] = await Promise.all([fetchMarketIndices(mkt), fetchSectorPerformance()]);
      setIndices(i.items || []);
      setSectors(s.items || []);
    } catch (err) { console.error('[App] 加载市场概览失败:', err.message || err); }
  }

  async function loadDataTab(tab) {
    setDataTab(tab);
    try {
      if (tab === "searchHistory") { const r = await fetchSearchHistory(); setSearchHistory(r.items || []); }
      else if (tab === "researchReports") { const r = await fetchResearchReports(); setResearchReports(r.items || []); }
      else if (tab === "investmentTheses") { const r = await fetchInvestmentTheses(); setInvestmentTheses(r.items || []); }
    } catch (err) { console.error('[App] 加载数据标签页失败:', err.message || err); }
  }

  useEffect(() => { loadRecent(); loadMarketOverview(); }, [market]);
  useEffect(() => {
    if (market === "astock") {
      (async () => {
        try { const s = await fetchEastMoneySectors(); setEastMoneySectors(s.data?.items || []); } catch (err) { console.error('[App] 加载东方财富板块失败:', err.message || err); }
        try {
          const defaultSecids = ["0.000001", "1.399001", "0.000688"];
          const results = await Promise.allSettled(defaultSecids.map(sid => fetchEastMoneyQuote(sid)));
          setEmQuote(results.map(r => r.status === "fulfilled" ? r.value.data : null).filter(Boolean));
        } catch (err) { console.error('[App] 加载东方财富报价失败:', err.message || err); }
      })();
    } else {
      setEastMoneySectors([]);
      setEmQuote(null);
      setEmFlow(null);
    }
  }, [market]);
  useEffect(() => {
    if (watchlist.length > 0) {
      (async () => {
        const updated = await Promise.all(watchlist.map(async (item) => {
          try {
            const data = item.market === "usstock" ? await fetchStock(item.symbol) : await fetchAStock(item.symbol);
            return { ...item, close: data.close, changePercent: data.changePercent };
          } catch { return item; }
        }));
        setWatchlist(updated);
        saveWatchlist(updated);
      })();
    }
  }, []);
  useEffect(() => { setSymbol(market === "usstock" ? "AAPL" : "600519"); }, [market]);

  // ── Core handlers ─────────────────────────────────────────────────────────
  async function handleFetch(event) {
    event?.preventDefault();
    setError(""); setAnalysis(null);
    try {
      const data = market === "usstock"
        ? await (setStatus("loading-stock"), fetchStock(symbol))
        : await (setStatus("loading-astock"), fetchAStock(symbol));
      setStockData(data);
      setSymbol(data.symbol);
      setStatus("stock-loaded");
      try { await saveSearchHistory({ symbol: data.symbol, name: data.name || data.symbol, sector: data.sector || '', analysisType: 'stock_fetch', resultCount: 1 }); }
      catch (err) { console.error('[App] 保存搜索历史失败:', err.message || err); }
    } catch (err) { setError(err.message || (market === "usstock" ? "获取美股数据失败" : "获取A股数据失败")); setStatus("error"); }
  }

  async function handleAnalyze() {
    if (!stockData) { setError("请先获取股票数据"); return; }
    setError(""); setStatus("analyzing");
    try {
      const result = market === "usstock" ? await analyzeStock(stockData.symbol, stockData) : await analyzeAStock(stockData.symbol, stockData);
      setAnalysis(result); setStatus("done"); await loadRecent();
    } catch (err) { setError(err.message || "AI 分析失败"); setStatus("error"); }
  }

  async function handleSmartPick() {
    setScanLoading(true); setError(""); setScanError("");
    try {
      const result = await scanMarket(sector);
      setSmartPicks(result.stocks);
      if (!result.stocks || result.stocks.length === 0) {
        setScanError("扫描无结果");
      } else if (result.warning) {
        setScanError(result.warning);
      }
      try { await saveSearchHistory({ symbol: 'SCAN', name: `智能选股-${sector}`, sector, analysisType: 'screener', resultCount: result.stocks ? result.stocks.length : 0 }); } catch (err) { console.error('[App] 保存选股历史失败:', err.message || err); }
      try { const e = await explainSmartPick(result.stocks, "正常"); setPickExplanations(e); } catch (err) { console.error('[App] 获取选股解释失败:', err.message || err); }
    } catch (err) { setError("智能选股失败: " + (err.message || "未知错误")); setScanError("智能选股失败: " + (err.message || "未知错误")); }
    finally { setScanLoading(false); }
  }

  async function handleTechAnalysis() {
    if (!stockData?.symbol) { setError("请先获取股票数据"); return; }
    try {
      const t = await analyzeTechnical(stockData.symbol); setTechData(t);
      const a = await explainTechnical({ stockName: stockData.name || stockData.symbol, indicators: t.allIndicators, signals: t.allSignals }); setTechAI(a);
    } catch (err) { setError("技术分析失败: " + err.message); }
  }

  async function handleCapitalAnalysis() {
    if (!stockData?.symbol) { setError("请先获取股票数据"); return; }
    try {
      const c = await analyzeCapitalFlow(stockData.symbol); setCapitalData(c);
      const a = await explainCapitalFlow({ stockName: stockData.name || stockData.symbol, flowData: c, priceInfo: { close: stockData.close, changePercent: stockData.changePercent } }); setCapitalAI(a);
    } catch (err) { setError("资金分析失败: " + err.message); }
  }

  async function handleNorthboundAnalysis() {
    try {
      const nb = await analyzeNorthbound(); setNbData(nb);
      const a = await explainNorthbound({ nbData: nb, marketContext: "正常" }); setNbAI(a);
    } catch (err) { setError("北向资金分析失败: " + err.message); }
  }

  async function handleComprehensive() {
    if (!stockData?.symbol) { setError("请先获取股票数据"); return; }
    setCompLoading(true); setError("");
    try {
      const [tech, cap, nb, finance] = await Promise.all([
        analyzeTechnical(stockData.symbol).catch(() => null),
        analyzeCapitalFlow(stockData.symbol).catch(() => null),
        analyzeNorthbound().catch(() => null),
        (async () => {
          try {
            const h = await (await fetch("/api/finance/health-assessment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol: stockData.symbol }) })).json();
            const c = await (await fetch("/api/finance/comps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol: stockData.symbol }) })).json();
            return { health: h, comps: c, target: h ? { symbol: h.symbol, finance: stockData.finance } : null };
          } catch { return { health: null, comps: null, target: null }; }
        })()
      ]);
      const comp = await comprehensiveAnalysis({ stockName: stockData.name || stockData.symbol, stockSymbol: stockData.symbol, technical: tech, capital: cap, northbound: nb, marketIndex: "上证指数", financeData: finance });
      setComprehensive(comp);
    } catch (err) { setError("综合研判失败: " + err.message); }
    finally { setCompLoading(false); }
  }

  // ── Data management handlers ──────────────────────────────────────────────
  async function checkSupabase() {
    try {
      const res = await fetch("/api/research/check-status");
      const data = await res.json();
      setSupabaseStatus(data);
    } catch (e) {
      setSupabaseStatus({ ok: false, error: e.message });
    }
  }

  useEffect(() => {
    if (activeTab === "data") {
      checkSupabase();
    }
  }, [activeTab]);

  async function handleDeleteAnalysis(id) {
    try { await deleteAnalysis(id); setRecent(p => p.filter(r => r.id !== id)); } catch (err) { console.error('[App] 删除分析记录失败:', err.message || err); }
  }

  async function handleDeleteRecord(tab, id) {
    setDeletingId(id);
    try {
      if (tab === "searchHistory") { await deleteSearchHistory(id); setSearchHistory(p => p.filter(r => r.id !== id)); }
      else if (tab === "researchReports") { await deleteResearchReport(id); setResearchReports(p => p.filter(r => r.id !== id)); }
      else if (tab === "investmentTheses") { await deleteInvestmentThesis(id); setInvestmentTheses(p => p.filter(r => r.id !== id)); }
    } catch (err) { console.error('[App] 删除数据记录失败:', err.message || err); }
    finally { setDeletingId(null); }
  }

  async function handleClearAll(tab) {
    try {
      if (tab === "searchHistory") { await clearAllSearchHistory(); setSearchHistory([]); }
      else if (tab === "researchReports") { await Promise.all(researchReports.map(r => deleteResearchReport(r.id))); setResearchReports([]); }
    } catch (err) { console.error('[App] 清空数据失败:', err.message || err); }
  }

  // ── Watchlist handlers ────────────────────────────────────────────────────
  const addToWatchlist = useCallback(() => {
    if (!stockData) return;
    const item = { symbol: stockData.symbol, name: stockData.name || stockData.symbol, market, close: stockData.close, changePercent: stockData.changePercent };
    setWatchlist(prev => {
      if (prev.find(w => w.symbol === item.symbol)) return prev;
      const next = [...prev, item]; saveWatchlist(next); return next;
    });
  }, [stockData, market]);

  const removeFromWatchlist = useCallback((sym) => {
    setWatchlist(prev => { const next = prev.filter(w => w.symbol !== sym); saveWatchlist(next); return next; });
  }, []);

  const selectFromWatchlist = useCallback((item) => {
    setMarket(item.market); setSymbol(item.symbol); setStockData(null); setAnalysis(null); setError(""); setStatus("idle");
    setTimeout(() => {
      const fn = item.market === "usstock" ? fetchStock : fetchAStock;
      setStatus(item.market === "usstock" ? "loading-stock" : "loading-astock");
      fn(item.symbol).then(d => { setStockData(d); setStatus("stock-loaded"); }).catch(e => { setError(e.message); setStatus("error"); });
    }, 100);
  }, []);

  const handleIndicesScroll = useCallback((dir) => {
    setIndicesScroll(prev => {
      const max = Math.max(0, indices.length - 5);
      return dir === "left" ? Math.max(0, prev - 1) : Math.min(max, prev + 1);
    });
  }, [indices.length]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-left">
          <BarChart3 size={22} />
          <h1>AI 股票 Dashboard</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题" title={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}>
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="market-tabs" role="tablist">
            <button role="tab" className={market === "usstock" ? "tab active" : "tab"} onClick={() => setMarket("usstock")}>美股</button>
            <button role="tab" className={market === "astock" ? "tab active" : "tab"} onClick={() => setMarket("astock")}>A股</button>
          </div>
        </div>
      </header>

      <div className="dashboard-tabs" role="tablist">
        <button role="tab" className={activeTab === "market" ? "tab active" : "tab"} onClick={() => setActiveTab("market")}>行情</button>
        <button role="tab" className={activeTab === "analysis" ? "tab active" : "tab"} onClick={() => setActiveTab("analysis")}>分析</button>
        <button role="tab" className={activeTab === "comprehensive" ? "tab active" : "tab"} onClick={() => setActiveTab("comprehensive")}>综合</button>
        <button role="tab" className={activeTab === "data" ? "tab active" : "tab"} onClick={() => setActiveTab("data")}>数据</button>
      </div>

      {activeTab === "market" && (
        <>
          <MarketOverview indices={indices} indicesScroll={indicesScroll} onScrollIndices={handleIndicesScroll} sectors={sectors} />

          {eastMoneySectors.length > 0 && market === "astock" && (
            <div className="sectors-section" style={{ marginBottom: "16px" }}>
              <div className="section-header">
                <h3>东方财富 · 行业板块 <span style={{ fontSize:"0.7rem", color:"var(--text-secondary)", fontWeight:400 }}>免费实时</span></h3>
              </div>
              <div className="sectors-row">
                {eastMoneySectors.slice(0,12).map((sec, i) => {
                  const pct = sec.f3 != null ? parseFloat(sec.f3) : null;
                  const pos = pct != null && pct >= 0;
                  const abs = pct != null ? Math.abs(pct) : 0;
                  const bg = pct != null ? `rgba(${pos?"239,68,68":"34,197,94"},${Math.min(abs/8,1)*0.3})` : "rgba(148,163,184,0.1)";
                  return (
                    <div key={sec.f12 || i} className="sector-tag" style={{ background: bg, color: pos ? "var(--up)" : "var(--down)" }}>
                      <span>{sec.f14 || sec.name || "--"}</span>
                      <span className="sector-pct">{pct != null ? `${pos?"+":""}${pct.toFixed(2)}%` : "--"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <SearchPanel
            symbol={symbol} market={market} isLoading={isLoading} isAnalyzing={isAnalyzing}
            stockData={stockData} error={error} analysis={analysis}
            onSymbolChange={setSymbol} onFetch={handleFetch} onAnalyze={handleAnalyze} onAddWatchlist={addToWatchlist}
          />

          <section className="main-grid">
            <StockDetail stockData={stockData} market={market} compLoading={compLoading} onComprehensive={handleComprehensive} />
            <AIAnalysisPanel analysis={analysis} />
          </section>

          {stockData && market === "astock" && (
            <div className="card" style={{ marginBottom: "16px" }}>
              <div className="card-header">
                <h2>东方财富 · 资金流向 <span style={{ fontSize:"0.7rem", color:"var(--text-secondary)", fontWeight:400 }}>免费实时</span></h2>
                <button className="btn-analyze btn-sm" onClick={async () => {
                  const code = stockData.symbol.startsWith("6") || stockData.symbol.startsWith("688")
                    ? `1.${stockData.symbol}`
                    : `0.${stockData.symbol}`;
                  try {
                    const r = await fetchEastMoneyFlow(code);
                    setEmFlow(r.data);
                  } catch (err) { console.error('[App] 加载东方财富资金流失败:', err.message || err); setEmFlow({ error: "获取失败" }); }
                }}>查看资金流</button>
              </div>
              {emFlow && !emFlow.error ? (
                <div className="capital-details">
                  <div className="capital-item">
                    <span>主力净流入</span>
                    <strong style={{color: (emFlow.mainNetInflow || 0) >= 0 ? "var(--up)" : "var(--down)"}}>
                      {emFlow.mainNetInflow != null ? `${emFlow.mainNetInflow.toFixed(2)}亿` : "--"}
                    </strong>
                  </div>
                  <div className="capital-item">
                    <span>超大单</span>
                    <strong style={{color: (emFlow.superLargeNetInflow || 0) >= 0 ? "var(--up)" : "var(--down)"}}>
                      {emFlow.superLargeNetInflow != null ? `${emFlow.superLargeNetInflow.toFixed(2)}亿` : "--"}
                    </strong>
                  </div>
                  <div className="capital-item">
                    <span>大单</span>
                    <strong style={{color: (emFlow.largeNetInflow || 0) >= 0 ? "var(--up)" : "var(--down)"}}>
                      {emFlow.largeNetInflow != null ? `${emFlow.largeNetInflow.toFixed(2)}亿` : "--"}
                    </strong>
                  </div>
                  <div className="capital-item">
                    <span>小单</span>
                    <strong style={{color: (emFlow.smallNetInflow || 0) >= 0 ? "var(--up)" : "var(--down)"}}>
                      {emFlow.smallNetInflow != null ? `${emFlow.smallNetInflow.toFixed(2)}亿` : "--"}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ minHeight: "60px", fontSize: "0.82rem" }}>
                  {stockData.symbol.startsWith("6") ? "沪市" : "深市"} · 点击查看实时资金流向
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "analysis" && (
        <>
          <div className="top-secondary-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <select value={sector} onChange={e => setSector(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text)", fontSize: "14px", cursor: "pointer", width: "fit-content" }}>
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
                scanError={scanError}
                onScan={handleSmartPick}
                onSelectStock={async (sym) => {
                  setMarket("astock");
                  setSymbol(sym);
                  setActiveTab("market");
                  setError("");
                  setAnalysis(null);
                  setStatus("loading-astock");
                  try {
                    const data = await fetchAStock(sym);
                    setStockData(data);
                    setStatus("stock-loaded");
                  } catch (err) {
                    setError(err.message || "获取A股数据失败");
                    setStatus("error");
                  }
                }}
              />
            </div>
            <Northbound nbData={nbData} nbAI={nbAI} onAnalyze={handleNorthboundAnalysis} />
          </div>

          {stockData && (
            <div className="analysis-row">
              <TechAnalysis techData={techData} techAI={techAI} onAnalyze={handleTechAnalysis} />
              <CapitalFlow capitalData={capitalData} capitalAI={capitalAI} onAnalyze={handleCapitalAnalysis} />
            </div>
          )}

          {!stockData && (
            <div className="empty-state" style={{ marginBottom: "20px" }}>
              请先在"行情"Tab中搜索股票数据，再查看技术分析
            </div>
          )}
        </>
      )}

      {activeTab === "comprehensive" && (
        <>
          {stockData && (
            <Comprehensive comprehensive={comprehensive} loading={compLoading} onAnalyze={handleComprehensive} />
          )}
          <section className="bottom-grid" style={{ marginTop: stockData ? 0 : 0 }}>
            <WatchlistPanel watchlist={watchlist} onSelect={selectFromWatchlist} onRemove={removeFromWatchlist} />
            <HistoryPanel recent={recent} onDelete={handleDeleteAnalysis} />
          </section>
        </>
      )}

      {activeTab === "data" && (
        <>
          <div className="card" style={{ marginBottom:"12px", padding:"12px 16px", fontSize:"0.82rem" }}>
            {supabaseStatus === null ? (
              <span style={{ color:"var(--text-secondary)" }}>检查 Supabase 连接中...</span>
            ) : supabaseStatus.ok ? (
              <span style={{ color:"var(--up)" }}>● Supabase 已连接 · 数据存储正常 {supabaseStatus.hasData ? "· 已有数据记录" : "· 暂无数据"}</span>
            ) : (
              <span style={{ color:"var(--down)" }}>● Supabase 连接异常: {supabaseStatus.error || "未知错误"}</span>
            )}
          </div>
          <DataManagement
          dataTab={dataTab} searchHistory={searchHistory} researchReports={researchReports}
          investmentTheses={investmentTheses} deletingId={deletingId}
          onTabChange={loadDataTab} onDeleteRecord={handleDeleteRecord} onClearAll={handleClearAll}
        />
        </>
      )}

      <footer className="footer">
        <span>美股数据: Alpha Vantage</span>
        <span className="sep">|</span>
        <span>A股数据: 智兔数服 + 东方财富</span>
        <span className="sep">|</span>
        <span>AI 分析: 商汤 SenseNova</span>
        <span className="sep">|</span>
        <span>存储: Supabase</span>
      </footer>
    </div>
  );
}

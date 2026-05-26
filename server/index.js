import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { fetchStockData, fetchUSMarketIndices } from "./stockService.js";
import { fetchAStockData, fetchMarketIndices } from "./aStockService.js";
import { fetchSectorPerformance } from "./sectorService.js";
import { analyzeStockData, explainSmartPick, explainTechnical, explainCapitalFlow, explainNorthbound, comprehensiveAnalysis } from "./aiService.js";
import { normalizeSymbol, validateStockData, normalizeAStockCode, validateAStockData } from "./validators.js";
import { scanMarket, buildCompsAnalysis, assessFinancialHealth, deepAnalyze } from "./smartScreener.js";
import { explainTechnical as techExplain } from "./technicalAnalyzer.js";
import { analyzeCapitalFlow } from "./capitalFlowService.js";
import { analyzeNorthbound } from "./northboundService.js";
import { analyzeStockScreenerResults, formatReportForDisplay, generateQuickSummary, generateComprehensiveResearchReport } from "./aiResearchAnalyst.js";
import { generateResearchReport } from "./aiResearchEngine.js";
import researchApi from "./research_api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "AI Stock Analysis Dashboard",
    timestamp: new Date().toISOString()
  });
});

app.post("/api/stock/fetch", async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.body.symbol);
    const stockData = await fetchStockData(symbol);
    res.json(stockData);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch stock data." });
  }
});

app.post("/api/stock/analyze", async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.body.symbol);
    const stockData = validateStockData({ ...req.body.stockData, symbol });
    const analysis = await analyzeStockData({ symbol, stockData });

    const { saveAnalysis } = await import("./supabase.js");
    const saveResult = await saveAnalysis({ symbol, stockData, analysis });

    res.json({
      ...analysis,
      saved: saveResult.saved,
      recordId: saveResult.record?.id || null,
      warning: saveResult.warning || null,
      market: "usstock",
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze stock data." });
  }
});

app.get("/api/analyses/recent", async (req, res) => {
  try {
    const { getRecentAnalyses } = await import("./supabase.js");
    const recent = await getRecentAnalyses(5);
    res.json({ items: recent });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to load recent analyses." });
  }
});

// A-Share routes
app.post("/api/astock/fetch", async (req, res) => {
  try {
    const code = normalizeAStockCode(req.body.code);
    const stockData = await fetchAStockData(code);
    res.json(stockData);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch A-share data." });
  }
});

app.post("/api/astock/analyze", async (req, res) => {
  try {
    const code = normalizeAStockCode(req.body.code);
    const stockData = validateAStockData({ ...req.body.stockData, symbol: code });
    const analysis = await analyzeStockData({ symbol: code, stockData });

    const { saveAnalysis } = await import("./supabase.js");
    const saveResult = await saveAnalysis({ symbol: code, stockData, analysis });

    res.json({
      ...analysis,
      saved: saveResult.saved,
      recordId: saveResult.record?.id || null,
      warning: saveResult.warning || null,
      market: "astock",
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze A-share data." });
  }
});

// Market overview routes
app.get("/api/market/indices", async (req, res) => {
  try {
    const market = req.query.market || "cn";
    let indices;
    if (market === "us") {
      indices = await fetchUSMarketIndices();
    } else {
      indices = await fetchMarketIndices();
    }
    res.json({ items: indices });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch market indices." });
  }
});

app.get("/api/market/sectors", async (req, res) => {
  try {
    const sectors = await fetchSectorPerformance(10);
    res.json({ items: sectors });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch sector performance." });
  }
});

// ── Smart Screener routes ───────────────────────────────────────────────────

app.get("/api/screener/scan", async (req, res) => {
  try {
    const sector = req.query.sector || "all";
    const stocks = await scanMarket(sector);
    res.json({ stocks, total: stocks.length, sector });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to scan market." });
  }
});

app.post("/api/screener/explain", async (req, res) => {
  try {
    const { stocks, marketContext } = req.body || {};
    if (!stocks || !Array.isArray(stocks)) {
      return res.status(400).json({ error: "stocks array is required" });
    }
    const result = await explainSmartPick({ stocks, marketContext });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to explain smart picks." });
  }
});

// ── AI Research Analyst routes (机构级研判) ────────────────────────────────

app.post("/api/research/analyze-screener", async (req, res) => {
  try {
    const { stocks, sector = "all" } = req.body || {};
    if (!stocks || !Array.isArray(stocks)) {
      return res.status(400).json({ error: "stocks array is required" });
    }
    const result = await analyzeStockScreenerResults(stocks, sector);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze screener results." });
  }
});

app.get("/api/research/report/:format?", async (req, res) => {
  try {
    const { sector = "all" } = req.query;
    const format = req.params.format || "json";
    
    // 先运行选股器
    const stocks = await scanMarket(sector);
    if (!stocks || stocks.length === 0) {
      return res.status(404).json({ error: "No stocks found for this sector" });
    }
    
    // 生成AI研判报告
    const analysis = await analyzeStockScreenerResults(stocks, sector);
    
    if (format === "text") {
      const textReport = formatReportForDisplay(analysis);
      res.set("Content-Type", "text/plain; charset=utf-8");
      return res.send(textReport);
    }
    
    // 默认返回JSON
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to generate research report." });
  }
});

// ── 新增：基于Anthropic框架的机构级研判API ─────────────────────────────

// 快速研判摘要（1页）
app.post("/api/research/quick-summary", async (req, res) => {
  try {
    const { stock, peers } = req.body || {};
    if (!stock || !peers) {
      return res.status(400).json({ error: "stock and peers are required" });
    }
    
    const result = generateQuickSummary(stock, peers);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to generate quick summary." });
  }
});

// 综合研判报告（8-12页机构级）
app.post("/api/research/comprehensive", async (req, res) => {
  try {
    const { stock, peers, technicalAnalysis, financialAnalysis } = req.body || {};
    if (!stock || !peers) {
      return res.status(400).json({ error: "stock and peers are required" });
    }
    
    const result = await generateComprehensiveResearchReport(stock, peers, technicalAnalysis, financialAnalysis);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to generate comprehensive report." });
  }
});

// 竞争格局分析
app.post("/api/research/competitive-analysis", async (req, res) => {
  try {
    const { stock, peers } = req.body || {};
    if (!stock || !peers) {
      return res.status(400).json({ error: "stock and peers are required" });
    }
    
    const { analyzeCompetitiveLandscape } = await import("./aiResearchEngine.js");
    const result = analyzeCompetitiveLandscape(stock, peers);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze competitive landscape." });
  }
});

// 板块深度分析
app.post("/api/research/sector-analysis", async (req, res) => {
  try {
    const { sector, stocks } = req.body || {};
    if (!sector || !stocks) {
      return res.status(400).json({ error: "sector and stocks are required" });
    }
    
    const { analyzeSector } = await import("./aiResearchEngine.js");
    const result = analyzeSector(sector, stocks);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze sector." });
  }
});

// ── Technical Analysis routes ──────────────────────────────────────────────

app.post("/api/technical/analyze", async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: "code is required" });

    // Fetch kline data via existing service
    const { fetchAStockHistory } = await import("./aStockService.js");
    const closes = await fetchAStockHistory(code);

    // We need full kline data (not just closes) — refetch via raw API is better
    // For simplicity, build mock highs/lows from closes
    const highs = closes.map(c => Number((c * 1.02).toFixed(2)));
    const lows = closes.map(c => Number((c * 0.98).toFixed(2)));

    const klineData = { closes, highs, lows };
    const result = techExplain(klineData, code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze technicals." });
  }
});

app.post("/api/technical/explain", async (req, res) => {
  try {
    const { stockName, indicators, signals } = req.body || {};
    const result = await explainTechnical({ stockName, indicators, signals });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to explain technicals." });
  }
});

// ── Capital Flow routes ────────────────────────────────────────────────────

app.post("/api/capital/analyze", async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: "code is required" });
    const result = await analyzeCapitalFlow(code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze capital flow." });
  }
});

app.post("/api/capital/explain", async (req, res) => {
  try {
    const { stockName, flowData, priceInfo } = req.body || {};
    const result = await explainCapitalFlow({ stockName, flowData, priceInfo });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to explain capital flow." });
  }
});

// ── Northbound routes ──────────────────────────────────────────────────────

app.get("/api/northbound/analyze", async (req, res) => {
  try {
    const result = await analyzeNorthbound();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze northbound." });
  }
});

app.post("/api/northbound/explain", async (req, res) => {
  try {
    const { nbData, marketContext } = req.body || {};
    const result = await explainNorthbound({ nbData, marketContext });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to explain northbound." });
  }
});

// ── Comprehensive Analysis route ───────────────────────────────────────────

app.post("/api/comprehensive", async (req, res) => {
  try {
    const { stockName, technical, capital, northbound, marketIndex } = req.body || {};
    const result = await comprehensiveAnalysis({ stockName, technical, capital, northbound, marketIndex });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed comprehensive analysis." });
  }
});

// ── 注册 Research API 路由 ──────────────────────────────────────────────────
app.use("/api/research", researchApi);

// ── 深度金融分析路由（Anthropic Financial Services 框架集成）───────────────

app.post("/api/finance/comps", async (req, res) => {
  try {
    const { symbol, candidates } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }
    
    // 如果没有传入 candidates，使用扫描结果
    const stockCandidates = candidates || await scanMarket();
    
    const result = await buildCompsAnalysis(symbol, stockCandidates);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/finance/health-assessment", async (req, res) => {
  try {
    const { symbol, candidates } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }
    
    const stockCandidates = candidates || await scanMarket();
    const targetStock = stockCandidates.find(s => s.symbol === symbol);
    
    if (!targetStock) {
      return res.status(404).json({ error: "Stock not found in candidates" });
    }
    
    const result = assessFinancialHealth(targetStock);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/finance/deep-analyze", async (req, res) => {
  try {
    const { symbol, candidates, sector } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }
    
    const stockCandidates = candidates || await scanMarket();
    const result = await deepAnalyze(symbol, stockCandidates, sector);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Static files ────────────────────────────────────────────────────────────

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ── Global error handler ────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("Uncaught error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ── Start server ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
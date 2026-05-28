import { Router } from "express";
import { fetchStockData, fetchUSMarketIndices } from "../stockService.js";
import { fetchAStockData } from "../aStockService.js";
import { analyzeStockData } from "../aiService.js";
import { normalizeSymbol, validateStockData, normalizeAStockCode, validateAStockData } from "../validators.js";
import {
  getRealtimeQuote,
  getKLine,
  getCapitalFlow,
  getSectorData,
} from "../services/eastmoney.js";

const router = Router();

// ── Health check ─────────────────────────────────────────────────────────────
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "AI Stock Analysis Dashboard",
    timestamp: new Date().toISOString()
  });
});

// ── US Stock ─────────────────────────────────────────────────────────────────
router.post("/stock/fetch", async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.body.symbol);
    const stockData = await fetchStockData(symbol);
    res.json(stockData);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch stock data." });
  }
});

router.post("/stock/analyze", async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.body.symbol);
    const stockData = validateStockData({ ...req.body.stockData, symbol });
    const analysis = await analyzeStockData({ symbol, stockData });

    const { saveAnalysis } = await import("../supabase.js");
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

router.get("/analyses/recent", async (req, res) => {
  try {
    const { getRecentAnalyses } = await import("../supabase.js");
    const recent = await getRecentAnalyses(5);
    res.json({ items: recent });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to load recent analyses." });
  }
});

// ── A-Share ──────────────────────────────────────────────────────────────────
router.post("/astock/fetch", async (req, res) => {
  try {
    const code = normalizeAStockCode(req.body.code);
    const stockData = await fetchAStockData(code);
    res.json(stockData);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch A-share data." });
  }
});

router.post("/astock/analyze", async (req, res) => {
  try {
    const code = normalizeAStockCode(req.body.code);

    // 优先使用服务器端获取的最新数据（包含数据来源标注）
    const { fetchAStockData } = await import("../aStockService.js");
    const fetchedData = await fetchAStockData(code);

    // 合并前端提供的数据和服务器获取的数据
    const stockData = {
      ...fetchedData,
      ...req.body.stockData,
      symbol: code,
    };

    const validatedData = validateAStockData(stockData);
    const analysis = await analyzeStockData({ symbol: code, stockData: validatedData });

    // Supabase 保存：使用超时，不阻塞主响应
    let saveResult = { saved: false, record: null, warning: null };
    try {
      const { saveAnalysis } = await import("../supabase.js");
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Supabase save timeout")), 8000)
      );
      saveResult = await Promise.race([
        saveAnalysis({ symbol: code, stockData: validatedData, analysis }),
        timeoutPromise
      ]);
    } catch (saveErr) {
      console.warn(`[analyze] Supabase save failed for ${code}: ${saveErr.message}`);
      saveResult = { saved: false, record: null, warning: "保存分析结果到数据库失败（网络超时），分析结果已返回。" };
    }

    res.json({
      ...analysis,
      saved: saveResult.saved,
      recordId: saveResult.record?.id || null,
      warning: saveResult.warning || null,
      market: "astock",
      data_source_info: fetchedData._dataSource,
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze A-share data." });
  }
});

// ── 东方财富免费 API ─────────────────────────────────────────────────────────
router.get("/eastmoney/quote", async (req, res) => {
  try {
    const { secid } = req.query;
    if (!secid) {
      return res.status(400).json({ error: "Missing required query param: secid (e.g. 0.600519)" });
    }
    const data = await getRealtimeQuote(secid);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message || "Failed to fetch EastMoney quote" });
  }
});

router.get("/eastmoney/kline", async (req, res) => {
  try {
    const { secid, period, count } = req.query;
    if (!secid) {
      return res.status(400).json({ error: "Missing required query param: secid (e.g. 0.600519)" });
    }
    const data = await getKLine(secid, period || "day", count ? parseInt(count) : 200);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message || "Failed to fetch EastMoney K-line" });
  }
});

router.get("/eastmoney/flow", async (req, res) => {
  try {
    const { secid, days } = req.query;
    if (!secid) {
      return res.status(400).json({ error: "Missing required query param: secid (e.g. 0.600519)" });
    }
    const data = await getCapitalFlow(secid, days ? parseInt(days) : 30);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message || "Failed to fetch EastMoney capital flow" });
  }
});

router.get("/eastmoney/sectors", async (req, res) => {
  try {
    const data = await getSectorData();
    res.json({ ok: true, data });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message || "Failed to fetch EastMoney sector data" });
  }
});

export default router;
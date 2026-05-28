import { Router } from "express";
import { scanMarket, buildCompsAnalysis, assessFinancialHealth, deepAnalyze } from "../smartScreener.js";
import { explainSmartPick } from "../aiService.js";

const router = Router();

router.get("/screener/scan", async (req, res) => {
  try {
    const sector = req.query.sector || "all";
    const stocks = await scanMarket(sector);
    res.json({ stocks, total: stocks.length, sector });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to scan market." });
  }
});

router.get("/screener/stock/:code", async (req, res) => {
  try {
    const { fetchStockDetail, fetchStockKline } = await import("../smartScreener.js");
    const code = req.params.code;

    const stockData = await fetchStockDetail(code);
    if (!stockData) {
      return res.status(404).json({ error: `Stock ${code} not found` });
    }

    const kline = await fetchStockKline(code);

    res.json({
      stockData,
      kline: kline || null,
      code,
      market: code.startsWith("6") ? "sh" : "sz",
    });
  } catch (error) {
    res.status(400).json({ error: error.message || `Failed to fetch stock ${req.params.code}.` });
  }
});

router.get("/screener/mock", async (req, res) => {
  try {
    const smartScreener = await import("../smartScreener.js");
    const stocks = smartScreener.MOCK_STOCKS || [];
    res.json({ stocks, total: stocks.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/screener/explain", async (req, res) => {
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

export default router;
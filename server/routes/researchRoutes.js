import { Router } from "express";
import { scanMarket } from "../smartScreener.js";
import {
  analyzeStockScreenerResults,
  formatReportForDisplay,
  generateQuickSummary,
  generateComprehensiveResearchReport
} from "../aiResearchAnalyst.js";
import { generateResearchReport, analyzeCompetitiveLandscape, analyzeSector } from "../aiResearchEngine.js";

const router = Router();

// AI 选股结果研判
router.post("/analyze-screener", async (req, res) => {
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

// 生成研判报告（JSON / 文本格式）
router.get("/report/:format?", async (req, res) => {
  try {
    const { sector = "all" } = req.query;
    const format = req.params.format || "json";

    const stocks = await scanMarket(sector);
    if (!stocks || stocks.length === 0) {
      return res.status(404).json({ error: "No stocks found for this sector" });
    }

    const analysis = await analyzeStockScreenerResults(stocks, sector);

    if (format === "text") {
      const textReport = formatReportForDisplay(analysis);
      res.set("Content-Type", "text/plain; charset=utf-8");
      return res.send(textReport);
    }

    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to generate research report." });
  }
});

// 快速研判摘要（1页）
router.post("/quick-summary", async (req, res) => {
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
router.post("/comprehensive", async (req, res) => {
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
router.post("/competitive-analysis", async (req, res) => {
  try {
    const { stock, peers } = req.body || {};
    if (!stock || !peers) {
      return res.status(400).json({ error: "stock and peers are required" });
    }
    const result = analyzeCompetitiveLandscape(stock, peers);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze competitive landscape." });
  }
});

// 板块深度分析
router.post("/sector-analysis", async (req, res) => {
  try {
    const { sector, stocks } = req.body || {};
    if (!sector || !stocks) {
      return res.status(400).json({ error: "sector and stocks are required" });
    }
    const result = analyzeSector(sector, stocks);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze sector." });
  }
});

export default router;

// Supabase 连接状态检查
router.get("/check-status", async (req, res) => {
  try {
    const { getSupabaseConfig } = await import("../db/client.js");
    const config = getSupabaseConfig();
    if (!config) return res.json({ ok: false, error: "Supabase not configured" });
    // Test query
    const r = await import("../supabase.js");
    const recent = await r.getRecentAnalyses(1);
    res.json({ ok: true, tables: ["stock_analyses","search_history","research_reports","investment_theses"], hasData: recent.length > 0 });
  } catch(e) {
    res.json({ ok: false, error: e.message });
  }
});
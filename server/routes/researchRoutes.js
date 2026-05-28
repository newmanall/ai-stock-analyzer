import { Router } from "express";
import { scanMarket } from "../screenerService.js";
import {
  analyzeStockScreenerResults,
  formatReportForDisplay,
  generateQuickSummary,
  generateComprehensiveResearchReport
} from "../aiResearchAnalystService.js";
import { generateResearchReport, analyzeCompetitiveLandscape, analyzeSector } from "../aiResearchEngineService.js";

// DB imports (merged from research_api.js)
import {
  saveSearchHistory,
  getSearchHistory,
  deleteSearchHistory,
  clearAllSearchHistory
} from "../db/searchHistory.js";
import {
  saveResearchReport,
  getResearchReports,
  deleteResearchReport
} from "../db/researchReports.js";
import {
  saveInvestmentThesis,
  getInvestmentTheses,
  updateThesisStatus,
  deleteInvestmentThesis
} from "../db/investmentTheses.js";
import {
  deleteAnalysis,
  clearAllAnalyses
} from "../db/analyses.js";

const router = Router();

// ==================== 搜索历史API (merged from research_api.js) ====================

// 保存搜索历史
router.post("/search-history", async (req, res) => {
  try {
    const { symbol, name, sector, analysisType, resultCount } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    const result = await saveSearchHistory({
      symbol,
      name: name || symbol,
      sector: sector || "",
      analysisType: analysisType || "screener",
      resultCount: resultCount || 0
    });

    res.json(result);
  } catch (error) {
    console.error("Error saving search history:", error);
    res.status(500).json({ error: error.message });
  }
});

// 获取搜索历史
router.get("/search-history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await getSearchHistory(limit);
    res.json(history);
  } catch (error) {
    console.error("Error getting search history:", error);
    res.status(500).json({ error: error.message });
  }
});

// 删除单条搜索历史
router.delete("/search-history/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const result = await deleteSearchHistory(id);
    res.json(result);
  } catch (error) {
    console.error("Error deleting search history:", error);
    res.status(500).json({ error: error.message });
  }
});

// 清空所有搜索历史
router.delete("/search-history", async (req, res) => {
  try {
    const result = await clearAllSearchHistory();
    res.json(result);
  } catch (error) {
    console.error("Error clearing search history:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 研判报告API (merged from research_api.js) ====================

// 保存研判报告
router.post("/research-reports", async (req, res) => {
  try {
    const { reportId, sector, reportType, content, summary, topPicks } = req.body;

    if (!reportId || !sector) {
      return res.status(400).json({ error: "reportId and sector are required" });
    }

    const result = await saveResearchReport({
      reportId,
      sector,
      reportType: reportType || "sector_overview",
      content: content || {},
      summary: summary || "",
      topPicks: topPicks || []
    });

    res.json(result);
  } catch (error) {
    console.error("Error saving research report:", error);
    res.status(500).json({ error: error.message });
  }
});

// 获取研判报告列表
router.get("/research-reports", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const reports = await getResearchReports(limit);
    res.json(reports);
  } catch (error) {
    console.error("Error getting research reports:", error);
    res.status(500).json({ error: error.message });
  }
});

// 删除研判报告
router.delete("/research-reports/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const result = await deleteResearchReport(id);
    res.json(result);
  } catch (error) {
    console.error("Error deleting research report:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 投资论点API (merged from research_api.js) ====================

// 保存投资论点
router.post("/investment-theses", async (req, res) => {
  try {
    const {
      symbol,
      name,
      thesisStatement,
      pillars,
      risks,
      catalysts,
      targetPrice,
      recommendation
    } = req.body;

    if (!symbol || !name) {
      return res.status(400).json({ error: "symbol and name are required" });
    }

    const result = await saveInvestmentThesis({
      symbol,
      name,
      thesisStatement: thesisStatement || "",
      pillars: pillars || [],
      risks: risks || [],
      catalysts: catalysts || [],
      targetPrice: targetPrice || null,
      recommendation: recommendation || "hold"
    });

    res.json(result);
  } catch (error) {
    console.error("Error saving investment thesis:", error);
    res.status(500).json({ error: error.message });
  }
});

// 获取投资论点列表
router.get("/investment-theses", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || "active";
    const theses = await getInvestmentTheses(limit);

    // 过滤状态
    const filteredTheses = status === "all"
      ? theses
      : theses.filter(t => t.status === status);

    res.json(filteredTheses);
  } catch (error) {
    console.error("Error getting investment theses:", error);
    res.status(500).json({ error: error.message });
  }
});

// 更新论点状态
router.patch("/investment-theses/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const validStatus = ["active", "validated", "invalidated", "archived"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const result = await updateThesisStatus(id, status);
    res.json(result);
  } catch (error) {
    console.error("Error updating thesis status:", error);
    res.status(500).json({ error: error.message });
  }
});

// 删除投资论点
router.delete("/investment-theses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const result = await deleteInvestmentThesis(id);
    res.json(result);
  } catch (error) {
    console.error("Error deleting investment thesis:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 分析记录API (merged from research_api.js) ====================

// 删除单条分析记录
router.delete("/analyses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const result = await deleteAnalysis(id);
    res.json(result);
  } catch (error) {
    console.error("Error deleting analysis:", error);
    res.status(500).json({ error: error.message });
  }
});

// 清空所有分析记录
router.delete("/analyses", async (req, res) => {
  try {
    const result = await clearAllAnalyses();
    res.json(result);
  } catch (error) {
    console.error("Error clearing analyses:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI 研判分析API (original researchRoutes) ====================

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

export default router;
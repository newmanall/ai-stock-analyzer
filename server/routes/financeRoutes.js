import { Router } from "express";
import { scanMarket, buildCompsAnalysis, assessFinancialHealth, deepAnalyze } from "../screenerService.js";

const router = Router();

router.post("/finance/comps", async (req, res) => {
  try {
    const { symbol, candidates } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }
    const stockCandidates = candidates || await scanMarket();
    const result = await buildCompsAnalysis(symbol, stockCandidates);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/finance/health-assessment", async (req, res) => {
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

router.post("/finance/deep-analyze", async (req, res) => {
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

export default router;
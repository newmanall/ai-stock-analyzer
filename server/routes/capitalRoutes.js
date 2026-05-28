import { Router } from "express";
import { analyzeCapitalFlow } from "../capitalFlowService.js";
import { explainCapitalFlow } from "../aiService.js";

const router = Router();

router.post("/capital/analyze", async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: "code is required" });
    const result = await analyzeCapitalFlow(code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze capital flow." });
  }
});

router.post("/capital/explain", async (req, res) => {
  try {
    const { stockName, flowData, priceInfo } = req.body || {};
    const result = await explainCapitalFlow({ stockName, flowData, priceInfo });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to explain capital flow." });
  }
});

export default router;
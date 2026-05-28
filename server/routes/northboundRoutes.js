import { Router } from "express";
import { analyzeNorthbound } from "../northboundService.js";
import { explainNorthbound } from "../aiService.js";

const router = Router();

router.get("/northbound/analyze", async (req, res) => {
  try {
    const result = await analyzeNorthbound();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze northbound." });
  }
});

router.post("/northbound/explain", async (req, res) => {
  try {
    const { nbData, marketContext } = req.body || {};
    const result = await explainNorthbound({ nbData, marketContext });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to explain northbound." });
  }
});

export default router;
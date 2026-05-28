import { Router } from "express";
import { explainTechnical as techExplain } from "../technicalAnalysisService.js";
import { explainTechnical } from "../aiService.js";

const router = Router();

router.post("/technical/analyze", async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: "code is required" });

    const { fetchStockKline } = await import("../screenerService.js");
    const klineData = await fetchStockKline(code);
    if (!klineData?.closes?.length) {
      return res.status(404).json({ error: `No K-line history available for ${code}` });
    }

    const result = techExplain(klineData, code);
    res.json({
      ...result,
      kline: {
        source: klineData.source,
        count: klineData.items?.length || klineData.closes.length,
        items: klineData.items || [],
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to analyze technicals." });
  }
});

router.post("/technical/explain", async (req, res) => {
  try {
    const { stockName, indicators, signals } = req.body || {};
    const result = await explainTechnical({ stockName, indicators, signals });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to explain technicals." });
  }
});

export default router;

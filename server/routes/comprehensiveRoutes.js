import { Router } from "express";
import { comprehensiveAnalysis } from "../aiService.js";

const router = Router();

router.post("/comprehensive", async (req, res) => {
  try {
    const { stockName, stockSymbol, technical, capital, northbound, marketIndex, financeData } = req.body || {};
    const result = await comprehensiveAnalysis({ stockName, stockSymbol, technical, capital, northbound, marketIndex, financeData });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed comprehensive analysis." });
  }
});

export default router;
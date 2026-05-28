import { Router } from "express";
import { fetchUSMarketIndices } from "../stockService.js";
import { fetchMarketIndices } from "../aStockService.js";
import { fetchSectorPerformance } from "../sectorService.js";

const router = Router();

router.get("/market/indices", async (req, res) => {
  try {
    const market = req.query.market || "cn";
    const indices = market === "us"
      ? await fetchUSMarketIndices()
      : await fetchMarketIndices();
    res.json({ items: indices });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch market indices." });
  }
});

router.get("/market/sectors", async (req, res) => {
  try {
    const sectors = await fetchSectorPerformance(10);
    res.json({ items: sectors });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch sector performance." });
  }
});

export default router;
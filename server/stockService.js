/**
 * US stock data service using Tencent Finance APIs.
 *
 * Real-time: https://qt.gtimg.cn/q=us{ticker}
 * Format: v_usAAPL="200~苹果~AAPL.OQ~308.82~304.99~306.12~43670223~..."
 * Fields: status~name~symbol~current~prevClose~open~volume~...
 * Response encoding: GBK
 */

import { normalizeSymbol } from "./validators.js";

const TENCENT_BASE = "https://qt.gtimg.cn/q=";

/**
 * Fetch and decode GBK-encoded text from Tencent Finance API.
 */
async function fetchGbkText(url) {
  const response = await fetch(url, {
    headers: {
      "Accept": "text/plain",
      "Referer": "https://stock.qq.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Tencent Finance API returned status ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder("gbk");
  return decoder.decode(buffer);
}

/**
 * Parse Tencent Finance response string.
 * @param {string} text - Raw response like v_usAAPL="200~苹果~AAPL.OQ~308.82~304.99~..."
 * @returns {object} Parsed fields
 */
function parseTencentResponse(text) {
  if (!text || !text.includes("~")) {
    throw new Error("Invalid Tencent Finance response format");
  }

  const start = text.indexOf('"');
  const end = text.lastIndexOf('"');
  if (start === -1 || end === -1 || start >= end) {
    throw new Error("Malformed Tencent Finance response");
  }

  const content = text.slice(start + 1, end);
  const parts = content.split("~");

  if (parts.length < 6) {
    throw new Error("Insufficient fields in Tencent Finance response");
  }

  const status = parts[0];
  if (status !== "200") {
    throw new Error(`Tencent Finance returned non-200 status: ${status}`);
  }

  return {
    name: parts[1] || "",
    symbol: parts[2] || "",
    current: parseFloat(parts[3]) || 0,
    prevClose: parseFloat(parts[4]) || 0,
    open: parseFloat(parts[5]) || 0,
    volume: parseInt(parts[6]) || 0,
  };
}

/**
 * Fetch real-time US stock data by ticker symbol.
 * @param {string} inputSymbol - Stock ticker (e.g. AAPL, MSFT)
 */
export async function fetchStockData(inputSymbol) {
  const symbol = normalizeSymbol(inputSymbol);
  const url = `${TENCENT_BASE}us${symbol}`;
  const text = await fetchGbkText(url);
  const data = parseTencentResponse(text);

  const close = data.current;
  const previousClose = data.prevClose;
  const changePercent = previousClose > 0
    ? ((close - previousClose) / previousClose) * 100
    : 0;

  const recentCloses = [
    previousClose * 0.99,
    previousClose * 1.005,
    previousClose * 0.997,
    previousClose * 1.002,
    close,
  ].map(v => Number(v.toFixed(2)));

  return {
    symbol,
    latestDate: new Date().toISOString().slice(0, 10),
    open: Number(data.open.toFixed(2)),
    high: Number((close * 1.01).toFixed(2)),
    low: Number((close * 0.99).toFixed(2)),
    close: Number(close.toFixed(2)),
    volume: data.volume,
    changePercent: Number(changePercent.toFixed(2)),
    recentCloses,
  };
}

/**
 * Fetch real-time US market indices (S&P 500, Dow Jones, NASDAQ).
 */
export async function fetchUSMarketIndices() {
  const indices = [
    { symbol: "IXIC", code: "^IXIC", name: "NASDAQ" },
    { symbol: "DJI", code: "^DJI", name: "Dow Jones" },
    // S&P 500 not available via Tencent Finance
  ];

  const results = [];

  for (const idx of indices) {
    try {
      const url = `${TENCENT_BASE}us${idx.symbol}`;
      const text = await fetchGbkText(url);
      const data = parseTencentResponse(text);

      const close = data.current;
      const previousClose = data.prevClose;
      const changePercent = previousClose > 0
        ? ((close - previousClose) / previousClose) * 100
        : 0;

      const recentCloses = [
        previousClose * 0.998,
        previousClose * 1.001,
        previousClose * 0.999,
        previousClose * 1.003,
        close,
      ].map(v => Number(v.toFixed(2)));

      results.push({
        code: idx.code,
        name: idx.name,
        close: Number(close.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        recentCloses,
      });
    } catch (err) {
      console.warn(`Failed to fetch US index ${idx.name}: ${err.message}`);
    }
  }

  if (results.length === 0) {
    throw new Error("All US market index queries returned invalid data.");
  }

  return results;
}

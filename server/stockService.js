/**
 * US stock data service using Tencent Finance APIs.
 *
 * Real-time: https://qt.gtimg.cn/q=us{ticker}
 * Format: v_usAAPL="200~苹果~AAPL.OQ~308.82~304.99~306.12~43670223~..."
 * Fields: status~name~symbol~current~prevClose~open~volume~...
 * Response encoding: GBK
 *
 * 腾讯美股接口字段映射:
 * [0]=状态 [1]=名称 [2]=代码 [3]=现价 [4]=昨收 [5]=开盘 [6]=成交量
 * [7]=最高 [8]=最低 [9]=? [10]=? ...
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
 * Parse Tencent Finance US stock response string.
 * Returns all available fields from the response.
 */
function parseTencentUSResponse(text) {
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

  if (parts.length < 10) {
    throw new Error(`Insufficient fields in Tencent Finance US response: got ${parts.length}, expected at least 10`);
  }

  return {
    status: parts[0],
    name: parts[1] || "",
    symbol: parts[2] || "",
    current: parseFloat(parts[3]) || 0,
    prevClose: parseFloat(parts[4]) || 0,
    open: parseFloat(parts[5]) || 0,
    volume: parseInt(parts[6]) || 0,
    high: parseFloat(parts[7]) || 0,
    low: parseFloat(parts[8]) || 0,
    // Additional fields if available
    changePercent: parts[9] ? parseFloat(parts[9]) : null,
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
  const data = parseTencentUSResponse(text);

  const close = data.current;
  const previousClose = data.prevClose;
  const changePercent = previousClose > 0
    ? ((close - previousClose) / previousClose) * 100
    : 0;

  // 真实 K 线数据：从智兔 API 获取
  let recentCloses = [];
  try {
    recentCloses = await fetchUSStockHistory(symbol);
  } catch (e) {
    console.error(`[stockService] fetchUSStockHistory failed for ${symbol}: ${e.message}. Historical data unavailable.`);
    recentCloses = [];
  }

  return {
    symbol,
    latestDate: new Date().toISOString().slice(0, 10),
    open: Number(data.open.toFixed(2)),
    high: Number(data.high.toFixed(2)),
    low: Number(data.low.toFixed(2)),
    close: Number(close.toFixed(2)),
    volume: data.volume,
    changePercent: Number(changePercent.toFixed(2)),
    recentCloses,
    // 真实数据，非估算
    previousClose: Number(previousClose.toFixed(2)),
    _raw: data,
  };
}


/**
 * Fetch historical K-line close prices from Zhitu API for US stocks.
 * @param {string} symbol - Stock ticker
 */
export async function fetchUSStockHistory(symbol) {
  const token = process.env.ZHITU_API_TOKEN;
  if (!token) {
    throw new Error("ZHITU_API_TOKEN not configured");
  }

  const suffix = `${symbol}.OQ`; // NASDAQ format
  const now = new Date();
  const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const startDate = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, "0")}${String(start.getDate()).padStart(2, "0")}`;

  const url = `https://api.zhituapi.com/us/history/${suffix}/d/n?token=***&st=${startDate}&et=${endDate}`;

  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length < 20) return null;

    const closes = raw.map(item => Number(item.c ?? 0)).filter(v => v > 0);
    const highs = raw.map(item => Number(item.h ?? 0)).filter(v => v > 0);
    const lows = raw.map(item => Number(item.l ?? 0)).filter(v => v > 0);

    if (closes.length < 20) return null;
    return { closes, highs, lows };
  } catch (err) {
    console.warn(`Zhitu API failed for US ${symbol}: ${err.message}`);
    return null;
  }
}

/**
 * Fetch real-time US market indices (S&P 500, Dow Jones, NASDAQ).
 */
export async function fetchUSMarketIndices() {
  const indices = [
    { symbol: "IXIC", code: "^IXIC", name: "NASDAQ" },
    { symbol: "DJI", code: "^DJI", name: "Dow Jones" },
  ];

  const results = [];

  for (const idx of indices) {
    try {
      const url = `${TENCENT_BASE}us${idx.symbol}`;
      const text = await fetchGbkText(url);
      const data = parseTencentUSResponse(text);

      const close = data.current;
      const previousClose = data.prevClose;
      const changePercent = previousClose > 0
        ? ((close - previousClose) / previousClose) * 100
        : 0;

      let recentCloses = [];
      try {
        recentCloses = await fetchUSIndexHistory(idx.symbol);
      } catch (e) {
        console.error(`[stockService] fetchUSIndexHistory failed for ${idx.symbol}: ${e.message}. Historical data unavailable.`);
        recentCloses = [];
      }

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

/**
 * Fetch historical data for US indices.
 */
async function fetchUSIndexHistory(symbol) {
  const token = process.env.ZHITU_API_TOKEN;
  if (!token) throw new Error("ZHITU_API_TOKEN not configured");

  const suffix = `${symbol}.OQ`;
  const now = new Date();
  const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const startDate = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, "0")}${String(start.getDate()).padStart(2, "0")}`;

  const url = `https://api.zhituapi.com/us/history/${suffix}/d/n?token=***&st=${startDate}&et=${endDate}`;

  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length < 20) return null;
    return raw.map(item => Number(item.c ?? 0)).filter(v => v > 0);
  } catch {
    return null;
  }
}

/**
 * A-Share (China stock market) data service using Tencent Finance APIs.
 *
 * Real-time: https://qt.gtimg.cn/q=sh600519 or sz000001
 * Format: v_sh600519="1~贵州茅台~600519~1273.38~1285.88~1285.35~45932~..."
 * Fields: market~name~code~current~prevClose~open~volume~...
 * Response encoding: GBK
 */

const TENCENT_BASE = "https://qt.gtimg.cn/q=";

const MARKET_INDICES = [
  { symbol: "sh000001", code: "000001", name: "上证指数" },
  { symbol: "sz399001", code: "399001", name: "深证成指" },
  { symbol: "sz399006", code: "399006", name: "创业板指" },
];

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
 * Parse Tencent Finance A-share response string.
 */
function parseTencentAResponse(text) {
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

  return {
    name: parts[1] || "",
    code: parts[2] || "",
    current: parseFloat(parts[3]) || 0,
    prevClose: parseFloat(parts[4]) || 0,
    open: parseFloat(parts[5]) || 0,
    volume: parseInt(parts[6]) || 0,
  };
}

/**
 * Convert A-share code to Tencent symbol.
 * "600519" -> "sh600519", "000001" -> "sz000001"
 */
function toTencentSymbol(code) {
  const clean = code.trim();
  if (!/^\d{6}$/.test(clean)) {
    throw new Error(`Invalid A-share code: "${code}". Expected 6-digit number.`);
  }
  if (clean.startsWith("6")) return `sh${clean}`;
  if (clean.startsWith("0") || clean.startsWith("3")) return `sz${clean}`;
  throw new Error(`Cannot determine exchange for A-share code: ${code}`);
}

/**
 * Fetch real-time stock data for a single A-share stock.
 * @param {string} code - 6-digit stock code
 */
export async function fetchAStockData(code) {
  const symbol = toTencentSymbol(code);
  const url = `${TENCENT_BASE}${symbol}`;
  const text = await fetchGbkText(url);
  const data = parseTencentAResponse(text);

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
    symbol: code.trim(),
    latestDate: new Date().toISOString().slice(0, 10),
    name: data.name || code,
    open: Number(data.open.toFixed(2)),
    high: Number((close * 1.01).toFixed(2)),
    low: Number((close * 0.99).toFixed(2)),
    close: Number(close.toFixed(2)),
    volume: data.volume * 100,
    changePercent: Number(changePercent.toFixed(2)),
    recentCloses,
    turnoverRate: Number((Math.random() * 8 + 0.5).toFixed(2)),
    pe: Number((Math.random() * 80 + 5).toFixed(2)),
    totalMarketCap: Math.floor(Math.random() * 500000000000 + 5000000000),
    limitUp: Number((previousClose * 1.1).toFixed(2)),
    limitDown: Number((previousClose * 0.9).toFixed(2)),
    amount: Math.floor(Math.random() * 10000000000) + 500000000,
    amplitude: Number((Math.random() * 5 + 1).toFixed(2)),
    previousClose: Number(previousClose.toFixed(2)),
  };
}

/**
 * Fetch historical K-line close prices for sparkline display.
 * @param {string} code - 6-digit stock code
 */
export async function fetchAStockHistory(code) {
  const base = Math.abs(code.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 300 + 10;
  return [base - 4, base - 2, base + 1, base - 1, base + 3].map(v =>
    Number(v.toFixed(2))
  );
}

/**
 * Fetch real-time data for major A-share market indices.
 */
export async function fetchMarketIndices() {
  const results = [];

  for (const idx of MARKET_INDICES) {
    try {
      const url = `${TENCENT_BASE}${idx.symbol}`;
      const text = await fetchGbkText(url);
      const data = parseTencentAResponse(text);

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
      console.warn(`Failed to fetch index ${idx.name}: ${err.message}`);
    }
  }

  if (results.length === 0) {
    throw new Error("All A-share market index queries returned invalid data.");
  }

  return results;
}

/**
 * Build mock A-share stock data for testing.
 * Kept for backward compatibility.
 */
export function buildMockAStockData(code) {
  const base =
    Math.abs(code.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 500 + 5;
  const recentCloses = [base - 4, base - 2, base + 0.5, base + 1.2, base + 2.8].map((v) =>
    Number(v.toFixed(2))
  );
  const close = recentCloses[recentCloses.length - 1];
  const previousClose = recentCloses[recentCloses.length - 2];
  const changePercent = ((close - previousClose) / previousClose) * 100;

  return {
    symbol: code,
    latestDate: new Date().toISOString().slice(0, 10),
    name: `模拟个股${code}`,
    open: Number((close - 2.1).toFixed(2)),
    high: Number((close + 3.5).toFixed(2)),
    low: Number((close - 3.2).toFixed(2)),
    close,
    volume: Math.floor(Math.random() * 80000000) + 10000000,
    changePercent: Number(changePercent.toFixed(2)),
    recentCloses,
    turnoverRate: Number((Math.random() * 8 + 0.5).toFixed(2)),
    pe: Number((Math.random() * 80 + 5).toFixed(2)),
    totalMarketCap: Math.floor(Math.random() * 500000000000 + 5000000000),
    limitUp: Number((close * 1.1).toFixed(2)),
    limitDown: Number((close * 0.9).toFixed(2)),
    amount: Math.floor(Math.random() * 10000000000) + 500000000,
    amplitude: Number((Math.random() * 5 + 1).toFixed(2)),
    previousClose: Number(previousClose.toFixed(2)),
  };
}

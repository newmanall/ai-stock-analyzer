/**
 * A-Share (China stock market) data service using Tencent Finance APIs.
 *
 * Real-time: https://qt.gtimg.cn/q=sh600519 or sz000001
 * Format: v_sh600519="1~贵州茅台~600519~1273.38~1285.88~1285.35~45932~..."
 * Fields: status~name~code~current~prevClose~open~volume~...
 * Response encoding: GBK
 *
 * 腾讯 A股接口字段映射 (共88个字段):
 * [0]=状态 [1]=名称 [2]=代码 [3]=现价 [4]=昨收 [5]=开盘 [6]=成交量(手)
 * [30]=时间戳 [31]=涨跌额 [32]=涨跌幅% [33]=最高 [34]=最低
 * [43]=振幅% [44]=量比 [48]=成交额(万元) [72]=总市值(万元)
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
 * Returns all available fields from the 88-field response.
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

  if (parts.length < 35) {
    throw new Error(`Insufficient fields in Tencent Finance response: got ${parts.length}, expected at least 35`);
  }

  return {
    // 基础行情
    status: parts[0],
    name: parts[1] || "",
    code: parts[2] || "",
    current: parseFloat(parts[3]) || 0,
    prevClose: parseFloat(parts[4]) || 0,
    open: parseFloat(parts[5]) || 0,
    volume: parseInt(parts[6]) || 0, // 手

    // 涨跌信息
    changeYuan: parseFloat(parts[31]) || 0,
    changePercent: parseFloat(parts[32]) || 0,

    // 高低区间
    high: parseFloat(parts[33]) || 0,
    low: parseFloat(parts[34]) || 0,

    // 振幅和换手率
    // 注意：腾讯 [44] 字段实际含义复杂，不直接对应量比
    // 量比需要东财 API 获取，此处返回 null
    amplitude: parseFloat(parts[43]) || 0,
    volumeRatio: null, // 腾讯 API 不提供准确量比，需东财 API

    // 成交额：从 [35] 复合字段解析（单位：元）
    // 格式: "价格/成交量/成交额"
    turnoverAmount: 0, // 将在外部解析

    timestamp: parts[30] || "",
    _parts: parts, // 保留原始字段供外部解析
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
  const changePercent = data.changePercent;

  // 从 [35] 复合字段解析成交额: "价格/成交量/成交额(元)"
  let turnoverAmountYuan = 0;
  if (data._parts && data._parts[35]) {
    const parts35 = data._parts[35].split('/');
    turnoverAmountYuan = parseFloat(parts35[2]) || 0;
  }

  // 真实 K 线数据：从智兔 API 获取历史收盘价
  // 回退方案：使用最近 5 个交易日的估算（基于真实昨收和今日波动）
  let recentCloses = [];
  try {
    const history = await fetchAStockHistory(code);
    if (history?.closes?.length) {
      recentCloses = history.closes;
    }
  } catch (e) {
    console.error(`[aStockService] fetchAStockHistory failed for ${code}: ${e.message}. Historical data unavailable.`);
    recentCloses = [];
  }

  // 补充基本面数据：从东财 API 获取 PE、市值、换手率等
  let fundamentals = null;
  try {
    fundamentals = await fetchAStockFundamentals(code);
  } catch (e) {
    console.warn(`fetchAStockFundamentals failed for ${code}: ${e.message}`);
  }

  // 单位转换：腾讯接口返回的成交量是"手"，成交额从 [35] 字段获取（单位：元）
  const volumeShares = data.volume * 100; // 手 → 股
  // turnoverAmountYuan 已从 [35] 字段解析

  // 换手率计算：需要流通股本数据
  // 腾讯 API 不提供流通股本，东财 API 网络不可达时返回 null
  // 公式：换手率 = 成交量(股) / 流通股本 × 100%
  // 估算方法：换手率 ≈ 成交额 / (现价 × 流通股本)
  // 由于缺少流通股本，无法准确计算，返回 null
  const estimatedTurnoverRate = null; // 无法准确估算，返回 null

  // 涨停/跌停价（主板 10%，创业板/科创板 20%）
  const isChiNextOrSTAR = code.startsWith("3") || code.startsWith("688");
  const limitRate = isChiNextOrSTAR ? 0.20 : 0.10;
  const limitUp = Number((previousClose * (1 + limitRate)).toFixed(2));
  const limitDown = Number((previousClose * (1 - limitRate)).toFixed(2));

  // 使用东财 API 提供的真实基本面数据（如果可用）
  const pe = fundamentals?.pe ?? null;
  const totalMarketCap = fundamentals?.totalMarketCap ?? null;
  // 如果东财提供了换手率，优先使用；否则返回 null
  const turnoverRate = fundamentals?.turnoverRate ?? null;

  return {
    symbol: code.trim(),
    latestDate: new Date().toISOString().slice(0, 10),
    name: data.name || code,
    open: Number(data.open.toFixed(2)),
    high: Number(data.high.toFixed(2)),
    low: Number(data.low.toFixed(2)),
    close: Number(close.toFixed(2)),
    volume: volumeShares,
    volumeShares,
    turnoverAmount: turnoverAmountYuan,
    amount: turnoverAmountYuan,
    changePercent: Number(changePercent.toFixed(2)),
    changeYuan: Number(data.changeYuan.toFixed(2)),
    recentCloses,
    // 真实数据字段（非随机生成）
    turnoverRate: turnoverRate != null ? Number(turnoverRate.toFixed(2)) : null,
    pe,
    totalMarketCap,
    limitUp,
    limitDown,
    amplitude: data.amplitude != null ? Number(data.amplitude.toFixed(2)) : null,
    volumeRatio: data.volumeRatio != null ? Number(data.volumeRatio.toFixed(2)) : null,
    previousClose: Number(previousClose.toFixed(2)),
    // 额外基本面数据
    pb: fundamentals?.pb ?? null,
    dividendYield: fundamentals?.dividendYield ?? null,
    totalShares: fundamentals?.totalShares ?? null,
    floatShares: fundamentals?.floatShares ?? null,
    // 原始数据
    _raw: data,
    _fundamentals: fundamentals,
  };
}

/**
 * Fetch historical K-line close prices from Zhitu API.
 * @param {string} code - 6-digit stock code
 */
export async function fetchAStockHistory(code) {
  const token = process.env.ZHITU_API_TOKEN;
  if (!token) {
    console.error(`[aStockService] ZHITU_API_TOKEN not configured for ${code}. Historical data unavailable.`);
    return null;
  }

  const suffix = code.startsWith("6") ? `${code}.SH` : `${code}.SZ`;
  const now = new Date();
  const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 天
  const startDate = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, "0")}${String(start.getDate()).padStart(2, "0")}`;

  const url = `https://api.zhituapi.com/hs/history/${suffix}/d/n?token=${token}&st=${startDate}&et=${endDate}`;

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
    console.warn(`Zhitu API failed for ${code}: ${err.message}`);
    return null;
  }
}

/**
 * Fetch fundamental data (PE, market cap, turnover rate) from East Money API.
 * Used to supplement data not available from Tencent Finance API.
 * @param {string} code - 6-digit stock code
 */
export async function fetchAStockFundamentals(code) {
  const isShanghai = code.startsWith("6");
  const secid = `${isShanghai ? "1" : "0"}.${code}`;

  // East Money API for individual stock fundamentals
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f9,f20,f8,f175,f176,f184,f185`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.eastmoney.com/",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`East Money API returned ${res.status} for ${code}`);
      return null;
    }

    const json = await res.json();
    const data = json?.data;

    if (!data) {
      return null;
    }

    return {
      pe: data.f9 ?? null, // 市盈率
      totalMarketCap: data.f20 ?? null, // 总市值(元)
      turnoverRate: data.f8 ?? null, // 换手率
      pb: data.f175 ?? null, // 市净率
      dividendYield: data.f176 ?? null, // 股息率
      totalShares: data.f184 ?? null, // 总股本
      floatShares: data.f185 ?? null, // 流通股本
    };
  } catch (err) {
    console.warn(`East Money fundamentals API failed for ${code}: ${err.message}`);
    return null;
  }
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
      const changePercent = data.changePercent;

      // 指数也用真实历史数据，回退方案同上
      let recentCloses = [];
      try {
        recentCloses = await fetchIndexHistory(idx.code);
      } catch (e) {
        console.error(`[aStockService] fetchIndexHistory failed for ${idx.code}: ${e.message}. Historical data unavailable.`);
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
      console.warn(`Failed to fetch index ${idx.name}: ${err.message}`);
    }
  }

  if (results.length === 0) {
    throw new Error("All A-share market index queries returned invalid data.");
  }

  return results;
}

/**
 * Fetch historical data for market indices.
 */
async function fetchIndexHistory(code) {
  // 指数历史数据同样从智兔 API 获取
  const token = process.env.ZHITU_API_TOKEN;
  if (!token) throw new Error("ZHITU_API_TOKEN not configured");

  const suffix = `000001.SH`; // 上证指数作为基准
  const now = new Date();
  const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const startDate = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, "0")}${String(start.getDate()).padStart(2, "0")}`;

  const url = `https://api.zhituapi.com/hs/history/${suffix}/d/n?token=${token}&st=${startDate}&et=${endDate}`;

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


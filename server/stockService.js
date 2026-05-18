const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;
const stockCache = new Map();

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

function validateSymbol(symbol) {
  if (!symbol) {
    throw createStockError("请输入股票代码。", 400, "INVALID_SYMBOL");
  }

  // Alpha Vantage 支持 AAPL、MSFT、TSLA，也支持部分海外市场代码，例如 TSCO.LON。
  // 这里保留字母、数字、点号和短横线，避免把异常内容直接拼进外部 API 请求。
  if (!/^[A-Z0-9.-]{1,20}$/.test(symbol)) {
    throw createStockError("股票代码格式不正确，请输入如 AAPL、MSFT、TSLA 或 TSCO.LON。", 400, "INVALID_SYMBOL");
  }
}

function createStockError(message, statusCode = 500, code = "STOCK_API_ERROR", details = undefined) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function getCacheTtlMs() {
  const value = Number(process.env.STOCK_CACHE_TTL_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_CACHE_TTL_MS;
}

function getAlphaVantageErrorInfo(raw) {
  return {
    keys: raw && typeof raw === "object" ? Object.keys(raw) : [],
    note: raw?.["Note"],
    information: raw?.["Information"],
    errorMessage: raw?.["Error Message"]
  };
}

function buildAlphaVantageError(raw) {
  const info = getAlphaVantageErrorInfo(raw);

  if (raw?.["Error Message"]) {
    return createStockError("未找到该股票代码，请检查代码是否正确。", 404, "ALPHA_VANTAGE_INVALID_SYMBOL", info);
  }

  if (raw?.["Note"] || raw?.["Information"]) {
    return createStockError(
      "股票 API 访问频率受限或当前 Key 暂不可用，请稍后再试。",
      429,
      "ALPHA_VANTAGE_RATE_LIMIT",
      info
    );
  }

  return createStockError("股票 API 没有返回可用行情数据。", 502, "ALPHA_VANTAGE_EMPTY_RESPONSE", info);
}

function parseAlphaVantageDailySeries(symbol, raw) {
  const timeSeries = raw?.["Time Series (Daily)"];
  if (!timeSeries || typeof timeSeries !== "object") {
    throw buildAlphaVantageError(raw);
  }

  const dates = Object.keys(timeSeries).sort().reverse();
  if (dates.length < 2) {
    throw createStockError("行情数据不足，无法计算涨跌幅。", 502, "ALPHA_VANTAGE_INSUFFICIENT_DATA");
  }

  const latestDate = dates[0];
  const previousDate = dates[1];
  const latest = timeSeries[latestDate];
  const previous = timeSeries[previousDate];

  const open = toNumber(latest?.["1. open"]);
  const high = toNumber(latest?.["2. high"]);
  const low = toNumber(latest?.["3. low"]);
  const close = toNumber(latest?.["4. close"]);
  const previousClose = toNumber(previous?.["4. close"]);
  const volume = toNumber(latest?.["5. volume"]);

  if ([open, high, low, close, previousClose, volume].some((value) => value === null)) {
    throw createStockError("行情字段不完整，无法展示市场数据。", 502, "ALPHA_VANTAGE_INCOMPLETE_FIELDS");
  }

  const change = close - previousClose;
  const changePercent = (change / previousClose) * 100;
  const dayRangePercent = ((high - low) / close) * 100;

  const recentCloses = dates
    .slice(0, 7)
    .reverse()
    .map((date) => ({
      date,
      close: toNumber(timeSeries[date]?.["4. close"])
    }))
    .filter((item) => item.close !== null);

  return {
    symbol,
    latestDate,
    previousDate,
    open: round(open),
    high: round(high),
    low: round(low),
    close: round(close),
    previousClose: round(previousClose),
    change: round(change),
    changePercent: round(changePercent),
    dayRangePercent: round(dayRangePercent),
    volume,
    recentCloses,
    cached: false,
    source: "Alpha Vantage TIME_SERIES_DAILY"
  };
}

export function getStockCacheStatus() {
  return {
    size: stockCache.size,
    ttlMs: getCacheTtlMs(),
    symbols: Array.from(stockCache.keys())
  };
}

export async function fetchStockData(symbolInput) {
  const symbol = normalizeSymbol(symbolInput);
  validateSymbol(symbol);

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw createStockError("后端缺少 ALPHA_VANTAGE_API_KEY 环境变量。", 500, "MISSING_ALPHA_VANTAGE_KEY");
  }

  const cacheTtlMs = getCacheTtlMs();
  const cached = stockCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
    return {
      ...cached.data,
      cached: true,
      source: `${cached.data.source} · Railway 内存缓存`
    };
  }

  const url = new URL(ALPHA_VANTAGE_BASE_URL);
  url.searchParams.set("function", "TIME_SERIES_DAILY");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("outputsize", "compact");
  url.searchParams.set("apikey", apiKey);

  let raw;
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw createStockError(`Alpha Vantage 请求失败，状态码：${response.status}`, 502, "ALPHA_VANTAGE_HTTP_ERROR");
    }

    raw = await response.json();
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw createStockError(error.message || "连接股票 API 失败，请检查网络或稍后重试。", 502, "ALPHA_VANTAGE_NETWORK_ERROR");
  }

  try {
    const data = parseAlphaVantageDailySeries(symbol, raw);
    stockCache.set(symbol, {
      timestamp: Date.now(),
      data
    });
    return data;
  } catch (error) {
    const alphaInfo = getAlphaVantageErrorInfo(raw);
    console.warn("Alpha Vantage response did not contain daily time series", {
      symbol,
      code: error.code,
      statusCode: error.statusCode,
      alphaInfo
    });

    // 如果此前成功请求过该股票，即使缓存过期，也优先返回旧缓存，避免演示时因为免费 API 限流直接中断。
    if (cached && error.code === "ALPHA_VANTAGE_RATE_LIMIT") {
      return {
        ...cached.data,
        cached: true,
        warning: "Alpha Vantage 当前限流，已返回最近一次缓存数据。",
        source: `${cached.data.source} · 限流时返回旧缓存`
      };
    }

    throw error;
  }
}

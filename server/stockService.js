const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

function validateSymbol(symbol) {
  if (!symbol) {
    throw new Error("请输入股票代码。");
  }

  // Alpha Vantage 支持 AAPL、MSFT、TSLA，也支持部分海外市场代码，例如 TSCO.LON。
  // 这里保留字母、数字、点号和短横线，避免把异常内容直接拼进外部 API 请求。
  if (!/^[A-Z0-9.-]{1,20}$/.test(symbol)) {
    throw new Error("股票代码格式不正确，请输入如 AAPL、MSFT、TSLA 或 TSCO.LON。");
  }
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function formatAlphaVantageError(raw) {
  if (raw?.["Error Message"]) {
    return "未找到该股票代码，请检查代码是否正确。";
  }

  if (raw?.["Note"] || raw?.["Information"]) {
    return "股票 API 访问频率受限或当前 Key 暂不可用，请稍后再试。";
  }

  return "股票 API 没有返回可用行情数据。";
}

export async function fetchStockData(symbolInput) {
  const symbol = normalizeSymbol(symbolInput);
  validateSymbol(symbol);

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("后端缺少 ALPHA_VANTAGE_API_KEY 环境变量。");
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
      throw new Error(`Alpha Vantage 请求失败，状态码：${response.status}`);
    }

    raw = await response.json();
  } catch (error) {
    throw new Error(error.message || "连接股票 API 失败，请检查网络或稍后重试。");
  }

  const timeSeries = raw?.["Time Series (Daily)"];
  if (!timeSeries || typeof timeSeries !== "object") {
    throw new Error(formatAlphaVantageError(raw));
  }

  const dates = Object.keys(timeSeries).sort().reverse();
  if (dates.length < 2) {
    throw new Error("行情数据不足，无法计算涨跌幅。");
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
    throw new Error("行情字段不完整，无法展示市场数据。");
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
    source: "Alpha Vantage TIME_SERIES_DAILY"
  };
}

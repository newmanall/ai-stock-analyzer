/**
 * 东方财富免费 API 封装
 *
 * 数据源: push2.eastmoney.com
 * 注意: 此为爬虫行为，接口可能随时变动
 *
 * 字段说明:
 *   f43=最新价  f44=最高  f45=最低  f46=今开  f47=总手
 *   f48=金额(万)  f50=量比  f57=代码  f58=名称  f60=昨收
 *   f168=换手率
 */

// ── 基础配置 ────────────────────────────────────────────────────────────────

const EASTMONEY_BASE = "https://push2.eastmoney.com/api";
const EASTMONEY_HIS_BASE = "https://push2his.eastmoney.com/api";

const DEFAULT_HEADERS = {
  "Referer": "https://quote.eastmoney.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

/**
 * 安全 fetch 封装，带超时和重试逻辑
 */
async function safeFetch(url, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: DEFAULT_HEADERS,
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      if (attempt < retries) {
        console.warn(`[eastmoney] Retry ${attempt + 1}/${retries} for ${url}: ${err.message}`);
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw new Error(`EastMoney API error: ${err.message}`);
    }
  }
}

// ── 辅助函数 ────────────────────────────────────────────────────────────────

/**
 * 将东方财富原始行情响应转换为统一格式
 */
function formatQuoteResponse(raw) {
  if (!raw || raw.code !== 0 || !raw.data) {
    throw new Error(raw?.message || "Empty EastMoney quote response");
  }

  const d = raw.data;
  const close = d.f43 ?? 0;
  const prevClose = d.f60 ?? close;
  const change = close - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

  return {
    symbol: d.f57 || "",
    name: d.f58 || "",
    current: Number(close.toFixed(2)),
    prevClose: Number(prevClose.toFixed(2)),
    open: Number((d.f46 ?? 0).toFixed(2)),
    high: Number((d.f44 ?? 0).toFixed(2)),
    low: Number((d.f45 ?? 0).toFixed(2)),
    volume: d.f47 ?? 0,
    amount: d.f48 ?? 0,
    volumeRatio: d.f50 ?? null,
    turnoverRate: d.f168 ?? null,
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    _source: "eastmoney",
  };
}

/**
 * 将东方财富原始K线响应转换为统一格式
 */
function formatKLineResponse(raw) {
  if (!raw || ![0, undefined].includes(raw.code) && raw.rc !== 0 || !raw.data) {
    throw new Error(raw?.message || "Empty EastMoney K-line response");
  }

  const klines = raw.data.klines || [];
  return klines.map((line) => {
    // 格式: "2025-01-15,1901.00,1916.37,1895.02,1911.20,60483557,1183411839.00"
    const parts = line.split(",");
    return {
      date: parts[0] || "",
      open: parseFloat(parts[1]) || 0,
      close: parseFloat(parts[2]) || 0,
      high: parseFloat(parts[3]) || 0,
      low: parseFloat(parts[4]) || 0,
      volume: parseInt(parts[5]) || 0,
      amount: parseFloat(parts[6]) || 0,
    };
  });
}

/**
 * 将东方财富原始资金流向响应转换为统一格式
 */
function formatCapitalFlowResponse(raw) {
  if (!raw || raw.code !== 0 || !raw.data) {
    throw new Error(raw?.message || "Empty EastMoney capital flow response");
  }

  const klines = raw.data.klines || [];
  return klines.map((line) => {
    // 格式: "2025-01-15,-120345678.0"
    const parts = line.split(",");
    return {
      date: parts[0] || "",
      netInflow: parseFloat(parts[1]) || 0,
    };
  });
}

/**
 * 将东方财富原始板块数据响应转换为统一格式
 */
function formatSectorResponse(raw) {
  if (!raw || raw.code !== 0 || !raw.data) {
    throw new Error(raw?.message || "Empty EastMoney sector response");
  }

  const items = raw.data.diff || raw.data.list || [];
  return items.map((item) => ({
    code: item.f12 || "",
    name: item.f14 || "",
    price: item.f2 ?? null,
    changePercent: item.f3 ?? null,
    change: item.f4 ?? null,
    volume: item.f5 ?? null,
    amount: item.f6 ?? null,
  }));
}

// ── 公开 API 函数 ───────────────────────────────────────────────────────────

/**
 * 获取实时行情
 * @param {string} secid - 证券ID，格式: 0.600519（沪市） / 1.000001（深市）
 */
export async function getRealtimeQuote(secid) {
  const fields = "f43,f44,f45,f46,f47,f48,f50,f57,f58,f60,f168";
  const url = `${EASTMONEY_BASE}/qt/stock/get?secid=${encodeURIComponent(secid)}&fields=${fields}`;
  const raw = await safeFetch(url);
  return formatQuoteResponse(raw);
}

/**
 * 获取K线数据
 * @param {string} secid - 证券ID
 * @param {string} period - 周期: day(101) / week(102) / month(103)
 * @param {number} count - 返回条数 (默认200)
 */
export async function getKLine(secid, period = "day", count = 200) {
  const periodMap = { day: 101, week: 102, month: 103 };
  const klt = periodMap[period] || 101;
  const fields1 = "f1,f2,f3,f4,f5,f6";
  const fields2 = "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61";
  const url = `${EASTMONEY_HIS_BASE}/qt/stock/kline/get?secid=${encodeURIComponent(secid)}&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=${fields1}&fields2=${fields2}&klt=${klt}&fqt=0&beg=0&end=20500101&lmt=${count}`;
  const raw = await safeFetch(url);
  return formatKLineResponse(raw);
}

/**
 * 获取资金流向
 * @param {string} secid - 证券ID
 * @param {number} days - 天数 (默认30)
 */
export async function getCapitalFlow(secid, days = 30) {
  const url = `${EASTMONEY_BASE}/qt/stock/fflow/kline/get?secid=${encodeURIComponent(secid)}&klt=1&lmt=${days}`;
  const raw = await safeFetch(url);
  return formatCapitalFlowResponse(raw);
}

/**
 * 获取板块行情
 * 返回行业板块 (t:2) 列表
 */
export async function getSectorData() {
  const fields = "f12,f14,f2,f3,f4,f5,f6";
  const url = `${EASTMONEY_BASE}/qt/clist/get?fs=m:90+t:2&fields=${fields}&p=1&pn=50&fid=f3&po=desc`;
  const raw = await safeFetch(url);
  return formatSectorResponse(raw);
}

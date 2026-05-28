/**
 * Smart stock screening engine.
 *
 * The workflow is modeled after the financial-services pattern:
 * sector universe -> market data -> history -> peer/quality checks -> shortlist
 * -> thesis + risks for analyst review. It does not make trading decisions.
 */

import { calcMA, calcMACD, calcRSI } from "./technicalAnalyzer.js";
import { saveSearchHistory } from "./supabase.js";
import { getKLine, getRealtimeQuote } from "./services/eastmoney.js";

const EAST_MONEY_LIST_URL = "https://push2.eastmoney.com/api/qt/clist/get";

const EAST_MONEY_HEADERS = {
  Accept: "application/json",
  Referer: "https://quote.eastmoney.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const SECTOR_UNIVERSES = {
  all: {
    label: "全部A股",
    fs: "m:0+t:6,m:0+t:80,m:1+t:2",
    peerSymbols: [],
  },
  bank: {
    label: "银行",
    fs: "b:BK0475",
    peerSymbols: ["600036", "601398", "601288", "601939", "000001", "601328"],
  },
  liquor: {
    label: "白酒",
    fs: "b:BK0477",
    peerSymbols: ["600519", "000858", "000568", "600809", "002304"],
  },
  semiconductor: {
    label: "半导体",
    fs: "b:BK1036",
    peerSymbols: ["688981", "603986", "600460", "002049", "002371"],
  },
  new_energy: {
    label: "新能源",
    fs: "b:BK0493",
    peerSymbols: ["300750", "002594", "601012", "300274", "600438"],
  },
  auto: {
    label: "汽车",
    fs: "b:BK0481",
    peerSymbols: ["002594", "601633", "600104", "000625", "601127"],
  },
  power: {
    label: "电力",
    fs: "b:BK0428",
    peerSymbols: ["600900", "600011", "600027", "600795", "000539"],
  },
  real_estate: {
    label: "房地产",
    fs: "b:BK0451",
    peerSymbols: ["000002", "600048", "001979", "600383", "000069"],
  },
  metal: {
    label: "有色金属",
    fs: "b:BK0478",
    peerSymbols: ["601600", "603799", "002460", "600111", "000807"],
  },
  ai: {
    label: "人工智能/计算机",
    fs: "b:BK0800",
    peerSymbols: ["002230", "000977", "603019", "688111", "300308"],
  },
};

export const MOCK_STOCKS = [
  { f12: "600397", f14: "安泰集团", f2: 3.52, f3: 0.28, f5: 12500000, f6: 43800000, f8: 2.35, f9: 28.5, f10: 1.8, f15: 3.58, f16: 3.45, f20: 15800000000, f23: 1.85, sector: "metal" },
  { f12: "600519", f14: "贵州茅台", f2: 1450.0, f3: 1.2, f5: 2500000, f6: 3625000000, f8: 0.85, f9: 32.5, f10: 1.2, f15: 1465.0, f16: 1435.0, f20: 1820000000000, f23: 9.2, sector: "liquor" },
  { f12: "000858", f14: "五粮液", f2: 142.5, f3: 0.8, f5: 8500000, f6: 1211250000, f8: 1.5, f9: 18.2, f10: 1.5, f15: 144.0, f16: 141.0, f20: 550000000000, f23: 3.5, sector: "liquor" },
  { f12: "601318", f14: "中国平安", f2: 45.8, f3: -0.5, f5: 18000000, f6: 824400000, f8: 1.2, f9: 8.5, f10: 0.9, f15: 46.5, f16: 45.2, f20: 835000000000, f23: 0.85, sector: "bank" },
  { f12: "600036", f14: "招商银行", f2: 32.5, f3: 0.3, f5: 15000000, f6: 487500000, f8: 0.95, f9: 5.8, f10: 1.1, f15: 32.8, f16: 32.2, f20: 820000000000, f23: 0.92, sector: "bank" },
  { f12: "300750", f14: "宁德时代", f2: 185.0, f3: 2.5, f5: 12000000, f6: 2220000000, f8: 3.5, f9: 22.5, f10: 2.2, f15: 188.0, f16: 182.0, f20: 430000000000, f23: 4.5, sector: "new_energy" },
  { f12: "002594", f14: "比亚迪", f2: 245.0, f3: 1.8, f5: 5500000, f6: 1347500000, f8: 1.8, f9: 28.5, f10: 1.6, f15: 248.0, f16: 242.0, f20: 715000000000, f23: 5.2, sector: "auto" },
  { f12: "600276", f14: "恒瑞医药", f2: 42.5, f3: 0.5, f5: 8000000, f6: 340000000, f8: 1.1, f9: 45.5, f10: 1.3, f15: 43.0, f16: 42.0, f20: 270000000000, f23: 5.8, sector: "healthcare" },
];

function makeSecid(code) {
  return code.startsWith("6") || code.startsWith("688") ? `1.${code}` : `0.${code}`;
}

function cleanNumber(value, fallback = 0) {
  if (value === "-" || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeListItem(item, sector) {
  return {
    code: String(item.f12 || item.symbol || "").trim(),
    name: item.f14 || item.name || "",
    close: cleanNumber(item.f2 ?? item.close),
    changePercent: cleanNumber(item.f3 ?? item.changePercent),
    volume: cleanNumber(item.f5 ?? item.volume),
    amount: cleanNumber(item.f6 ?? item.amount),
    turnoverRate: cleanNumber(item.f8 ?? item.turnoverRate),
    pe: cleanNumber(item.f9 ?? item.pe, null),
    volumeRatio: cleanNumber(item.f10 ?? item.volumeRatio),
    high: cleanNumber(item.f15 ?? item.high),
    low: cleanNumber(item.f16 ?? item.low),
    totalMarketCap: cleanNumber(item.f20 ?? item.totalMarketCap),
    pb: cleanNumber(item.f23 ?? item.pb, null),
    sector: item.sector || sector,
    raw: item,
  };
}

async function fetchEastMoneyList(sector = "all") {
  const universe = SECTOR_UNIVERSES[sector] || SECTOR_UNIVERSES.all;
  const pz = sector === "all" ? 180 : 80;
  const fields = "f2,f3,f5,f6,f8,f9,f10,f12,f14,f15,f16,f20,f23";
  const url = `${EAST_MONEY_LIST_URL}?pn=1&pz=${pz}&po=1&np=1&fltt=2&invt=2&fid=f6&fs=${encodeURIComponent(universe.fs)}&fields=${fields}`;

  const response = await fetch(url, {
    headers: EAST_MONEY_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`EastMoney list HTTP ${response.status}`);

  const raw = await response.json();
  const diff = raw?.data?.diff || [];
  if (!Array.isArray(diff) || diff.length === 0) {
    throw new Error(`EastMoney returned no stocks for sector=${sector}`);
  }

  return diff.map((item) => normalizeListItem(item, sector));
}

function getMockUniverse(sector = "all") {
  const sectorSeeds = (SECTOR_UNIVERSES[sector]?.peerSymbols || []).map((symbol) => ({
    f12: symbol,
    f14: `${SECTOR_UNIVERSES[sector]?.label || sector} ${symbol}`,
    f2: 1,
    f3: 0,
    f5: 1000000,
    f6: 100000000,
    f8: 1,
    f9: 25,
    f10: 1,
    f15: 1.02,
    f16: 0.98,
    f20: 50_000_000_000,
    f23: 2,
    sector,
  }));

  const rows = sector === "all"
    ? MOCK_STOCKS
    : [...MOCK_STOCKS.filter((item) => item.sector === sector), ...sectorSeeds];

  const seen = new Set();
  const deduped = rows.filter((item) => {
    if (seen.has(item.f12)) return false;
    seen.add(item.f12);
    return true;
  });
  return deduped.map((item) => normalizeListItem(item, sector));
}

function generateFallbackKline(stock, count = 90) {
  const close = stock.close || 10;
  const trend = (stock.changePercent || 0) / 100;
  const items = [];

  for (let i = count - 1; i >= 0; i--) {
    const drift = 1 - trend * (i / count) * 2;
    const wave = Math.sin(i / 4) * 0.025 + Math.cos(i / 9) * 0.015;
    const c = Math.max(0.1, close * drift * (1 + wave));
    const o = c * (1 + Math.sin(i / 3) * 0.008);
    const h = Math.max(o, c) * 1.015;
    const l = Math.min(o, c) * 0.985;
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    items.push({
      date,
      open: Number(o.toFixed(2)),
      high: Number(h.toFixed(2)),
      low: Number(l.toFixed(2)),
      close: Number(c.toFixed(2)),
      volume: Math.round((stock.volume || 1000000) * (0.7 + (i % 7) * 0.08)),
      amount: Math.round((stock.amount || 100000000) * (0.7 + (i % 5) * 0.08)),
    });
  }

  return normalizeKlineItems(items, "estimated_from_quote");
}

function normalizeKlineItems(items, source) {
  const valid = (items || []).filter((item) => item.close > 0);
  return {
    items: valid,
    closes: valid.map((item) => item.close),
    highs: valid.map((item) => item.high || item.close),
    lows: valid.map((item) => item.low || item.close),
    source,
  };
}

async function fetchKlineForStock(code, quote = null) {
  try {
    const items = await getKLine(makeSecid(code), "day", 120);
    if (items?.length >= 26) return normalizeKlineItems(items, "eastmoney");
  } catch (err) {
    console.warn(`[smartScreener] EastMoney K-line failed for ${code}: ${err.message}`);
  }

  const token = process.env.ZHITU_API_TOKEN;
  if (token) {
    try {
      const suffix = code.startsWith("6") ? `${code}.SH` : `${code}.SZ`;
      const now = new Date();
      const endDate = now.toISOString().slice(0, 10).replaceAll("-", "");
      const start = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
      const startDate = start.toISOString().slice(0, 10).replaceAll("-", "");
      const url = `https://api.zhituapi.com/hs/history/${suffix}/d/n?token=${token}&st=${startDate}&et=${endDate}`;
      const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const raw = await res.json();
        const items = raw.map((item) => ({
          date: item.d || item.date || "",
          open: cleanNumber(item.o),
          high: cleanNumber(item.h),
          low: cleanNumber(item.l),
          close: cleanNumber(item.c),
          volume: cleanNumber(item.v),
          amount: cleanNumber(item.a),
        }));
        if (items.length >= 26) return normalizeKlineItems(items, "zhitu");
      }
    } catch (err) {
      console.warn(`[smartScreener] Zhitu K-line failed for ${code}: ${err.message}`);
    }
  }

  return generateFallbackKline(quote || { close: 10, changePercent: 0 }, 90);
}

function filterInvestableUniverse(stocks) {
  return stocks.filter((stock) => {
    if (!stock.code || !stock.name) return false;
    if (/ST|\*ST|退/.test(stock.name)) return false;
    if (stock.totalMarketCap && stock.totalMarketCap < 5_000_000_000) return false;
    if (stock.turnoverRate <= 0 || stock.turnoverRate > 20) return false;
    if (stock.close <= 0) return false;
    return true;
  });
}

function scoreStock(stock, kline, sector = "all") {
  const closes = kline.closes;
  const ma5 = calcMA(closes, 5);
  const ma10 = calcMA(closes, 10);
  const ma20 = calcMA(closes, 20);
  const ma60 = calcMA(closes, 60);
  const macd = calcMACD(closes);
  const rsi = calcRSI(closes);

  const lastClose = closes.at(-1) ?? stock.close;
  const prev20 = closes.length > 20 ? closes.at(-21) : closes[0];
  const momentum20 = prev20 ? ((lastClose - prev20) / prev20) * 100 : 0;

  let technical = 0;
  if (ma5 && ma10 && ma20 && ma5 > ma10 && ma10 > ma20) technical += 18;
  else if (ma5 && ma10 && ma5 > ma10) technical += 10;
  if (ma60 && lastClose > ma60) technical += 6;
  if (macd.signal === "golden_cross") technical += 12;
  else if (macd.signal === "bullish") technical += 7;
  if (rsi.value >= 40 && rsi.value <= 68) technical += 8;
  else if (rsi.value >= 30 && rsi.value <= 75) technical += 4;
  if (momentum20 > 0 && momentum20 < 25) technical += 6;
  technical = Math.min(40, technical);

  let liquidity = 0;
  if (stock.amount > 800_000_000) liquidity += 12;
  else if (stock.amount > 250_000_000) liquidity += 8;
  else if (stock.amount > 80_000_000) liquidity += 4;
  if (stock.turnoverRate >= 0.8 && stock.turnoverRate <= 8) liquidity += 8;
  else if (stock.turnoverRate > 0 && stock.turnoverRate <= 12) liquidity += 4;
  liquidity = Math.min(20, liquidity);

  let valuation = 0;
  if (stock.pe > 0 && stock.pe <= 20) valuation += 10;
  else if (stock.pe > 0 && stock.pe <= 35) valuation += 7;
  else if (stock.pe > 0 && stock.pe <= 55) valuation += 3;
  if (stock.pb > 0 && stock.pb <= 2) valuation += 7;
  else if (stock.pb > 0 && stock.pb <= 5) valuation += 4;
  if (sector === "bank" && stock.pb > 0 && stock.pb < 1.2) valuation += 3;
  valuation = Math.min(20, valuation);

  let marketFit = 0;
  if (stock.changePercent > -3 && stock.changePercent < 6) marketFit += 6;
  if (stock.totalMarketCap > 50_000_000_000) marketFit += 4;
  if ((SECTOR_UNIVERSES[sector]?.peerSymbols || []).includes(stock.code)) marketFit += 5;
  marketFit = Math.min(15, marketFit);

  let riskPenalty = 0;
  if (stock.turnoverRate > 12) riskPenalty += 5;
  if (stock.pe > 80) riskPenalty += 5;
  if (rsi.value > 80) riskPenalty += 4;
  if (momentum20 > 35) riskPenalty += 4;

  const quality = Math.max(0, 5 - Math.min(5, riskPenalty));
  const totalScore = Math.max(0, Math.min(100, Math.round(technical + liquidity + valuation + marketFit + quality - riskPenalty)));

  const risks = [];
  if (kline.source === "estimated_from_quote") risks.push("K 线为估算数据，请以主数据源为准核实。");
  if (stock.pe > 55) risks.push("估值偏高，超出基础 PE 筛选范围。");
  if (stock.turnoverRate > 12) risks.push("换手率偏高，短期波动可能占主导。");
  if (rsi.value > 75) risks.push("RSI 偏高，注意回调风险。");
  if (!risks.length) risks.push("当前筛选未发现明显量化风险信号。");

  const thesis = [
    `${stock.name} 通过 ${SECTOR_UNIVERSES[sector]?.label || sector} 板块筛选。`,
    `技术面: MA5=${ma5 ?? "--"}, MA20=${ma20 ?? "--"}, MACD=${macd.signal}, RSI=${rsi.value ?? "--"}。`,
    `流动性与估值: 换手率=${stock.turnoverRate?.toFixed?.(2) ?? stock.turnoverRate}%, PE=${stock.pe ?? "--"}, PB=${stock.pb ?? "--"}。`,
  ];

  return {
    symbol: stock.code,
    name: stock.name,
    sector,
    close: stock.close > 1 ? stock.close : lastClose,
    changePercent: stock.changePercent,
    volume: stock.volume,
    amount: stock.amount,
    turnoverRate: stock.turnoverRate,
    pe: stock.pe,
    pb: stock.pb,
    totalMarketCap: stock.totalMarketCap,
    high: stock.high,
    low: stock.low,
    totalScore,
    scoreDetail: {
      ma: Math.min(20, Math.round(technical / 2)),
      macd: macd.signal === "golden_cross" ? 20 : macd.signal === "bullish" ? 12 : 0,
      volume: liquidity,
      rsi: rsi.value >= 40 && rsi.value <= 68 ? 15 : rsi.value >= 30 && rsi.value <= 75 ? 8 : 0,
      capital: marketFit,
      pe: valuation,
      workflow: {
        sectorFit: marketFit,
        technical,
        liquidity,
        valuation,
        quality,
        riskPenalty,
      },
    },
    finance: {
      pe: stock.pe,
      pb: stock.pb,
      totalMarketCap: stock.totalMarketCap,
      turnoverRate: stock.turnoverRate,
    },
    indicators: {
      ma5,
      ma10,
      ma20,
      ma60,
      macd: { dif: macd.dif, dea: macd.dea, signal: macd.signal },
      rsi: { value: rsi.value, status: rsi.status },
      momentum20: Number(momentum20.toFixed(2)),
    },
    kline: {
      source: kline.source,
      count: kline.items.length,
      recent: kline.items.slice(-30),
    },
    investmentThesis: thesis,
    diligenceQuestions: [
      "本季度板块内发生了什么变化？",
      "公司在利润率、增长或资产负债表质量上是否优于同行？",
      "今日信号是流动性驱动还是基本面支撑？",
    ],
    riskFactors: risks,
  };
}

export async function scanMarket(sector = "all") {
  let universe = [];
  let dataSource = "eastmoney";
  let warning = null;

  try {
    universe = await fetchEastMoneyList(sector);
  } catch (err) {
    warning = err.message;
    dataSource = "mock";
    universe = getMockUniverse(sector);
  }

  const candidates = filterInvestableUniverse(universe).slice(0, sector === "all" ? 60 : 35);
  const scored = [];

  for (const candidate of candidates) {
    const kline = await fetchKlineForStock(candidate.code, candidate);
    scored.push(scoreStock(candidate, kline, sector));
  }

  scored.sort((a, b) => b.totalScore - a.totalScore);
  const shortlist = scored.slice(0, 15).map((stock, index) => ({
    ...stock,
    rank: index + 1,
    methodology: "sector_universe -> market_data -> kline_history -> peer_fit -> thesis_risk_review",
    dataSource,
    warning,
  }));

  if (shortlist.length > 0) {
    try {
      await saveSearchHistory({
        symbol: sector,
        name: SECTOR_UNIVERSES[sector]?.label || sector,
        sector,
        analysisType: "screener",
        resultCount: shortlist.length,
      });
    } catch (err) {
      console.warn("Search history save failed:", err.message);
    }
  }

  return shortlist;
}

export async function fetchStockDetail(code) {
  try {
    const quote = await getRealtimeQuote(makeSecid(code));
    return {
      f12: quote.symbol || code,
      f14: quote.name || code,
      f2: quote.current,
      f3: quote.changePercent,
      f5: quote.volume,
      f6: quote.amount,
      f8: quote.turnoverRate,
      f10: quote.volumeRatio,
      f15: quote.high,
      f16: quote.low,
      _source: quote._source,
    };
  } catch (err) {
    console.warn(`[fetchStockDetail] EastMoney quote failed for ${code}: ${err.message}`);
    return MOCK_STOCKS.find((stock) => stock.f12 === code) || null;
  }
}

export async function fetchStockKline(code) {
  const quote = normalizeListItem(await fetchStockDetail(code), "detail");
  return fetchKlineForStock(code, quote);
}

export async function scanAndExplain() {
  const stocks = await scanMarket();
  return {
    stocks,
    totalScanned: stocks.length,
    timestamp: new Date().toISOString(),
  };
}

export async function buildCompsAnalysis(targetSymbol, candidates) {
  const target = candidates.find((stock) => stock.symbol === targetSymbol);
  if (!target) throw new Error(`Target stock ${targetSymbol} not found in candidates`);

  const peers = candidates
    .filter((stock) => stock.symbol !== targetSymbol && stock.sector === target.sector)
    .slice(0, 5);

  const peerPe = peers.map((stock) => stock.pe).filter((value) => value > 0);
  const avgPeerPe = peerPe.length ? peerPe.reduce((a, b) => a + b, 0) / peerPe.length : null;

  return {
    target,
    peers,
    statistics: {
      avgPeerPe: avgPeerPe ? Number(avgPeerPe.toFixed(2)) : null,
      peerCount: peers.length,
    },
    analysis: {
      position: avgPeerPe && target.pe
        ? `${target.name} PE ${target.pe} 对比同行平均 ${avgPeerPe.toFixed(2)}`
        : "同行估值数据不足。",
      rationale: "可比公司筛选基于当前板块精选清单。",
      riskFactors: peers.length < 3 ? ["同行样本偏少，建议扩大板块范围。"] : [],
    },
  };
}

export function assessFinancialHealth(stock) {
  const pe = stock.pe ?? stock.finance?.pe ?? 0;
  const pb = stock.pb ?? stock.finance?.pb ?? 0;
  const turnoverRate = stock.turnoverRate ?? stock.finance?.turnoverRate ?? 0;

  let score = 50;
  if (pe > 0 && pe < 25) score += 15;
  else if (pe > 60) score -= 10;
  if (pb > 0 && pb < 3) score += 10;
  else if (pb > 8) score -= 8;
  if (turnoverRate > 0.5 && turnoverRate < 8) score += 10;
  else if (turnoverRate > 12) score -= 8;
  score = Math.max(0, Math.min(100, score));

  return {
    symbol: stock.symbol,
    name: stock.name,
    healthScore: score,
    grade: score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : "D",
    categories: {
      valuation: { score: pe > 0 && pe < 35 ? 25 : 10, max: 25 },
      liquidity: { score: turnoverRate > 0 && turnoverRate < 8 ? 25 : 10, max: 25 },
      risk: { score: score >= 65 ? 25 : 12, max: 25 },
      qualityProxy: { score: pb > 0 && pb < 5 ? 25 : 10, max: 25 },
    },
    riskFactors: [
      ...(pe > 60 ? ["PE 过高"] : []),
      ...(pb > 8 ? ["PB 过高"] : []),
      ...(turnoverRate > 12 ? ["高换手波动"] : []),
    ],
    recommendation: "本分析仅供分析师参考，不构成独立投资建议。",
  };
}

export async function deepAnalyze(targetSymbol, candidates, sector) {
  const comps = await buildCompsAnalysis(targetSymbol, candidates);
  const healthAssessments = candidates.map(assessFinancialHealth);
  const targetHealth = healthAssessments.find((item) => item.symbol === targetSymbol);

  return {
    sector,
    comps,
    healthAssessments,
    recommendation: {
      target: targetSymbol,
      compsSummary: comps.analysis,
      healthAssessment: targetHealth,
      reviewQuestions: [
        "验证板块驱动因素和政策敏感度。",
        "对照同行中位数检查最新财报。",
        "从主数据源确认 K 线和资金流数据。",
      ],
    },
  };
}

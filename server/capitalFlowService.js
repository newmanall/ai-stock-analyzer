/**
 * Individual stock capital flow analysis service.
 * Data source: East Money free APIs.
 */

const EAST_MONEY_QUOTE_URL = "https://push2.eastmoney.com/api/qt/stock/get";
const EAST_MONEY_FLOW_URL = "https://push2.eastmoney.com/api/qt/stock/fflow/daykline/get";

function makeSecid(code) {
  if (code.startsWith("6")) return `1.${code}`;
  return `0.${code}`;
}

// ── 3.2 Analysis Functions ──────────────────────────────────────────────────

export async function analyzeCapitalFlow(code) {
  if (process.env.USE_MOCK_STOCK === "true") {
    return buildMockCapitalFlow(code);
  }

  const secid = makeSecid(code);

  // Fetch real-time flow snapshot
  const quoteFields = "f43,f57,f58,f62,f64,f66,f70,f72,f76,f78,f82,f84,f170,f184,f186,f188,f190,f192";
  const quoteUrl = `${EAST_MONEY_QUOTE_URL}?secid=${secid}&fields=${quoteFields}`;

  const quoteRes = await fetch(quoteUrl);
  if (!quoteRes.ok) {
    throw new Error(`Capital flow quote API failed: ${quoteRes.status}`);
  }
  const quoteRaw = await quoteRes.json();
  const qd = quoteRaw?.data || {};

  // Fetch daily flow history
  const flowUrl = `${EAST_MONEY_FLOW_URL}?secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65&lmt=10`;

  const flowRes = await fetch(flowUrl);
  let dailyFlows = [];
  if (flowRes.ok) {
    const flowRaw = await flowRes.json();
    const klines = flowRaw?.data?.klines || [];
    // Format: date,close,changePct,mainNetInflow,mainInflow,mainOutflow,superLargeNetInflow,...
    dailyFlows = klines.map(line => {
      const parts = line.split(",");
      return {
        date: parts[0] || "",
        mainNetInflow: Number(parts[3]) || 0, // f54 主力净流入
      };
    });
  }

  const todayMainNetInflow = ((qd.f62 ?? 0) / 1e8).toFixed(2); // 亿元
  const todaySuperLargeNetInflow = ((qd.f66 ?? 0) / 1e8).toFixed(2);
  const todayLargeNetInflow = ((qd.f72 ?? 0) / 1e8).toFixed(2);
  const todayMediumNetInflow = ((qd.f78 ?? 0) / 1e8).toFixed(2);
  const todaySmallNetInflow = ((qd.f84 ?? 0) / 1e8).toFixed(2);
  const totalAmount = qd.f48 ?? 0; // 成交额

  // Consecutive inflow days
  let consecutiveInflowDays = 0;
  for (let i = dailyFlows.length - 1; i >= 0; i--) {
    if (dailyFlows[i].mainNetInflow > 0) consecutiveInflowDays++;
    else break;
  }

  // Recent 5 days flow
  const recent5DaysFlow = dailyFlows.slice(-5).map(d => ({
    date: d.date,
    value: Number((d.mainNetInflow / 1e8).toFixed(2)),
  }));

  // Flow trend
  const inflowCount = recent5DaysFlow.filter(d => d.value > 0).length;
  let flowTrend = "震荡";
  if (inflowCount >= 4) flowTrend = "连续流入";
  else if (inflowCount <= 1) flowTrend = "连续流出";

  // Volume-price match
  const closePrice = (qd.f43 ?? 0) / 100;
  const changePercent = (qd.f170 ?? 0) / 100;
  let volumePriceMatch = "缩量下跌";
  if (changePercent > 0 && todayMainNetInflow > 0) volumePriceMatch = "量价齐升";
  else if (changePercent > 0 && todayMainNetInflow < 0) volumePriceMatch = "量价背离-价涨量缩";
  else if (changePercent < 0 && todayMainNetInflow > 0) volumePriceMatch = "量价背离-价跌量增";

  // Main force ratio
  const mainForceRatio = totalAmount > 0
    ? Number(((Number(todayMainNetInflow) * 1e8 / totalAmount) * 100).toFixed(2))
    : 0;

  // Assessment
  let assessment = "资金面中性";
  if (consecutiveInflowDays >= 3 && volumePriceMatch === "量价齐升") {
    assessment = `主力连续${consecutiveInflowDays}日净流入，量价齐升，资金面积极`;
  } else if (consecutiveInflowDays >= 3) {
    assessment = `主力连续${consecutiveInflowDays}日净流入，但量价配合一般`;
  } else if (flowTrend === "连续流出") {
    assessment = "主力持续流出，资金面偏空，暂宜观望";
  } else if (volumePriceMatch === "量价背离-价涨量缩") {
    assessment = "量价背离，主力资金流出但股价上涨，需警惕";
  }

  return {
    todayMainNetInflow: Number(todayMainNetInflow),
    todaySuperLargeNetInflow: Number(todaySuperLargeNetInflow),
    todayLargeNetInflow: Number(todayLargeNetInflow),
    todayMediumNetInflow: Number(todayMediumNetInflow),
    todaySmallNetInflow: Number(todaySmallNetInflow),
    consecutiveInflowDays,
    recent5DaysFlow,
    flowTrend,
    volumePriceMatch,
    mainForceRatio,
    assessment,
  };
}

// ── 3.3 AI Explanation Interface ────────────────────────────────────────────

export function explainCapitalFlow(secid, stockName, currentPrice, changePercent) {
  // This returns structured data; AI explanation is done in aiService
  return { secid, stockName, currentPrice, changePercent };
}

// ── 3.4 Mock ────────────────────────────────────────────────────────────────

function buildMockCapitalFlow(code) {
  const todayMain = Number(((Math.random() - 0.45) * 5).toFixed(2));
  const supLarge = Number((todayMain * 0.4).toFixed(2));
  const large = Number((todayMain * 0.6).toFixed(2));
  const med = Number(((Math.random() - 0.5) * 1.5).toFixed(2));
  const small = Number(((Math.random() - 0.5) * 1).toFixed(2));

  const consecutive = todayMain > 0 ? Math.floor(Math.random() * 5) + 1 : 0;

  const recent5DaysFlow = [];
  let base = todayMain * 0.7;
  for (let i = 4; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const val = Number((base + (Math.random() - 0.4) * 2).toFixed(2));
    recent5DaysFlow.push({
      date: d.toISOString().slice(0, 10),
      value: val,
    });
    base = val;
  }

  const inflowCount = recent5DaysFlow.filter(d => d.value > 0).length;
  let flowTrend = "震荡";
  if (inflowCount >= 4) flowTrend = "连续流入";
  else if (inflowCount <= 1) flowTrend = "连续流出";

  const changePct = (Math.random() - 0.5) * 4;
  let volumePriceMatch = "缩量下跌";
  if (changePct > 0 && todayMain > 0) volumePriceMatch = "量价齐升";
  else if (changePct > 0 && todayMain < 0) volumePriceMatch = "量价背离-价涨量缩";
  else if (changePct < 0 && todayMain > 0) volumePriceMatch = "量价背离-价跌量增";

  const mainForceRatio = Number((Math.random() * 15 - 5).toFixed(2));

  let assessment = "资金面中性";
  if (consecutive >= 3 && volumePriceMatch === "量价齐升") assessment = `主力连续${consecutive}日净流入，量价齐升，资金面积极`;
  else if (consecutive >= 3) assessment = `主力连续${consecutive}日净流入，但量价配合一般`;
  else if (flowTrend === "连续流出") assessment = "主力持续流出，资金面偏空，暂宜观望";

  return {
    todayMainNetInflow: todayMain,
    todaySuperLargeNetInflow: supLarge,
    todayLargeNetInflow: large,
    todayMediumNetInflow: med,
    todaySmallNetInflow: small,
    consecutiveInflowDays: consecutive,
    recent5DaysFlow,
    flowTrend,
    volumePriceMatch,
    mainForceRatio,
    assessment,
  };
}
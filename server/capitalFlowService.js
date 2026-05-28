/**
 * Individual stock capital flow analysis service.
 * Data sources:
 *   实时: push2.eastmoney.com/api/qt/stock/get (非交易时段字段不全)
 *   收盘: push2.eastmoney.com/api/qt/stock/fflow/daykline/get (always complete)
 *
 * 策略:
 *   1. 先读 K 线收盘数据（始终有完整的资金流向字段）
 *   2. 再用实时行情补中单/小单（交易时段才有）
 *   3. 如果两者都失败 → MOCK_CAPITAL_FLOW 降级
 */

const EAST_MONEY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://emweb.securities.eastmoney.com/PC_H5/",
  "Accept": "application/json",
};

const EAST_MONEY_QUOTE_URL = "https://push2.eastmoney.com/api/qt/stock/get";
const EAST_MONEY_FLOW_URL = "https://push2.eastmoney.com/api/qt/stock/fflow/daykline/get";

// ── 降级数据 ──────────────────────────────────────────────────────────────────

const MOCK_CAPITAL_FLOW = {
  todayMainNetInflow: -2.45,
  todaySuperLargeNetInflow: -1.20,
  todayLargeNetInflow: -1.25,
  todayMediumNetInflow: 0.68,
  todaySmallNetInflow: 1.77,
  consecutiveInflowDays: 0,
  recent5DaysFlow: [
    { date: "05-22", value: 3.50 },
    { date: "05-23", value: -1.20 },
    { date: "05-26", value: -0.80 },
    { date: "05-27", value: -2.10 },
    { date: "05-28", value: -2.45 },
  ],
  flowTrend: "连续流出",
  volumePriceMatch: "放量下跌",
  mainForceRatio: -8.50,
  assessment: "主力持续流出，资金面偏空，暂宜观望",
  warning: "当前使用模拟数据（非实时），输入股票代码点击分析获取真实数据",
};

function makeSecid(code) {
  if (code.startsWith("6")) return `1.${code}`;
  return `0.${code}`;
}

// ── 主分析 ──────────────────────────────────────────────────────────────────

export async function analyzeCapitalFlow(code) {
  const secid = makeSecid(code);
  let warning = null;

  // ── 1. 先从 K 线获取收盘资金流向（最可靠）─────────────────────────────
  let todayMainNetInflow = 0, todaySuperLargeNetInflow = 0, todayLargeNetInflow = 0;
  let dailyFlows = [];
  let closePrice = null, changePercent = null;
  let klineOk = false;

  try {
    const flowUrl = `${EAST_MONEY_FLOW_URL}?secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65&lmt=10`;
    const flowRes = await fetch(flowUrl, { headers: EAST_MONEY_HEADERS, signal: AbortSignal.timeout(5000) });

    if (flowRes.ok) {
      const flowRaw = await flowRes.json();
      const klines = flowRaw?.data?.klines || [];

      if (klines.length > 0) {
        // K线格式: date,f51(主力净流入),f52,f53,f54(超大单净流入),f55(大单净流入),f56,f57,f58,f59,f60,f61(收盘价),f62(涨跌幅),f63,f64,f65
        // f51 = 主力净流入(元), f54 = 超大单净流入(元), f55 = 大单净流入(元)
        // 验证: f54 + f55 = f51 (超大单+大单=主力)

        dailyFlows = klines.map(line => {
          const parts = line.split(",");
          const mainNet = Number(parts[1]) || 0;
          const superLarge = Number(parts[4]) || 0;
          const large = Number(parts[5]) || 0;
          return {
            date: (parts[0] || "").slice(5), // "2026-05-28" → "05-28"
            mainNetInflow: mainNet,
            superLargeNetInflow: superLarge,
            largeNetInflow: large,
            // 中单和小单 = -(主力净流入) × 比例估算
            // 实际数据中 中单≈主力×30%, 小单≈主力×20%
          };
        });

        // 今日数据取最新一条
        const today = dailyFlows[dailyFlows.length - 1];
        todayMainNetInflow = Number((today.mainNetInflow / 1e8).toFixed(2));
        todaySuperLargeNetInflow = Number((today.superLargeNetInflow / 1e8).toFixed(2));
        todayLargeNetInflow = Number((today.largeNetInflow / 1e8).toFixed(2));

        // 从 K 线解析收盘价和涨跌幅
        const lastParts = klines[klines.length - 1].split(",");
        closePrice = Number(lastParts[11]) || null;
        changePercent = Number(lastParts[12]) || null;

        // 非0主力净流入 = 有真实交易数据
        if (todayMainNetInflow !== 0) klineOk = true;
      }
    }
  } catch (err) {
    console.warn("Capital flow kline error:", err.message);
  }

  // ── 2. 从实时行情补中单/小单（交易时段有，非交易时段可能undefined）─────
  let todayMediumNetInflow = 0;
  let todaySmallNetInflow = 0;
  let totalAmount = 0;
  let quoteOk = false;

  try {
    const quoteFields = "f43,f57,f58,f62,f64,f66,f70,f72,f76,f78,f82,f84,f170,f184,f186,f188,f190,f192";
    const quoteUrl = `${EAST_MONEY_QUOTE_URL}?secid=${secid}&fields=${quoteFields}`;
    const quoteRes = await fetch(quoteUrl, { headers: EAST_MONEY_HEADERS, signal: AbortSignal.timeout(5000) });

    if (quoteRes.ok) {
      const quoteRaw = await quoteRes.json();
      const qd = quoteRaw?.data || {};

      // 行情中的资金流向字段可能在非交易时段返回 undefined
      todayMediumNetInflow = Number(((qd.f78 ?? 0) / 1e8).toFixed(2));
      todaySmallNetInflow = Number(((qd.f84 ?? 0) / 1e8).toFixed(2));
      totalAmount = qd.f48 ?? 0;

      // 如果没有从K线拿到收盘价，从行情补
      if (closePrice === null) closePrice = (qd.f43 ?? 0) / 100;
      if (changePercent === null) changePercent = (qd.f170 ?? 0) / 100;

      // 检查行情是否有真实数据
      quoteOk = (qd.f62 != null && qd.f62 !== 0) || (qd.f66 != null && qd.f66 !== 0);
    }
  } catch (err) {
    console.warn("Capital flow quote error:", err.message);
  }

  // ── 3. 如果两个数据源都没有真实数据 → 降级 ────────────────────────────
  if (!klineOk && !quoteOk) {
    return { ...MOCK_CAPITAL_FLOW };
  }

  // 如果只有K线好但没中单/小单 → 估算
  if (klineOk && (todayMediumNetInflow === 0 && todaySmallNetInflow === 0)) {
    // 中单和小单与主力反向，中单≈主力×30%, 小单≈主力×20%
    if (todayMainNetInflow > 0) {
      todayMediumNetInflow = Number((-todayMainNetInflow * 0.35).toFixed(2));
      todaySmallNetInflow = Number((-todayMainNetInflow * 0.25).toFixed(2));
    } else {
      todayMediumNetInflow = Number((-todayMainNetInflow * 0.45).toFixed(2));
      todaySmallNetInflow = Number((-todayMainNetInflow * 0.30).toFixed(2));
    }
    warning = "行情数据为非交易时段，部分资金流向为估算值";
  }

  // 如果只有行情好但K线没数据（极少发生）
  if (!klineOk && quoteOk) {
    todayMainNetInflow = Number(((qd?.f62 ?? 0) / 1e8).toFixed(2));
    todaySuperLargeNetInflow = Number(((qd?.f66 ?? 0) / 1e8).toFixed(2));
    todayLargeNetInflow = Number(((qd?.f72 ?? 0) / 1e8).toFixed(2));
    warning = "实时行情数据，盘中资金流向可能有变化";
  }

  // ── 4. 连续流入天数 ──────────────────────────────────────────────────
  let consecutiveInflowDays = 0;
  for (let i = dailyFlows.length - 1; i >= 0; i--) {
    if (dailyFlows[i].mainNetInflow > 0) consecutiveInflowDays++;
    else break;
  }

  // ── 5. 近5日趋势（K线数据） ──────────────────────────────────────────
  const recent5DaysFlow = dailyFlows.slice(-5).map(d => ({
    date: d.date,
    value: Number((d.mainNetInflow / 1e8).toFixed(2)),
  }));

  const inflowCount = recent5DaysFlow.filter(d => d.value > 0).length;
  let flowTrend = "震荡";
  if (inflowCount >= 4) flowTrend = "连续流入";
  else if (inflowCount <= 1) flowTrend = "连续流出";

  // ── 6. 量价匹配 ──────────────────────────────────────────────────────
  let volumePriceMatch = "量价平衡";
  const chg = changePercent || 0;
  if (chg > 0 && todayMainNetInflow > 0) volumePriceMatch = "量价齐升";
  else if (chg > 0 && todayMainNetInflow < 0) volumePriceMatch = "量价背离-价涨量缩";
  else if (chg < 0 && todayMainNetInflow > 0) volumePriceMatch = "量价背离-价跌量增";
  else if (chg < 0 && todayMainNetInflow < 0) volumePriceMatch = "放量下跌";

  // ── 7. 主力占比 ──────────────────────────────────────────────────────
  let mainForceRatio = 0;
  if (totalAmount > 0) {
    mainForceRatio = Number(((todayMainNetInflow * 1e8 / totalAmount) * 100).toFixed(2));
  } else if (todayMainNetInflow !== 0) {
    // 没有成交额时用收盘价估算
    mainForceRatio = Number((todayMainNetInflow / (Math.abs(todayMainNetInflow) + Math.abs(todayMediumNetInflow) + Math.abs(todaySmallNetInflow)) * 100).toFixed(2));
  }

  // ── 8. 综合评估 ──────────────────────────────────────────────────────
  let assessment = "资金面中性";
  if (consecutiveInflowDays >= 3 && volumePriceMatch === "量价齐升") {
    assessment = `主力连续${consecutiveInflowDays}日净流入，量价齐升，资金面积极`;
  } else if (consecutiveInflowDays >= 3) {
    assessment = `主力连续${consecutiveInflowDays}日净流入，但量价配合一般`;
  } else if (flowTrend === "连续流出") {
    assessment = "主力持续流出，资金面偏空，暂宜观望";
  } else if (volumePriceMatch === "量价背离-价涨量缩") {
    assessment = "量价背离，主力资金流出但股价上涨，需警惕";
  } else if (volumePriceMatch === "放量下跌") {
    assessment = "放量下跌，主力资金大幅流出，资金面偏空";
  }

  const result = {
    todayMainNetInflow,
    todaySuperLargeNetInflow,
    todayLargeNetInflow,
    todayMediumNetInflow,
    todaySmallNetInflow,
    consecutiveInflowDays,
    recent5DaysFlow,
    flowTrend,
    volumePriceMatch,
    mainForceRatio,
    assessment,
  };

  if (warning) result.warning = warning;
  return result;
}

// ── AI 解读 ──────────────────────────────────────────────────────────────────

export function explainCapitalFlow(secid, stockName, currentPrice, changePercent) {
  return { secid, stockName, currentPrice, changePercent };
}
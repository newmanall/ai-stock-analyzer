/**
 * Northbound (北向) fund flow analysis service.
 * Data source: East Money HSGT (沪深港通) APIs.
 *
 * 降级策略:
 *   主源: push2.eastmoney.com/api/qt/kamt/get → 实时北向
 *   备源: 无可用免费 API，使用 MOCK_NORTHBOUND
 *   最后: return { ...data, warning: "..." }
 */

const EAST_MONEY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://emweb.securities.eastmoney.com/PC_H5/",
  "Accept": "application/json",
};

const NB_REALTIME_URL = "https://push2.eastmoney.com/api/qt/kamt/get";
const NB_HISTORY_URL = "https://push2.eastmoney.com/api/qt/kamt.kline/get";

// ── 降级数据 ──────────────────────────────────────────────────────────────────

const MOCK_NORTHBOUND = {
  todaySHNetInflow: 12.45,
  todaySZNetInflow: 8.32,
  todayTotalNetInflow: 20.77,
  recent5Days: [
    { date: "05-22", shNet: -5.12, szNet: -3.88, total: -9.00 },
    { date: "05-23", shNet: 15.60, szNet: 10.20, total: 26.80 },
    { date: "05-26", shNet: 8.75, szNet: 6.30, total: 15.05 },
    { date: "05-27", shNet: 20.10, szNet: 12.50, total: 32.60 },
    { date: "05-28", shNet: 12.45, szNet: 8.32, total: 20.77 },
  ],
  consecutiveInflowDays: 4,
  trend: "持续流入",
  signal: "积极做多",
  summary: "北向资金连续4日大幅净流入，外资积极做多A股",
  warning: "当前使用模拟数据（非实时），点击刷新获取最新",
};

// ── 核心分析 ──────────────────────────────────────────────────────────────────

export async function analyzeNorthbound() {
  // ── 1. 实时数据 ────────────────────────────────────────────────────────
  let todaySHNetInflow = 0, todaySZNetInflow = 0, todayTotalNetInflow = 0;
  let realtimeOk = false;

  try {
    const rtUrl = `${NB_REALTIME_URL}?type=hsgt&fields1=f1,f2,f3,f4&fields2=f51,f52,f53,f54,f55,f56`;
    const rtRes = await fetch(rtUrl, { headers: EAST_MONEY_HEADERS, signal: AbortSignal.timeout(5000) });

    if (rtRes.ok) {
      const rtRaw = await rtRes.json();
      const rtData = rtRaw?.data;

      if (rtData?.hk2sh?.status !== undefined && rtData?.hk2sz?.status !== undefined) {
        // API 返回单位: 万元 → 转为亿（÷10000）
        todaySHNetInflow = Number((rtData.hk2sh.dayNetAmtIn / 10000).toFixed(2));
        todaySZNetInflow = Number((rtData.hk2sz.dayNetAmtIn / 10000).toFixed(2));
        todayTotalNetInflow = Number((todaySHNetInflow + todaySZNetInflow).toFixed(2));

        // 只有北向通道实际有交易（非0）才标记为成功
        if (todayTotalNetInflow !== 0) {
          realtimeOk = true;
        }
        // 即使是0也保留真实值，但后续检查历史
      }
    }
  } catch (err) {
    console.warn("Northbound realtime API error:", err.message);
  }

  // ── 2. 历史数据 ─────────────────────────────────────────────────────────
  let recent5Days = [];
  let consecutiveInflowDays = 0;

  try {
    const histUrl = `${NB_HISTORY_URL}?type=hsgt&fields1=f1,f2,f3,f4&fields2=f51,f52,f53,f54,f55,f56&klt=101&lmt=10`;
    const histRes = await fetch(histUrl, { headers: EAST_MONEY_HEADERS, signal: AbortSignal.timeout(5000) });

    if (histRes.ok) {
      const histRaw = await histRes.json();
      const hk2sh = histRaw?.data?.hk2sh || [];
      const hk2sz = histRaw?.data?.hk2sz || [];

      // 每条格式: date, 净买入(万元), 额度(万元), 余额(万元)
      // 注意: 当北向无交易时，hk2sh/sz 返回 0.00
      const dailyMap = new Map();

      for (const line of hk2sh) {
        const parts = line.split(",");
        const date = parts[0] || "";
        const net = Number((Number(parts[1] || 0) / 10000).toFixed(2));
        if (!dailyMap.has(date)) dailyMap.set(date, { shNet: 0, szNet: 0 });
        dailyMap.get(date).shNet += net;
      }

      for (const line of hk2sz) {
        const parts = line.split(",");
        const date = parts[0] || "";
        const net = Number((Number(parts[1] || 0) / 10000).toFixed(2));
        if (!dailyMap.has(date)) dailyMap.set(date, { shNet: 0, szNet: 0 });
        dailyMap.get(date).szNet += net;
      }

      const dailyTotals = [...dailyMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { shNet, szNet }]) => ({
          date: date.slice(5), // "2026-05-28" → "05-28"
          shNet,
          szNet,
          total: Number((shNet + szNet).toFixed(2)),
        }));

      recent5Days = dailyTotals.slice(-5);

      for (let i = dailyTotals.length - 1; i >= 0; i--) {
        if (dailyTotals[i].total > 0) consecutiveInflowDays++;
        else break;
      }
    }

    // 检查历史数据是否全是 0（无实际交易数据）
    const hasRealHistory = recent5Days.some(d => d.total !== 0);
    if (hasRealHistory) realtimeOk = realtimeOk || true; // 有历史也标记为有效
  } catch (err) {
    console.warn("Northbound history parse error:", err.message);
  }

  // ── 3. 判断是否使用降级 ────────────────────────────────────────────────
  const isRealData = realtimeOk || recent5Days.some(d => d.total !== 0);

  if (!isRealData) {
    // 全部是0 → 使用降级数据
    return { ...MOCK_NORTHBOUND };
  }

  // ── 4. 计算指标 ─────────────────────────────────────────────────────────
  if (recent5Days.length === 0 && todayTotalNetInflow !== 0) {
    recent5Days = [{ date: new Date().toISOString().slice(5, 10), shNet: todaySHNetInflow, szNet: todaySZNetInflow, total: todayTotalNetInflow }];
    consecutiveInflowDays = todayTotalNetInflow > 0 ? 1 : 0;
  }

  const inflowCnt = recent5Days.filter(d => d.total > 0).length;
  let trend = "震荡";
  if (inflowCnt >= 4) trend = "持续流入";
  else if (inflowCnt <= 1) trend = "持续流出";

  let signal = "中性";
  if (consecutiveInflowDays >= 3 && todayTotalNetInflow > 30) signal = "积极做多";
  else if (consecutiveInflowDays >= 2) signal = "谨慎偏多";
  else if (consecutiveInflowDays === 0 && todayTotalNetInflow < -30) signal = "偏空";

  let summary = "北向资金态度中性";
  if (signal === "积极做多") summary = `北向资金连续${consecutiveInflowDays}日大幅净流入，外资积极做多A股`;
  else if (signal === "谨慎偏多") summary = `北向资金连续${consecutiveInflowDays}日净流入，外资偏多但力度有限`;
  else if (signal === "偏空") summary = "北向资金大幅流出，外资短期偏空";
  else if (todayTotalNetInflow > 0) summary = "北向资金小幅净流入，外资观望中略偏多";
  else summary = "北向资金小幅净流出，外资短期谨慎";

  return { todaySHNetInflow, todaySZNetInflow, todayTotalNetInflow, recent5Days, consecutiveInflowDays, trend, signal, summary };
}

// ── AI 解读 ──────────────────────────────────────────────────────────────────

export function explainNorthbound(data) {
  return data;
}
/**
 * Northbound (北向) fund flow analysis service.
 * Data source: East Money HSGT (沪深港通) APIs.
 */

// 添加必要的请求头，避免被东财 API 拦截
const EAST_MONEY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://emweb.securities.eastmoney.com/PC_H5/",
  "Accept": "application/json",
};

const NB_REALTIME_URL = "https://push2.eastmoney.com/api/qt/kamt/get";
const NB_HISTORY_URL = "https://push2.eastmoney.com/api/qt/kamt.kline/get";

// ── 4.2 Analysis Functions ──────────────────────────────────────────────────

export async function analyzeNorthbound() {
  // Fetch realtime data
  const rtUrl = `${NB_REALTIME_URL}?type=hsgt&fields1=f1,f2,f3,f4&fields2=f51,f52,f53,f54,f55,f56`;
  const rtRes = await fetch(rtUrl, { headers: EAST_MONEY_HEADERS });
  if (!rtRes.ok) {
    throw new Error(`Northbound realtime API failed: ${rtRes.status}`);
  }
  const rtRaw = await rtRes.json();

  // API returns: data.hk2sh (港→沪), data.hk2sz (港→深), data.sh2hk (沪→港), data.sz2hk (深→港)
  const rtData = rtRaw?.data;
  // 北向净流入 = 港资买沪 + 港资买深
  const shBuy = rtData?.hk2sh?.dayNetAmtIn ?? 0;
  const szBuy = rtData?.hk2sz?.dayNetAmtIn ?? 0;
  const todaySHNetInflow = Number(shBuy.toFixed(2));
  const todaySZNetInflow = Number(szBuy.toFixed(2));
  const todayTotalNetInflow = Number((todaySHNetInflow + todaySZNetInflow).toFixed(2));

  // Fetch history (last 10 days)
  const histUrl = `${NB_HISTORY_URL}?type=hsgt&fields1=f1,f2,f3,f4&fields2=f51,f52,f53,f54,f55,f56&klt=101&lmt=10`;
  let recent5Days = [];
  let consecutiveInflowDays = 0;

  try {
    const histRes = await fetch(histUrl, { headers: EAST_MONEY_HEADERS });
    if (histRes.ok) {
      const histRaw = await histRes.json();
      const hk2sh = histRaw?.data?.hk2sh || [];
      const hk2sz = histRaw?.data?.hk2sz || [];

      // Build daily net map by date
      // Each line: date, 买入, 卖出, 余额
      const dailyMap = new Map();

      for (const line of hk2sh) {
        const parts = line.split(",");
        const date = parts[0] || "";
        const net = Number(Number(parts[1] || 0).toFixed(2));
        if (!dailyMap.has(date)) dailyMap.set(date, { shNet: 0, szNet: 0 });
        dailyMap.get(date).shNet += net;
      }

      for (const line of hk2sz) {
        const parts = line.split(",");
        const date = parts[0] || "";
        const net = Number(Number(parts[1] || 0).toFixed(2));
        if (!dailyMap.has(date)) dailyMap.set(date, { shNet: 0, szNet: 0 });
        dailyMap.get(date).szNet += net;
      }

      const dailyTotals = [...dailyMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { shNet, szNet }]) => ({
          date,
          shNet: Number(shNet.toFixed(2)),
          szNet: Number(szNet.toFixed(2)),
          total: Number((shNet + szNet).toFixed(2)),
        }));

      recent5Days = dailyTotals.slice(-5);

      for (let i = dailyTotals.length - 1; i >= 0; i--) {
        if (dailyTotals[i].total > 0) consecutiveInflowDays++;
        else break;
      }
    }
  } catch (err) {
    console.warn("Northbound history parse error:", err.message);
    recent5Days = [{ date: new Date().toISOString().slice(0, 10), shNet: todaySHNetInflow, szNet: todaySZNetInflow, total: todayTotalNetInflow }];
    consecutiveInflowDays = todayTotalNetInflow > 0 ? 1 : 0;
  }

  // Trend
  const inflowCnt = recent5Days.filter(d => d.total > 0).length;
  let trend = "震荡";
  if (inflowCnt >= 4) trend = "持续流入";
  else if (inflowCnt <= 1) trend = "持续流出";

  // Signal
  let signal = "中性";
  if (consecutiveInflowDays >= 3 && todayTotalNetInflow > 30) signal = "积极做多";
  else if (consecutiveInflowDays >= 2) signal = "谨慎偏多";
  else if (consecutiveInflowDays === 0 && todayTotalNetInflow < -30) signal = "偏空";

  // Summary
  let summary = "北向资金态度中性";
  if (signal === "积极做多") summary = `北向资金连续${consecutiveInflowDays}日大幅净流入，外资积极做多A股`;
  else if (signal === "谨慎偏多") summary = `北向资金连续${consecutiveInflowDays}日净流入，外资偏多但力度有限`;
  else if (signal === "偏空") summary = "北向资金大幅流出，外资短期偏空";
  else if (todayTotalNetInflow > 0) summary = "北向资金小幅净流入，外资观望中略偏多";
  else summary = "北向资金小幅净流出，外资短期谨慎";

  return {
    todaySHNetInflow,
    todaySZNetInflow,
    todayTotalNetInflow,
    recent5Days,
    consecutiveInflowDays,
    trend,
    signal,
    summary,
  };
}

// ── 4.3 AI Explanation Interface ────────────────────────────────────────────

export function explainNorthbound(data) {
  return data;
}

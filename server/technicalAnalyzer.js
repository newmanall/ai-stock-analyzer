/**
 * Technical indicator calculations and signal detection.
 * Pure math — no AI, no API calls beyond what the caller passes in.
 */

// ── 2.1 Indicator Calculations ──────────────────────────────────────────────

export function calcMA(closes, period) {
  if (!closes || closes.length < period) return null;
  const slice = closes.slice(-period);
  return Number((slice.reduce((a, b) => a + b, 0) / period).toFixed(2));
}

export function calcEMA(closes, period) {
  if (!closes || closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return Number(ema.toFixed(2));
}

export function calcMACD(closes) {
  if (!closes || closes.length < 26) {
    return { dif: null, dea: null, macdBar: null, signal: "insufficient_data" };
  }

  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const dif = Number((ema12 - ema26).toFixed(2));

  // Calculate DEA (9-day EMA of DIF) using a rolling DIF series
  const difSeries = [];
  for (let i = 26; i <= closes.length; i++) {
    const e12 = calcEMA(closes.slice(0, i), 12);
    const e26 = calcEMA(closes.slice(0, i), 26);
    difSeries.push(Number((e12 - e26).toFixed(2)));
  }
  const dea = calcEMA(difSeries, 9);
  const macdBar = Number(((dif - dea) * 2).toFixed(2));

  // Previous day's DIF and DEA for cross detection
  const prevDif = difSeries.length >= 2 ? difSeries[difSeries.length - 2] : null;
  const prevDeaSeries = [];
  for (let i = 9; i <= difSeries.length; i++) {
    prevDeaSeries.push(calcEMA(difSeries.slice(0, i), 9));
  }
  const prevDea = prevDeaSeries.length >= 2 ? prevDeaSeries[prevDeaSeries.length - 2] : null;

  let signal = "bearish";
  if (dif > dea) signal = "bullish";
  if (prevDif !== null && prevDea !== null) {
    if (prevDif <= prevDea && dif > dea) signal = "golden_cross";
    if (prevDif >= prevDea && dif < dea) signal = "death_cross";
  }

  return { dif, dea, macdBar, signal };
}

export function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return { value: null, status: "unknown" };

  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return { value: 100, status: "overbought" };
  const rs = avgGain / avgLoss;
  const rsi = Number((100 - 100 / (1 + rs)).toFixed(1));

  let status = "neutral";
  if (rsi > 70) status = "overbought";
  else if (rsi < 30) status = "oversold";

  return { value: rsi, status };
}

export function calcKDJ(highs, lows, closes) {
  const period = 9;
  if (!highs || !lows || !closes || closes.length < period) {
    return { k: null, d: null, j: null };
  }

  // Compute RSV for the last day
  const sliceH = highs.slice(-period);
  const sliceL = lows.slice(-period);
  const highestH = Math.max(...sliceH);
  const lowestL = Math.min(...sliceL);
  const rsv = ((closes[closes.length - 1] - lowestL) / (highestH - lowestL || 1)) * 100;

  // Simplified: use SMA(rsv, 3) for K, SMA(K, 3) for D
  // For demo purposes, compute rolling RSV series
  const rsvSeries = [];
  for (let i = period; i <= closes.length; i++) {
    const hSlice = highs.slice(i - period, i);
    const lSlice = lows.slice(i - period, i);
    const hh = Math.max(...hSlice);
    const ll = Math.min(...lSlice);
    rsvSeries.push(((closes[i - 1] - ll) / (hh - ll || 1)) * 100);
  }

  const k = rsvSeries.length >= 3
    ? Number((rsvSeries.slice(-3).reduce((a, b) => a + b, 0) / 3).toFixed(2))
    : Number(rsv.toFixed(2));

  // For D, we need K series
  const kSeries = [];
  for (let i = 3; i <= rsvSeries.length; i++) {
    kSeries.push(Number((rsvSeries.slice(i - 3, i).reduce((a, b) => a + b, 0) / 3).toFixed(2)));
  }

  const d = kSeries.length >= 3
    ? Number((kSeries.slice(-3).reduce((a, b) => a + b, 0) / 3).toFixed(2))
    : k;

  const j = Number((3 * k - 2 * d).toFixed(2));

  return { k, d, j };
}

export function calcBOLL(closes, period = 20, multiplier = 2) {
  if (!closes || closes.length < period) {
    return { upper: null, middle: null, lower: null, width: null, position: "unknown" };
  }

  const middle = calcMA(closes, period);
  const slice = closes.slice(-period);
  const variance = slice.reduce((acc, v) => acc + (v - middle) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  const upper = Number((middle + multiplier * std).toFixed(2));
  const lower = Number((middle - multiplier * std).toFixed(2));
  const width = Number((upper - lower).toFixed(2));
  const lastClose = closes[closes.length - 1];

  let position = "middle";
  if (lastClose >= upper * 0.98) position = "near_upper";
  else if (lastClose <= lower * 1.02) position = "near_lower";

  return { upper, middle, lower, width, position };
}

// ── 2.2 Signal Detection ────────────────────────────────────────────────────

export function detectSignals(klineData) {
  const signals = [];
  const closes = klineData.closes || [];
  const highs = klineData.highs || [];
  const lows = klineData.lows || [];

  if (closes.length < 26) return signals;

  // MACD cross detection
  const difSeries = [];
  for (let i = 26; i <= closes.length; i++) {
    const e12 = calcEMA(closes.slice(0, i), 12);
    const e26 = calcEMA(closes.slice(0, i), 26);
    difSeries.push(Number((e12 - e26).toFixed(2)));
  }
  const deaSeries = [];
  for (let i = 9; i <= difSeries.length; i++) {
    deaSeries.push(calcEMA(difSeries.slice(0, i), 9));
  }

  // Check last 3 days for crosses
  for (let idx = difSeries.length - 3; idx < difSeries.length - 1; idx++) {
    if (idx < 0 || idx + 1 >= difSeries.length) continue;
    if (idx + 1 >= deaSeries.length) continue;
    const prevD = difSeries[idx];
    const prevE = deaSeries[idx];
    const curD = difSeries[idx + 1];
    const curE = deaSeries[idx + 1];
    const daysAgo = difSeries.length - 1 - (idx + 1);

    if (prevD <= prevE && curD > curE) {
      signals.push({
        type: "MACD金叉",
        description: daysAgo === 0 ? "今日MACD形成金叉" : `${daysAgo}个交易日前MACD形成金叉`,
        strength: "strong",
      });
      break;
    }
    if (prevD >= prevE && curD < curE) {
      signals.push({
        type: "MACD死叉",
        description: daysAgo === 0 ? "今日MACD形成死叉" : `${daysAgo}个交易日前MACD形成死叉`,
        strength: "strong",
      });
      break;
    }
  }

  // MACD divergence (bottom divergence: price new low but DIF not)
  const recentCloses = closes.slice(-10);
  const recentDifs = difSeries.slice(-10);
  if (recentCloses.length >= 5 && recentDifs.length >= 5) {
    const closeMin = Math.min(...recentCloses);
    const difMin = Math.min(...recentDifs);
    const closeMinIdx = recentCloses.indexOf(closeMin);
    const difMinIdx = recentDifs.indexOf(difMin);
    if (closeMinIdx === recentCloses.length - 1 && difMinIdx < recentCloses.length - 3) {
      signals.push({
        type: "MACD底背离",
        description: "股价创新低但DIF未创新低，底部背离信号",
        strength: "strong",
      });
    }
    const closeMax = Math.max(...recentCloses);
    const difMax = Math.max(...recentDifs);
    const closeMaxIdx = recentCloses.indexOf(closeMax);
    const difMaxIdx = recentDifs.indexOf(difMax);
    if (closeMaxIdx === recentCloses.length - 1 && difMaxIdx < recentCloses.length - 3) {
      signals.push({
        type: "MACD顶背离",
        description: "股价创新高但DIF未创新高，顶部背离信号",
        strength: "strong",
      });
    }
  }

  // RSI signals
  const rsi = calcRSI(closes, 14);
  if (rsi.status === "oversold") {
    const prevRsi = calcRSI(closes.slice(0, -1), 14);
    if (prevRsi.value !== null && rsi.value > prevRsi.value) {
      signals.push({ type: "RSI超卖拐头", description: "RSI从超卖区拐头向上", strength: "medium" });
    } else {
      signals.push({ type: "RSI超卖", description: "RSI处于超卖区域，可能反弹", strength: "medium" });
    }
  }
  if (rsi.status === "overbought") {
    const prevRsi = calcRSI(closes.slice(0, -1), 14);
    if (prevRsi.value !== null && rsi.value < prevRsi.value) {
      signals.push({ type: "RSI超买拐头", description: "RSI从超买区拐头向下", strength: "medium" });
    } else {
      signals.push({ type: "RSI超买", description: "RSI处于超买区域，注意回调风险", strength: "medium" });
    }
  }

  // KDJ signals
  if (highs.length >= 9 && lows.length >= 9) {
    const kdj = calcKDJ(highs, lows, closes);
    if (kdj.k !== null && kdj.d !== null) {
      if (kdj.k > kdj.d && kdj.j < 0) {
        signals.push({ type: "KDJ超卖", description: "KDJ J值小于0，超卖信号", strength: "medium" });
      }
      if (kdj.k < kdj.d && kdj.j > 100) {
        signals.push({ type: "KDJ超买", description: "KDJ J值大于100，超买信号", strength: "medium" });
      }
    }
  }

  // Bollinger Band signals
  const boll = calcBOLL(closes);
  if (boll.position === "near_upper") {
    signals.push({ type: "布林上轨", description: "股价接近布林带上轨，短期压力位", strength: "weak" });
  }
  if (boll.position === "near_lower") {
    signals.push({ type: "布林下轨", description: "股价接近布林带下轨，短期支撑位", strength: "weak" });
  }

  // MA support/resistance
  const ma20 = calcMA(closes, 20);
  const ma60 = calcMA(closes, 60);
  const lastClose = closes[closes.length - 1];
  const prevClose = closes[closes.length - 2];

  if (ma20 && prevClose < ma20 && lastClose > ma20) {
    signals.push({ type: "突破MA20", description: "股价突破20日均线，短线走强", strength: "medium" });
  }
  if (ma20 && lastClose > ma20 && lastClose < ma20 * 1.02) {
    signals.push({ type: "回踩MA20", description: "股价回踩20日均线，确认支撑", strength: "medium" });
  }
  if (ma60 && lastClose < ma60 && lastClose > ma60 * 0.98) {
    signals.push({ type: "MA60支撑", description: "股价在60日均线附近获得支撑", strength: "medium" });
  }

  return signals;
}

// ── 2.3 Technical Assessment ────────────────────────────────────────────────

export function assessTechnical(klineData) {
  const closes = klineData.closes || [];
  const highs = klineData.highs || [];
  const lows = klineData.lows || [];

  // Calculate all indicators
  const ma5 = calcMA(closes, 5);
  const ma10 = calcMA(closes, 10);
  const ma20 = calcMA(closes, 20);
  const ma60 = calcMA(closes, 60);
  const macd = calcMACD(closes);
  const rsi = calcRSI(closes);
  const kdj = highs.length >= 9 && lows.length >= 9 ? calcKDJ(highs, lows, closes) : { k: null, d: null, j: null };
  const boll = calcBOLL(closes);
  const signals = detectSignals(klineData);

  // Scoring
  let score = 50;

  // MA alignment
  if (ma5 && ma10 && ma20 && ma5 > ma10 && ma10 > ma20) score += 15;
  else if (ma5 && ma10 && ma5 > ma10) score += 5;

  // MACD
  if (macd.signal === "golden_cross") score += 15;
  else if (macd.signal === "bullish") score += 8;
  else if (macd.signal === "death_cross") score -= 15;

  // RSI
  if (rsi.value !== null) {
    if (rsi.value >= 40 && rsi.value <= 70) score += 10;
    else if (rsi.value < 30) score += 5; // oversold bounce potential
    else if (rsi.value > 80) score -= 5;
  }

  // Bollinger position
  if (boll.position === "near_lower") score += 5;
  if (boll.position === "near_upper") score -= 3;

  // Signal count
  const strongSignals = signals.filter(s => s.strength === "strong").length;
  const mediumSignals = signals.filter(s => s.strength === "medium").length;
  score += strongSignals * 3 + mediumSignals * 1;

  score = Math.max(0, Math.min(100, score));

  const indicators = { ma5, ma10, ma20, ma60, macd, rsi, kdj, boll };

  // Summary
  let summary = "技术面中性";
  if (score >= 70) summary = "技术面偏多，多项指标发出积极信号";
  else if (score >= 55) summary = "技术面略偏多，部分指标走好";
  else if (score <= 30) summary = "技术面偏空，多项指标发出警示信号";
  else if (score <= 45) summary = "技术面略偏空，需关注风险信号";

  return { overallScore: score, signals, indicators, summary };
}

// ── 2.4 AI Explanation Interface ────────────────────────────────────────────

export function explainTechnical(klineData, stockName = "") {
  const assessment = assessTechnical(klineData);
  return {
    stockName,
    allIndicators: assessment.indicators,
    allSignals: assessment.signals,
    overallScore: assessment.overallScore,
    rawSummary: assessment.summary,
  };
}

// ── 2.5 Mock ────────────────────────────────────────────────────────────────

export function buildMockKlineData(basePrice = 50) {
  const len = 50;
  const closes = [];
  const highs = [];
  const lows = [];
  let price = basePrice;
  for (let i = 0; i < len; i++) {
    const change = (Math.random() - 0.48) * price * 0.04;
    price = Math.max(price + change, 1);
    closes.push(Number(price.toFixed(2)));
    highs.push(Number((price * (1 + Math.random() * 0.03)).toFixed(2)));
    lows.push(Number((price * (1 - Math.random() * 0.03)).toFixed(2)));
  }
  return { closes, highs, lows };
}
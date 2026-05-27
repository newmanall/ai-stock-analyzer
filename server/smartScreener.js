/**
 * Smart stock screening engine.
 * Uses East Money API for market-wide scan + multi-dimension scoring.
 */

import { calcMA, calcMACD, calcRSI } from "./technicalAnalyzer.js";
import { saveSearchHistory } from "./supabase.js";

const EAST_MONEY_LIST_URL = "https://push2.eastmoney.com/api/qt/clist/get";

const SECTOR_MAP = {
  "all": "m:0+t:6,m:0+t:80,m:1+t:2",
  "bank": "b:BK0475",
  "liquor": "b:BK0477",
  "semiconductor": "b:BK1036",
  "new_energy": "b:BK0493",
  "auto": "b:BK0481",
  "power": "b:BK0428",
  "real_estate": "b:BK0451",
  "metal": "b:BK0478",
  "ai": "b:BK0800",
};
function makeSecid(code) {
  if (code.startsWith("6")) return `1.${code}`;
  return `0.${code}`;
}

// ── Helper: fetch kline data for a stock (Zhitu API with rate limiting) ────

async function fetchKlineForStock(code) {
  const token = process.env.ZHITU_API_TOKEN;
  if (!token) {
    console.error(`[smartScreener] ZHITU_API_TOKEN not configured for ${code}. K-line data unavailable.`);
    return null;
  }

  const suffix = code.startsWith("6") ? `${code}.SH` : `${code}.SZ`;
  const now = new Date();
  const endDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const startDate = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, "0")}${String(start.getDate()).padStart(2, "0")}`;

  const url = `https://api.zhituapi.com/hs/history/${suffix}/d/n?token=${token}&st=${startDate}&et=${endDate}`;

  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) {
      console.error(`[smartScreener] Zhitu API returned ${res.status} for ${suffix}. K-line data unavailable.`);
      return null;
    }
    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length < 20) {
      console.error(`[smartScreener] Zhitu API returned insufficient data (${raw?.length ?? 0} items) for ${suffix}. K-line data unavailable.`);
      return null;
    }

    const closes = raw.map(item => Number(item.c ?? 0)).filter(v => v > 0);
    const highs = raw.map(item => Number(item.h ?? 0)).filter(v => v > 0);
    const lows = raw.map(item => Number(item.l ?? 0)).filter(v => v > 0);

    if (closes.length < 20) {
      console.error(`[smartScreener] Valid closes < 20 for ${suffix}. K-line data unavailable.`);
      return null;
    }
    return { closes, highs, lows };
  } catch (err) {
    console.error(`[smartScreener] Zhitu API error for ${suffix}: ${err.message}. K-line data unavailable.`);
    return null;
  }
}

// ── 1.1 Market Scan ─────────────────────────────────────────────────────────

export async function scanMarket(sector = "all") {
  // Fetch top stocks by sector
  const fsParam = SECTOR_MAP[sector] || SECTOR_MAP["all"];
  const pz = sector === "all" ? 200 : 100;

  const listUrl = `${EAST_MONEY_LIST_URL}?pn=1&pz=${pz}&po=1&np=1&fltt=2&invt=2&fs=${encodeURIComponent(fsParam)}&fields=f2,f3,f5,f6,f8,f9,f10,f12,f14,f15,f16,f20,f23,f37,f39,f40,f41,f46,f49`;
  
  // 如果东方财富API不可用，返回空数组并记录错误
  let stockList = [];
  try {
    const listRes = await fetch(listUrl);
    if (!listRes.ok) {
      console.error(`[smartScreener] East Money API failed (${listRes.status}) for sector=${sector}. Scan results unavailable.`);
      return [];
    }
    const listRaw = await listRes.json();
    stockList = listRaw?.data?.diff || [];
  } catch (error) {
    console.error(`[smartScreener] East Money API error for sector=${sector}: ${error.message}. Scan results unavailable.`);
    return [];
  }

  const scored = [];

  // 第一步：基本面过滤，收集候选股票
  const candidates = [];
  for (const stock of stockList) {
    const code = stock.f12;
    const name = stock.f14;
    const totalMarketCap = stock.f20 ?? 0;
    const turnoverRate = stock.f8 ?? 0;
    const pe = stock.f9 ?? 0;

    // 基本面过滤
    if (name && (name.includes("ST") || name.includes("*ST"))) continue;
    if (name && name.includes("退")) continue;
    if (totalMarketCap === 0 || totalMarketCap === "-" || totalMarketCap < 5000000000) continue;
    if (turnoverRate <= 0 || turnoverRate > 15) continue;
    if (pe <= 0 && pe !== 0) continue; // 跳过 PE 为 "-" 的情况

    const pb = stock.f23 ?? 0;
    const roe = stock.f37 ?? 0;
    const grossProfit = stock.f40 ?? 0;       // 毛利金额
    const revenue = stock.f39 ?? stock.f38 ?? 1; // 主营收入
    const grossMargin = revenue > 0 ? grossProfit / revenue : 0;
    const netProfitMargin = stock.f41 ?? 0;
    const revenueYoY = stock.f46 ?? 0;        // 营收同比增长率
    const debtRatio = stock.f49 ?? 0;         // 资产负债率

    candidates.push({ stock, code, name, totalMarketCap, turnoverRate, pe, pb, roe, grossMargin, netProfitMargin, revenueYoY, debtRatio });
  }

  // 第二步：分批获取K线数据（限制并发+间隔，防止429限流）
  const MAX_CONCURRENT = 3;
  const BATCH_DELAY_MS = 800;
  const klineResults = new Map();

  for (let i = 0; i < candidates.length; i += MAX_CONCURRENT) {
    const batch = candidates.slice(i, i + MAX_CONCURRENT);
    const promises = batch.map(async (candidate) => {
      const kline = await fetchKlineForStock(candidate.code);
      return { code: candidate.code, kline };
    });
    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.kline) {
        klineResults.set(result.value.code, result.value.kline);
      }
    }

    if (i + MAX_CONCURRENT < candidates.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // 第三步：技术指标计算和打分
  for (const candidate of candidates) {
    const { stock, code, name, totalMarketCap, turnoverRate, pe, pb, roe, grossMargin, netProfitMargin, revenueYoY, debtRatio } = candidate;
    
    const kline = klineResults.get(code);
    if (!kline) continue;

    const close = stock.f2 ?? 0;
    const changePercent = stock.f3 ?? 0;
    const volume = stock.f5 ?? 0;
    const amount = stock.f6 ?? 0;
    const high = stock.f15 ?? 0;
    const low = stock.f16 ?? 0;

    const closes = kline.closes;
    const ma5 = calcMA(closes, 5);
    const ma10 = calcMA(closes, 10);
    const ma20 = calcMA(closes, 20);
    const macd = calcMACD(closes);
    const rsi = calcRSI(closes);

    // ── Scoring ──

    // 1. 均线多头排列 (20分)
    let maScore = 0;
    if (ma5 && ma10 && ma20 && ma5 > ma10 && ma10 > ma20) maScore = 20;
    else if (ma5 && ma10 && ma5 > ma10) maScore = 10;

    // 2. MACD 金叉信号 (20分)
    let macdScore = 0;
    if (macd.signal === "golden_cross") macdScore = 20;
    else if (macd.signal === "bullish") macdScore = 12;

    // 3. 量价配合 (20分) — 使用东方财富量比(5日均量比值)
    let volumeScore = 0;
    const volRatio = (stock.f10 ?? 0); // 量比: 现成交量 / 5日均量
    if (changePercent > 0 && volRatio > 2) volumeScore = 20;
    else if (changePercent > 0 && volRatio > 1.2) volumeScore = 12;

    // 4. RSI 合理区间 (15分)
    let rsiScore = 0;
    if (rsi.value !== null) {
      if (rsi.value >= 40 && rsi.value <= 70) rsiScore = 15;
      else if (rsi.value >= 30 && rsi.value <= 80) rsiScore = 8;
    }

    // 5. 主力资金流入 (15分) — approximate via change + amount
    let capitalScore = 0;
    if (changePercent > 1 && amount > 500000000) capitalScore = 15;
    else if (changePercent > 0 && amount > 100000000) capitalScore = 8;

    // 6. 低估值加分 (10分)
    let peScore = 0;
    if (pe > 0 && pe < 30) peScore = 10;
    else if (pe > 0 && pe < 50) peScore = 5;

    // ══════ 财务分析维度 (55分) ══════
    // 7. ROE 净资产收益率 — 股东回报效率 (15分)
    let roeScore = 0;
    if (roe > 20) roeScore = 15;
    else if (roe > 10) roeScore = 10;
    else if (roe > 5) roeScore = 5;

    // 8. 毛利率 — 竞争壁垒/护城河 (10分)
    let grossScore = 0;
    if (grossMargin > 0.4) grossScore = 10;
    else if (grossMargin > 0.2) grossScore = 7;
    else if (grossMargin > 0.1) grossScore = 4;

    // 9. 净利率 — 盈利能力 (10分)
    let npmScore = 0;
    if (netProfitMargin > 0.20) npmScore = 10;
    else if (netProfitMargin > 0.10) npmScore = 7;
    else if (netProfitMargin > 0.05) npmScore = 4;

    // 10. 营收同比增长率 — 成长性 (10分)
    let revScore = 0;
    if (revenueYoY > 20) revScore = 10;
    else if (revenueYoY > 10) revScore = 7;
    else if (revenueYoY > 0) revScore = 4;

    // 11. 资产负债率 — 财务健康度 (10分，越低越稳健)
    let debtScore = 0;
    if (debtRatio > 0 && debtRatio < 30) debtScore = 10;
    else if (debtRatio >= 30 && debtRatio < 50) debtScore = 7;
    else if (debtRatio >= 50 && debtRatio < 70) debtScore = 4;

    const totalScore = maScore + macdScore + volumeScore + rsiScore + capitalScore + peScore + roeScore + grossScore + npmScore + revScore + debtScore;

    scored.push({
      symbol: code,
      name,
      close,
      changePercent,
      volume,
      amount,
      turnoverRate,
      pe,
      pb,
      totalMarketCap,
      high,
      low,
      totalScore,
      scoreDetail: {
        ma: maScore,
        macd: macdScore,
        volume: volumeScore,
        rsi: rsiScore,
        capital: capitalScore,
        pe: peScore,
        // 财务分析维度
        roe: roeScore,
        grossMargin: grossScore,
        netProfitMargin: npmScore,
        revenueYoY: revScore,
        debtRatio: debtScore,
      },
      finance: {
        pb,
        roe,
        grossMargin: Number((grossMargin * 100).toFixed(1)),    // 转百分比
        netProfitMargin: Number((netProfitMargin * 100).toFixed(1)),
        revenueYoY: Number(revenueYoY.toFixed(1)),
        debtRatio: Number(debtRatio.toFixed(1)),
      },
      indicators: {
        ma5, ma10, ma20,
        macd: { dif: macd.dif, dea: macd.dea, signal: macd.signal },
        rsi: { value: rsi.value, status: rsi.status },
      },
    });
  }

  // Sort by score descending, take top 15
  scored.sort((a, b) => b.totalScore - a.totalScore);
  const top15 = scored.slice(0, 15);

  // 记录搜索历史到Supabase数据库
  if (top15.length > 0) {
    try {
      await saveSearchHistory({
        symbol: sector,
        name: sector,
        sector,
        analysisType: "screener",
        resultCount: top15.length
      });
    } catch (e) {
      // 搜索历史记录失败不影响选股结果
      console.warn("Search history save failed:", e.message);
    }
  }

  return top15;
}

// ── 1.2 AI Explanation Interface ────────────────────────────────────────────

export async function scanAndExplain() {
  const stocks = await scanMarket();
  return {
    stocks,
    totalScanned: stocks.length,
    timestamp: new Date().toISOString(),
  };
}

// ── 1.3 Mock ────────────────────────────────────────────────────────────────

// ── 2. 深度金融分析（Anthropic Financial Services 框架集成）────────────────

/**
 * 行业分类映射
 */
const INDUSTRY_MAP = {
  "白酒": { sector: "consumption", peers: ["600519", "000858", "000568", "600809", "002304"] },
  "半导体": { sector: "technology", peers: ["600460", "002371", "603986", "002049", "688981"] },
  "新能源": { sector: "energy", peers: ["300750", "002594", "601012", "300274", "600438"] },
  "银行": { sector: "financial", peers: ["601318", "600036", "601288", "601939", "000001"] },
  "医药": { sector: "healthcare", peers: ["600276", "300015", "600436", "000538", "603259"] },
};

/**
 * 可比公司分析
 * @param {string} targetSymbol - 目标股票代码
 * @param {Array} candidates - 候选股票列表
 */
export async function buildCompsAnalysis(targetSymbol, candidates) {
  const target = candidates.find(s => s.symbol === targetSymbol);
  if (!target) {
    throw new Error(`Target stock ${targetSymbol} not found in candidates`);
  }

  // 获取行业信息
  const industryInfo = Object.values(INDUSTRY_MAP).find(info => 
    info.peers.includes(targetSymbol)
  );

  // 筛选同行
  const peers = candidates.filter(s => 
    industryInfo?.peers.includes(s.symbol) && s.symbol !== targetSymbol
  );

  // 构建对比数据
  const allStocks = [target, ...peers].slice(0, 5); // 最多 5 家公司

  // 计算统计值
  const calcStats = (key) => {
    const values = allStocks.map(s => s.finance?.[key] ?? 0).filter(v => v > 0);
    if (values.length < 2) return null;
    values.sort((a, b) => a - b);
    const n = values.length;
    return {
      max: values[n - 1],
      percentile75: values[Math.floor(n * 0.75)],
      median: values[Math.floor(n / 2)],
      percentile25: values[Math.floor(n * 0.25)],
      min: values[0],
    };
  };

  return {
    target: {
      symbol: target.symbol,
      name: target.name,
      finance: target.finance,
    },
    peers: peers.map(s => ({
      symbol: s.symbol,
      name: s.name,
      finance: s.finance,
    })),
    statistics: {
      roe: calcStats("roe"),
      grossMargin: calcStats("grossMargin"),
      netProfitMargin: calcStats("netProfitMargin"),
      revenueYoY: calcStats("revenueYoY"),
      debtRatio: calcStats("debtRatio"),
      pb: calcStats("pb"),
    },
    analysis: generateCompsAnalysisText(target, peers),
  };
}

/**
 * 生成可比公司分析文本
 */
function generateCompsAnalysisText(target, peers) {
  if (!peers.length) {
    return {
      position: "无足够同行数据进行对比",
      rationale: "建议扩大选股范围或选择其他行业",
      riskFactors: ["数据不足"],
    };
  }

  const targetGrossMargin = target.finance?.grossMargin ?? 0;
  const peerMargins = peers.map(p => p.finance?.grossMargin ?? 0);
  const avgMargin = peerMargins.reduce((a, b) => a + b, 0) / peerMargins.length;
  const marginAdvantage = ((targetGrossMargin - avgMargin) / avgMargin * 100).toFixed(1);

  const targetROE = target.finance?.roe ?? 0;
  const peerROEs = peers.map(p => p.finance?.roe ?? 0);
  const avgROE = peerROEs.reduce((a, b) => a + b, 0) / peerROEs.length;

  return {
    position: `${target.name} 毛利率 ${targetGrossMargin.toFixed(1)}%，${marginAdvantage > 0 ? '高于' : '低于'} 同行平均 ${avgMargin.toFixed(1)}%（差异 ${marginAdvantage}%）`,
    rationale: `ROE ${targetROE.toFixed(1)}%，${targetROE > avgROE ? '优于' : '低于'} 同行平均 ${avgROE.toFixed(1)}%`,
    riskFactors: marginAdvantage > 20 ? ["毛利率显著高于同行，需验证可持续性"] : ["无明显异常"],
  };
}

/**
 * 财务健康度评估
 * @param {Object} stock - 股票数据
 */
export function assessFinancialHealth(stock) {
  const f = stock.finance ?? {};
  const score = {
    profitability: 0,  // ROE + 毛利率 + 净利率
    growth: 0,         // 营收增长
    financialHealth: 0, // 负债率
    efficiency: 0,     // PB 合理性
    total: 0,
    grade: "C",
  };

  // 盈利能力评分 (30%)
  const roe = f.roe ?? 0;
  const grossMargin = f.grossMargin ?? 0;
  const npm = f.netProfitMargin ?? 0;
  
  if (roe > 20) score.profitability += 15;
  else if (roe > 15) score.profitability += 10;
  else if (roe > 10) score.profitability += 5;

  if (grossMargin > 40) score.profitability += 10;
  else if (grossMargin > 25) score.profitability += 7;
  else if (grossMargin > 15) score.profitability += 4;

  if (npm > 15) score.profitability += 5;
  else if (npm > 10) score.profitability += 3;

  // 成长性评分 (25%)
  const revGrowth = f.revenueYoY ?? 0;
  if (revGrowth > 20) score.growth = 25;
  else if (revGrowth > 10) score.growth = 18;
  else if (revGrowth > 5) score.growth = 12;
  else if (revGrowth > 0) score.growth = 6;

  // 财务健康评分 (25%)
  const debtRatio = f.debtRatio ?? 0;
  if (debtRatio < 30) score.financialHealth = 25;
  else if (debtRatio < 50) score.financialHealth = 18;
  else if (debtRatio < 70) score.financialHealth = 12;

  // 估值合理性 (20%)
  const pb = f.pb ?? 0;
  if (pb > 0 && pb < 3) score.efficiency = 20;
  else if (pb < 5) score.efficiency = 15;
  else if (pb < 10) score.efficiency = 10;

  // 总分
  score.total = score.profitability + score.growth + score.financialHealth + score.efficiency;
  
  if (score.total >= 80) score.grade = "A";
  else if (score.total >= 70) score.grade = "B";
  else if (score.total >= 60) score.grade = "C";
  else score.grade = "D";

  return {
    symbol: stock.symbol,
    name: stock.name,
    healthScore: score.total,
    grade: score.grade,
    categories: {
      profitability: { score: score.profitability, max: 30 },
      growth: { score: score.growth, max: 25 },
      financialHealth: { score: score.financialHealth, max: 25 },
      efficiency: { score: score.efficiency, max: 20 },
    },
    riskFactors: assessRiskFactors(f),
    recommendation: generateHealthRecommendation(score),
  };
}

/**
 * 评估风险因素
 */
function assessRiskFactors(finance) {
  const risks = [];
  
  if (finance.debtRatio > 60) risks.push("资产负债率偏高");
  if (finance.grossMargin < 15) risks.push("毛利率偏低");
  if (finance.revenueYoY < 0) risks.push("营收负增长");
  if (finance.pb > 8) risks.push("估值偏高");
  if (finance.roe < 5) risks.push("ROE 偏低");

  return risks.length ? risks : ["暂无显著风险"];
}

/**
 * 生成健康度建议
 */
function generateHealthRecommendation(score) {
  if (score.grade === "A") return "财务健康度优秀，适合长期持有";
  if (score.grade === "B") return "财务健康度良好，可关注";
  if (score.grade === "C") return "财务健康度一般，需谨慎";
  return "财务健康度较差，建议回避";
}

/**
 * 深度分析接口
 */
export async function deepAnalyze(targetSymbol, candidates, sector) {
  // 1. 可比公司分析
  const comps = await buildCompsAnalysis(targetSymbol, candidates);
  
  // 2. 财务健康度评估
  const healthAssessments = candidates.map(assessFinancialHealth);
  
  // 3. 生成综合建议
  const targetHealth = healthAssessments.find(h => h.symbol === targetSymbol);
  const recommendation = {
    target: targetSymbol,
    compsSummary: comps.analysis,
    healthAssessment: targetHealth,
    peerComparison: generatePeerComparison(comps, targetHealth),
  };

  return {
    comps,
    healthAssessments,
    recommendation,
  };
}

/**
 * 生成同行对比摘要
 */
function generatePeerComparison(comps, health) {
  const stats = comps.statistics;
  const target = comps.target;
  
  const comparisons = [];
  
  if (stats.grossMargin) {
    const targetRank = rankAmongPeers(target.finance.grossMargin, 
      comps.peers.map(p => p.finance.grossMargin));
    comparisons.push(`毛利率排名：第 ${targetRank} 位`);
  }
  
  if (stats.roe) {
    const targetRank = rankAmongPeers(target.finance.roe,
      comps.peers.map(p => p.finance.roe));
    comparisons.push(`ROE 排名：第 ${targetRank} 位`);
  }

  return {
    summary: comparisons.join("；"),
    grade: health.grade,
    score: health.healthScore,
  };
}

/**
 * 计算排名
 */
function rankAmongPeers(targetValue, peerValues) {
  const all = [...peerValues, targetValue].sort((a, b) => b - a);
  return all.indexOf(targetValue) + 1;
}
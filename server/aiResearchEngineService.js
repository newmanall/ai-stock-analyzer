/**
 * AI研判分析引擎 - 基于Anthropic Financial Services框架
 * 
 * 参考框架：
 * - earnings-analysis: 财报分析（8-12页机构级报告）
 * - competitive-analysis: 竞争格局分析
 * - sector-overview: 板块深度分析
 * - thesis-tracker: 投资论点追踪
 */

import { saveResearchReport, saveInvestmentThesis } from './supabase.js';

// ==================== 1. 行业关键指标定义 ====================
const INDUSTRY_METRICS = {
  '半导体': {
    key: ['营收增速', '毛利率', '研发费用率', '产能利用率', 'ASP趋势'],
    moat: ['技术壁垒', '专利数量', '客户粘性', '制程领先'],
    risks: ['周期波动', '地缘政治', '技术替代', '产能过剩']
  },
  '新能源': {
    key: ['出货量增速', '毛利率', '产能规划', '技术路线', '客户集中度'],
    moat: ['技术路线', '成本优势', '客户绑定', '产能规模'],
    risks: ['补贴退坡', '技术迭代', '原材料价格', '产能过剩']
  },
  '消费电子': {
    key: ['营收增速', '毛利率', '库存周转', '新品周期', '市场份额'],
    moat: ['品牌', '渠道', '生态', '供应链'],
    risks: ['需求疲软', '竞争加剧', '技术替代', '库存减值']
  },
  '医药生物': {
    key: ['营收增速', '毛利率', '研发费用率', '管线进度', '专利到期'],
    moat: ['研发管线', '专利壁垒', '销售网络', '审批优势'],
    risks: ['集采降价', '研发失败', '专利到期', '政策风险']
  },
  '金融': {
    key: ['净息差', '不良率', '拨备覆盖率', 'ROE', '资本充足率'],
    moat: ['客户基础', '风控能力', '牌照壁垒', '科技投入'],
    risks: ['信用风险', '利率风险', '监管收紧', '金融科技冲击']
  },
  'default': {
    key: ['营收增速', '毛利率', '净利率', 'ROE', '现金流'],
    moat: ['品牌', '规模', '技术', '网络效应'],
    risks: ['竞争', '周期', '政策', '技术']
  }
};

// ==================== 2. 竞争格局分析 ====================
export function analyzeCompetitiveLandscape(stock, peers) {
  const industry = stock.sector || 'default';
  const metrics = INDUSTRY_METRICS[industry] || INDUSTRY_METRICS.default;
  
  // 计算行业排名
  const rankings = {};
  metrics.key.forEach(metric => {
    const values = peers.map(p => p[metric] || 0);
    const stockValue = stock[metric] || 0;
    const sorted = [...values].sort((a, b) => b - a);
    const rank = sorted.indexOf(stockValue) + 1;
    rankings[metric] = {
      value: stockValue,
      rank: rank,
      total: peers.length,
      percentile: ((peers.length - rank) / peers.length * 100).toFixed(1),
      industryAvg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      leader: Math.max(...values)
    };
  });

  // 护城河评估
  const moatAssessment = metrics.moat.map(moat => ({
    dimension: moat,
    strength: assessMoatStrength(stock, moat, peers),
    evidence: getMoatEvidence(stock, moat)
  }));

  // 竞争定位
  const positioning = determinePositioning(rankings, peers.length);

  return {
    industry,
    rankings,
    moatAssessment,
    positioning,
    competitiveAdvantage: calculateCompetitiveAdvantage(rankings),
    vulnerabilityScore: calculateVulnerabilityScore(stock, metrics.risks)
  };
}

function assessMoatStrength(stock, moat, peers) {
  // 基于具体指标评估护城河强度
  const moatMap = {
    '技术壁垒': () => stock.rdRatio > 10 ? 'strong' : stock.rdRatio > 5 ? 'moderate' : 'weak',
    '品牌': () => stock.grossMargin > 40 ? 'strong' : stock.grossMargin > 25 ? 'moderate' : 'weak',
    '规模': () => stock.revenue > 100 ? 'strong' : stock.revenue > 50 ? 'moderate' : 'weak',
    '成本优势': () => stock.grossMargin > 35 ? 'strong' : stock.grossMargin > 20 ? 'moderate' : 'weak',
    '网络效应': () => stock.revenueGrowth > 30 ? 'strong' : stock.revenueGrowth > 15 ? 'moderate' : 'weak',
    '客户粘性': () => stock.revenueGrowth > 20 ? 'strong' : stock.revenueGrowth > 10 ? 'moderate' : 'weak',
    '专利壁垒': () => stock.rdRatio > 8 ? 'strong' : stock.rdRatio > 4 ? 'moderate' : 'weak',
    '渠道': () => stock.revenueGrowth > 25 ? 'strong' : stock.revenueGrowth > 12 ? 'moderate' : 'weak',
    '生态': () => stock.grossMargin > 30 ? 'strong' : stock.grossMargin > 20 ? 'moderate' : 'weak',
    '供应链': () => stock.grossMargin > 25 ? 'strong' : stock.grossMargin > 15 ? 'moderate' : 'weak',
    '研发管线': () => stock.rdRatio > 15 ? 'strong' : stock.rdRatio > 8 ? 'moderate' : 'weak',
    '销售网络': () => stock.revenueGrowth > 20 ? 'strong' : stock.revenueGrowth > 10 ? 'moderate' : 'weak',
    '审批优势': () => stock.rdRatio > 10 ? 'strong' : stock.rdRatio > 5 ? 'moderate' : 'weak',
    '客户基础': () => stock.revenue > 200 ? 'strong' : stock.revenue > 100 ? 'moderate' : 'weak',
    '风控能力': () => stock.netProfitMargin > 15 ? 'strong' : stock.netProfitMargin > 8 ? 'moderate' : 'weak',
    '牌照壁垒': () => 'strong', // 牌照本身就是壁垒
    '科技投入': () => stock.rdRatio > 5 ? 'strong' : stock.rdRatio > 3 ? 'moderate' : 'weak',
    '产能规模': () => stock.revenue > 80 ? 'strong' : stock.revenue > 40 ? 'moderate' : 'weak',
    '客户绑定': () => stock.revenueGrowth > 15 ? 'strong' : stock.revenueGrowth > 8 ? 'moderate' : 'weak',
    '技术路线': () => stock.rdRatio > 8 ? 'strong' : stock.rdRatio > 4 ? 'moderate' : 'weak',
    '制程领先': () => stock.rdRatio > 12 ? 'strong' : stock.rdRatio > 6 ? 'moderate' : 'weak',
    '专利数量': () => stock.rdRatio > 8 ? 'strong' : stock.rdRatio > 4 ? 'moderate' : 'weak',
    '客户集中度': () => stock.revenueGrowth > 20 ? 'strong' : stock.revenueGrowth > 10 ? 'moderate' : 'weak',
    '库存周转': () => stock.grossMargin > 25 ? 'strong' : stock.grossMargin > 15 ? 'moderate' : 'weak',
    '新品周期': () => stock.rdRatio > 6 ? 'strong' : stock.rdRatio > 3 ? 'moderate' : 'weak',
    '市场份额': () => stock.revenueGrowth > 20 ? 'strong' : stock.revenueGrowth > 10 ? 'moderate' : 'weak'
  };

  return moatMap[moat] ? moatMap[moat]() : 'moderate';
}

function getMoatEvidence(stock, moat) {
  const evidenceMap = {
    '技术壁垒': `研发费用率 ${stock.rdRatio?.toFixed(1)}%`,
    '品牌': `毛利率 ${stock.grossMargin?.toFixed(1)}%`,
    '规模': `营收 ${stock.revenue?.toFixed(1)}亿`,
    '成本优势': `毛利率 ${stock.grossMargin?.toFixed(1)}%`,
    '网络效应': `营收增速 ${stock.revenueGrowth?.toFixed(1)}%`,
    '客户粘性': `营收增速 ${stock.revenueGrowth?.toFixed(1)}%`,
    '专利壁垒': `研发费用率 ${stock.rdRatio?.toFixed(1)}%`,
    '渠道': `营收增速 ${stock.revenueGrowth?.toFixed(1)}%`,
    '生态': `毛利率 ${stock.grossMargin?.toFixed(1)}%`,
    '供应链': `毛利率 ${stock.grossMargin?.toFixed(1)}%`,
    '研发管线': `研发费用率 ${stock.rdRatio?.toFixed(1)}%`,
    '销售网络': `营收增速 ${stock.revenueGrowth?.toFixed(1)}%`,
    '审批优势': `研发费用率 ${stock.rdRatio?.toFixed(1)}%`,
    '客户基础': `营收 ${stock.revenue?.toFixed(1)}亿`,
    '风控能力': `净利率 ${stock.netProfitMargin?.toFixed(1)}%`,
    '牌照壁垒': '持牌经营',
    '科技投入': `研发费用率 ${stock.rdRatio?.toFixed(1)}%`,
    '产能规模': `营收 ${stock.revenue?.toFixed(1)}亿`,
    '客户绑定': `营收增速 ${stock.revenueGrowth?.toFixed(1)}%`,
    '技术路线': `研发费用率 ${stock.rdRatio?.toFixed(1)}%`,
    '制程领先': `研发费用率 ${stock.rdRatio?.toFixed(1)}%`,
    '专利数量': `研发费用率 ${stock.rdRatio?.toFixed(1)}%`,
    '客户集中度': `营收增速 ${stock.revenueGrowth?.toFixed(1)}%`,
    '库存周转': `毛利率 ${stock.grossMargin?.toFixed(1)}%`,
    '新品周期': `研发费用率 ${stock.rdRatio?.toFixed(1)}%`,
    '市场份额': `营收增速 ${stock.revenueGrowth?.toFixed(1)}%`
  };

  return evidenceMap[moat] || '数据待验证';
}

function determinePositioning(rankings, totalPeers) {
  const avgPercentile = Object.values(rankings).reduce((sum, r) => sum + parseFloat(r.percentile), 0) / Object.keys(rankings).length;
  
  if (avgPercentile >= 80) return { tier: '领导者', description: '在行业中处于领先地位，多项指标排名前20%' };
  if (avgPercentile >= 60) return { tier: '挑战者', description: '具备较强竞争力，部分指标接近行业领先水平' };
  if (avgPercentile >= 40) return { tier: '跟随者', description: '处于行业中游，需关注差异化竞争策略' };
  return { tier: '追赶者', description: '多项指标落后于行业平均，需关注改善路径' };
}

function calculateCompetitiveAdvantage(rankings) {
  const strongCount = Object.values(rankings).filter(r => parseFloat(r.percentile) >= 70).length;
  const totalCount = Object.keys(rankings).length;
  const ratio = strongCount / totalCount;
  
  if (ratio >= 0.7) return { level: '显著优势', score: 85, detail: `${strongCount}/${totalCount} 项指标处于行业前30%` };
  if (ratio >= 0.4) return { level: '中等优势', score: 60, detail: `${strongCount}/${totalCount} 项指标处于行业前30%` };
  return { level: '优势不足', score: 35, detail: `仅 ${strongCount}/${totalCount} 项指标处于行业前30%` };
}

function calculateVulnerabilityScore(stock, risks) {
  // 基于风险因素评估脆弱性
  let score = 0;
  const riskFactors = {
    '周期波动': () => stock.revenueGrowth < 10 ? 20 : stock.revenueGrowth < 20 ? 10 : 0,
    '竞争加剧': () => stock.grossMargin < 20 ? 20 : stock.grossMargin < 30 ? 10 : 0,
    '政策风险': () => 10, // 默认中等风险
    '技术替代': () => stock.rdRatio < 3 ? 20 : stock.rdRatio < 5 ? 10 : 0,
    '需求疲软': () => stock.revenueGrowth < 5 ? 20 : stock.revenueGrowth < 15 ? 10 : 0,
    '原材料价格': () => stock.grossMargin < 25 ? 15 : stock.grossMargin < 35 ? 8 : 0,
    '补贴退坡': () => stock.netProfitMargin < 5 ? 15 : stock.netProfitMargin < 10 ? 8 : 0,
    '产能过剩': () => stock.grossMargin < 20 ? 15 : stock.grossMargin < 30 ? 8 : 0,
    '库存减值': () => stock.grossMargin < 25 ? 15 : stock.grossMargin < 35 ? 8 : 0,
    '集采降价': () => stock.grossMargin < 30 ? 20 : stock.grossMargin < 40 ? 10 : 0,
    '研发失败': () => stock.rdRatio > 15 ? 15 : stock.rdRatio > 10 ? 8 : 0,
    '专利到期': () => stock.rdRatio < 5 ? 15 : stock.rdRatio < 8 ? 8 : 0,
    '信用风险': () => stock.netProfitMargin < 8 ? 15 : stock.netProfitMargin < 15 ? 8 : 0,
    '利率风险': () => 10,
    '监管收紧': () => 10,
    '金融科技冲击': () => stock.rdRatio < 3 ? 15 : stock.rdRatio < 5 ? 8 : 0,
    '地缘政治': () => 10,
    '技术迭代': () => stock.rdRatio < 5 ? 15 : stock.rdRatio < 8 ? 8 : 0
  };

  risks.forEach(risk => {
    if (riskFactors[risk]) {
      score += riskFactors[risk]();
    }
  });

  return {
    score: Math.min(score, 100),
    level: score >= 60 ? '高脆弱性' : score >= 30 ? '中等脆弱性' : '低脆弱性',
    factors: risks
  };
}

// ==================== 3. 投资论点构建 ====================
export function buildInvestmentThesis(stock, competitiveAnalysis, technicalAnalysis, financialAnalysis) {
  // 构建投资论点支柱
  const pillars = [];
  
  // 支柱1：竞争地位
  if (competitiveAnalysis.competitiveAdvantage.score >= 60) {
    pillars.push({
      title: '竞争壁垒',
      description: `${competitiveAnalysis.positioning.tier}地位，${competitiveAnalysis.competitiveAdvantage.detail}`,
      strength: 'strong',
      evidence: competitiveAnalysis.moatAssessment.filter(m => m.strength === 'strong').map(m => m.evidence)
    });
  }

  // 支柱2：成长性
  if (stock.revenueGrowth > 20) {
    pillars.push({
      title: '高成长性',
      description: `营收增速 ${stock.revenueGrowth.toFixed(1)}%，显著高于行业平均`,
      strength: 'strong',
      evidence: [`营收增速: ${stock.revenueGrowth.toFixed(1)}%`, `行业排名: ${competitiveAnalysis.rankings['营收增速']?.percentile}%分位`]
    });
  } else if (stock.revenueGrowth > 10) {
    pillars.push({
      title: '稳健增长',
      description: `营收增速 ${stock.revenueGrowth.toFixed(1)}%，保持稳定增长态势`,
      strength: 'moderate',
      evidence: [`营收增速: ${stock.revenueGrowth.toFixed(1)}%`]
    });
  }

  // 支柱3：盈利能力
  if (stock.grossMargin > 30 && stock.netProfitMargin > 15) {
    pillars.push({
      title: '盈利质量优异',
      description: `毛利率 ${stock.grossMargin.toFixed(1)}%，净利率 ${stock.netProfitMargin.toFixed(1)}%`,
      strength: 'strong',
      evidence: [`毛利率: ${stock.grossMargin.toFixed(1)}%`, `净利率: ${stock.netProfitMargin.toFixed(1)}%`]
    });
  }

  // 支柱4：技术面支撑
  if (technicalAnalysis?.trend === 'up' || technicalAnalysis?.signal === 'buy') {
    pillars.push({
      title: '技术面共振',
      description: '技术指标与基本面形成共振，趋势向好',
      strength: 'moderate',
      evidence: [technicalAnalysis?.summary || '技术面偏多']
    });
  }

  // 构建风险清单
  const risks = competitiveAnalysis.vulnerabilityScore.factors.map(factor => ({
    risk: factor,
    probability: 'medium',
    impact: 'medium',
    mitigation: `持续跟踪${factor}变化，设置止损位`
  }));

  // 构建催化剂
  const catalysts = [];
  if (stock.revenueGrowth > 20) {
    catalysts.push({ catalyst: '业绩超预期', timeline: '下季度', expected_impact: 'positive' });
  }
  if (stock.rdRatio > 8) {
    catalysts.push({ catalyst: '新产品/技术突破', timeline: '6-12个月', expected_impact: 'positive' });
  }
  if (competitiveAnalysis.positioning.tier === '领导者') {
    catalysts.push({ catalyst: '行业集中度提升', timeline: '中长期', expected_impact: 'positive' });
  }

  // 确定投资建议
  let recommendation = 'hold';
  let targetPrice = null;
  
  const strongPillars = pillars.filter(p => p.strength === 'strong').length;
  const totalScore = competitiveAnalysis.competitiveAdvantage.score + 
                     (stock.revenueGrowth > 20 ? 20 : stock.revenueGrowth > 10 ? 10 : 0) +
                     (stock.grossMargin > 30 ? 15 : stock.grossMargin > 20 ? 8 : 0) +
                     (stock.netProfitMargin > 15 ? 15 : stock.netProfitMargin > 8 ? 8 : 0);

  if (totalScore >= 80 && strongPillars >= 2) {
    recommendation = 'buy';
    targetPrice = stock.price * 1.3; // 30%上涨空间
  } else if (totalScore >= 50 && strongPillars >= 1) {
    recommendation = 'hold';
    targetPrice = stock.price * 1.1; // 10%上涨空间
  } else {
    recommendation = 'sell';
    targetPrice = stock.price * 0.9; // 10%下跌空间
  }

  return {
    symbol: stock.symbol,
    name: stock.name,
    thesisStatement: `${stock.name}(${stock.symbol}) - ${competitiveAnalysis.positioning.tier}地位，${pillars.map(p => p.title).join('、')}`,
    pillars,
    risks,
    catalysts,
    targetPrice: targetPrice?.toFixed(2),
    recommendation,
    totalScore,
    competitivePosition: competitiveAnalysis.positioning.tier
  };
}

// ==================== 4. 板块深度分析 ====================
export function analyzeSector(sector, stocks) {
  const metrics = INDUSTRY_METRICS[sector] || INDUSTRY_METRICS.default;
  
  // 板块整体统计
  const sectorStats = {
    avgRevenueGrowth: 0,
    avgGrossMargin: 0,
    avgNetProfitMargin: 0,
    avgROE: 0,
    totalMarketCap: 0,
    stockCount: stocks.length
  };

  stocks.forEach(s => {
    sectorStats.avgRevenueGrowth += (s.revenueGrowth || 0);
    sectorStats.avgGrossMargin += (s.grossMargin || 0);
    sectorStats.avgNetProfitMargin += (s.netProfitMargin || 0);
    sectorStats.avgROE += (s.roe || 0);
    sectorStats.totalMarketCap += (s.marketCap || 0);
  });

  sectorStats.avgRevenueGrowth /= stocks.length;
  sectorStats.avgGrossMargin /= stocks.length;
  sectorStats.avgNetProfitMargin /= stocks.length;
  sectorStats.avgROE /= stocks.length;

  // 板块龙头识别
  const leaders = stocks
    .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    .slice(0, 3)
    .map(s => ({
      symbol: s.symbol,
      name: s.name,
      marketCap: s.marketCap,
      revenueGrowth: s.revenueGrowth,
      grossMargin: s.grossMargin
    }));

  // 板块投资逻辑
  const investmentLogic = buildSectorInvestmentLogic(sector, sectorStats, metrics);

  return {
    sector,
    stats: sectorStats,
    leaders,
    keyMetrics: metrics.key,
    moatFactors: metrics.moat,
    riskFactors: metrics.risks,
    investmentLogic,
    topPicks: leaders.slice(0, 2).map(l => l.symbol)
  };
}

function buildSectorInvestmentLogic(sector, stats, metrics) {
  const logic = {
    bullCase: [],
    bearCase: [],
    keyDebate: ''
  };

  if (stats.avgRevenueGrowth > 20) {
    logic.bullCase.push(`${sector}板块整体营收增速 ${stats.avgRevenueGrowth.toFixed(1)}%，处于高景气周期`);
  } else if (stats.avgRevenueGrowth > 10) {
    logic.bullCase.push(`${sector}板块营收增速稳健，行业需求稳定`);
  } else {
    logic.bearCase.push(`${sector}板块营收增速仅 ${stats.avgRevenueGrowth.toFixed(1)}%，行业增长乏力`);
  }

  if (stats.avgGrossMargin > 30) {
    logic.bullCase.push(`板块平均毛利率 ${stats.avgGrossMargin.toFixed(1)}%，盈利质量较好`);
  } else {
    logic.bearCase.push(`板块平均毛利率 ${stats.avgGrossMargin.toFixed(1)}%，盈利空间有限`);
  }

  if (stats.avgROE > 15) {
    logic.bullCase.push(`板块平均ROE ${stats.avgROE.toFixed(1)}%，资本回报率优秀`);
  }

  logic.keyDebate = `${sector}板块当前核心矛盾：${metrics.risks.slice(0, 2).join(' vs ')}`;

  return logic;
}

// ==================== 5. 综合研判报告生成 ====================
export async function generateResearchReport(stock, peers, technicalAnalysis, financialAnalysis) {
  const reportId = `report_${stock.symbol}_${Date.now()}`;
  
  // 1. 竞争格局分析
  const competitiveAnalysis = analyzeCompetitiveLandscape(stock, peers);
  
  // 2. 投资论点构建
  const thesis = buildInvestmentThesis(stock, competitiveAnalysis, technicalAnalysis, financialAnalysis);
  
  // 3. 板块分析
  const sectorAnalysis = analyzeSector(stock.sector, peers);
  
  // 4. 构建完整报告
  const report = {
    reportId,
    sector: stock.sector,
    reportType: 'comprehensive',
    generatedAt: new Date().toISOString(),
    
    // 执行摘要
    executiveSummary: {
      recommendation: thesis.recommendation,
      targetPrice: thesis.targetPrice,
      currentPrice: stock.price,
      upside: thesis.targetPrice ? ((thesis.targetPrice - stock.price) / stock.price * 100).toFixed(1) + '%' : 'N/A',
      thesisStatement: thesis.thesisStatement,
      keyTakeaways: [
        `竞争地位: ${competitiveAnalysis.positioning.tier}`,
        `竞争优势: ${competitiveAnalysis.competitiveAdvantage.level}(${competitiveAnalysis.competitiveAdvantage.score}分)`,
        `脆弱性: ${competitiveAnalysis.vulnerabilityScore.level}(${competitiveAnalysis.vulnerabilityScore.score}分)`,
        `投资建议: ${thesis.recommendation === 'buy' ? '增持' : thesis.recommendation === 'hold' ? '持有' : '减持'}`
      ]
    },
    
    // 竞争格局分析
    competitiveAnalysis: {
      positioning: competitiveAnalysis.positioning,
      advantage: competitiveAnalysis.competitiveAdvantage,
      vulnerability: competitiveAnalysis.vulnerabilityScore,
      moatAssessment: competitiveAnalysis.moatAssessment,
      rankings: Object.entries(competitiveAnalysis.rankings).map(([metric, data]) => ({
        metric,
        value: data.value,
        rank: `${data.rank}/${data.total}`,
        percentile: data.percentile + '%',
        industryAvg: data.industryAvg,
        leader: data.leader
      }))
    },
    
    // 投资论点
    investmentThesis: {
      statement: thesis.thesisStatement,
      pillars: thesis.pillars,
      risks: thesis.risks,
      catalysts: thesis.catalysts,
      recommendation: thesis.recommendation,
      targetPrice: thesis.targetPrice,
      totalScore: thesis.totalScore
    },
    
    // 板块分析
    sectorAnalysis: {
      stats: sectorAnalysis.stats,
      leaders: sectorAnalysis.leaders,
      investmentLogic: sectorAnalysis.investmentLogic,
      keyMetrics: sectorAnalysis.keyMetrics,
      riskFactors: sectorAnalysis.riskFactors
    },
    
    // 技术面分析
    technicalAnalysis: technicalAnalysis || {},
    
    // 财务分析
    financialAnalysis: financialAnalysis || {},
    
    // 风险收益分析
    riskReward: {
      bullCase: {
        probability: '30%',
        driver: thesis.catalysts.slice(0, 2).map(c => c.catalyst).join('、'),
        targetReturn: '+30%'
      },
      baseCase: {
        probability: '50%',
        driver: '当前趋势延续',
        targetReturn: thesis.recommendation === 'buy' ? '+15%' : '+5%'
      },
      bearCase: {
        probability: '20%',
        driver: thesis.risks.slice(0, 2).map(r => r.risk).join('、'),
        targetReturn: '-15%'
      }
    }
  };

  // 5. 保存到数据库
  try {
    await saveResearchReport({
      reportId,
      sector: stock.sector,
      reportType: 'comprehensive',
      content: report,
      summary: thesis.thesisStatement,
      topPicks: sectorAnalysis.topPicks
    });

    await saveInvestmentThesis({
      symbol: stock.symbol,
      name: stock.name,
      thesisStatement: thesis.thesisStatement,
      pillars: thesis.pillars,
      risks: thesis.risks,
      catalysts: thesis.catalysts,
      targetPrice: thesis.targetPrice,
      recommendation: thesis.recommendation
    });
  } catch (error) {
    console.warn('Failed to save report to Supabase:', error.message);
  }

  return report;
}

// ==================== 6. 快速研判（1页摘要） ====================
export function generateQuickAnalysis(stock, competitiveAnalysis, thesis) {
  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    price: stock.price,
    
    // 核心结论
    recommendation: thesis.recommendation === 'buy' ? '增持' : thesis.recommendation === 'hold' ? '持有' : '减持',
    targetPrice: thesis.targetPrice,
    upside: thesis.targetPrice ? ((thesis.targetPrice - stock.price) / stock.price * 100).toFixed(1) + '%' : 'N/A',
    
    // 一句话总结
    oneLiner: thesis.thesisStatement,
    
    // 关键指标
    keyMetrics: {
      营收增速: stock.revenueGrowth?.toFixed(1) + '%',
      毛利率: stock.grossMargin?.toFixed(1) + '%',
      净利率: stock.netProfitMargin?.toFixed(1) + '%',
      ROE: stock.roe?.toFixed(1) + '%',
      竞争地位: competitiveAnalysis.positioning.tier,
      竞争优势: competitiveAnalysis.competitiveAdvantage.level,
      脆弱性: competitiveAnalysis.vulnerabilityScore.level
    },
    
    // 核心逻辑
    bullPoints: thesis.pillars.filter(p => p.strength === 'strong').map(p => p.description),
    riskPoints: thesis.risks.slice(0, 3).map(r => r.risk),
    catalysts: thesis.catalysts.map(c => c.catalyst)
  };
}
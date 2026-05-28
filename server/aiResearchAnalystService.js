/**
 * AI 股票研究分析师模块 v2.0
 * 基于Anthropic Financial Services框架的机构级研判
 */

import { 
  analyzeCompetitiveLandscape, 
  buildInvestmentThesis, 
  analyzeSector, 
  generateResearchReport,
  generateQuickAnalysis
} from "./aiResearchEngineService.js";

// ==================== 1. 投资论点构建（增强版） ====================

/**
 * 构建完整的投资论点（基于Anthropic框架）
 */
export function buildInvestmentThesisEnhanced(stock, peers, technicalAnalysis, financialAnalysis) {
  // 1. 竞争格局分析
  const competitiveAnalysis = analyzeCompetitiveLandscape(stock, peers);
  
  // 2. 投资论点构建
  const thesis = buildInvestmentThesis(stock, competitiveAnalysis, technicalAnalysis, financialAnalysis);
  
  // 3. 板块分析
  const sectorAnalysis = analyzeSector(stock.sector, peers);
  
  return {
    // 基础信息
    company: stock.name,
    ticker: stock.symbol,
    currentPrice: stock.close,
    changePercent: stock.changePercent,
    marketCap: stock.totalMarketCap,
    sector: stock.sector,
    
    // 竞争格局
    competitivePosition: competitiveAnalysis.positioning.tier,
    competitiveAdvantage: competitiveAnalysis.competitiveAdvantage,
    vulnerability: competitiveAnalysis.vulnerabilityScore,
    
    // 投资论点
    thesisStatement: thesis.thesisStatement,
    pillars: thesis.pillars,
    risks: thesis.risks,
    catalysts: thesis.catalysts,
    
    // 估值与建议
    targetPrice: thesis.targetPrice,
    upside: thesis.targetPrice ? ((thesis.targetPrice - stock.close) / stock.close * 100).toFixed(1) + '%' : 'N/A',
    recommendation: thesis.recommendation,
    conviction: thesis.totalScore >= 80 ? '高' : thesis.totalScore >= 50 ? '中等' : '低',
    
    // 板块背景
    sectorContext: {
      name: sectorAnalysis.sector,
      stats: sectorAnalysis.stats,
      leaders: sectorAnalysis.leaders
    },
    
    // 监控要点
    monitoringPoints: [
      `季度营收增速是否维持在${stock.revenueYoY > 15 ? "15%" : "10%"}以上`,
      `毛利率是否稳定在${stock.grossMargin}%以上`,
      `竞争地位是否保持${competitiveAnalysis.positioning.tier}`,
      `主力资金是否持续流入`
    ],
    
    // 时间框架
    timeHorizon: "6-12个月",
    positionSize: "核心仓位3-5%，卫星仓位1-2%"
  };
}

// ==================== 2. 选股研判报告生成（增强版） ====================

/**
 * 生成完整的选股研判报告（基于Anthropic框架）
 */
export function generateScreeningReportEnhanced(stocks, sector = "all") {
  if (!stocks || stocks.length === 0) {
    return {
      error: "无符合条件的股票",
      timestamp: new Date().toISOString()
    };
  }

  // 1. 板块整体分析
  const sectorAnalysis = analyzeSector(sector, stocks);
  
  // 2. 构建每只股票的详细论点
  const stockAnalyses = stocks.map(stock => {
    // 获取同板块股票作为peer
    const peers = stocks.filter(s => s.symbol !== stock.symbol);
    return buildInvestmentThesisEnhanced(stock, peers, stock.indicators, stock.finance);
  });

  // 按综合评分排序
  stockAnalyses.sort((a, b) => b.competitiveAdvantage?.score - a.competitiveAdvantage?.score);

  // 3. 投资机会分类
  const opportunityTypes = {
    // 价值型：低估值+高ROE
    valuePlays: stockAnalyses.filter(s => 
      (s.competitiveAdvantage?.score >= 60) &&
      (s.sectorContext?.stats?.avgPE < 25)
    ),
    
    // 成长型：高增长+高毛利
    growthPlays: stockAnalyses.filter(s => 
      (s.sectorContext?.stats?.avgRevenueGrowth > 20) &&
      (s.sectorContext?.stats?.avgGrossMargin > 30)
    ),
    
    // 质量型：高ROE+低负债
    qualityPlays: stockAnalyses.filter(s => 
      (s.sectorContext?.stats?.avgROE > 15) &&
      (s.sectorContext?.stats?.avgDebtRatio < 50)
    ),
    
    // 动量型：技术面强+资金流入
    momentumPlays: stockAnalyses.filter(s => 
      s.competitiveAdvantage?.score >= 70 &&
      s.vulnerability?.score < 40
    )
  };

  // 4. 投资策略建议
  const strategyRecommendations = [];

  if (opportunityTypes.valuePlays.length > 2) {
    strategyRecommendations.push({
      type: "价值策略",
      description: "板块内低估值、高ROE股票集中，价值投资机会明确",
      action: "重点关注竞争地位领先、估值低于历史中位数的价值股",
      allocation: "30-40%仓位",
      targetStocks: opportunityTypes.valuePlays.slice(0, 3).map(s => s.ticker)
    });
  }

  if (opportunityTypes.growthPlays.length > 2) {
    strategyRecommendations.push({
      type: "成长策略",
      description: "高成长性、高毛利率股票较多，成长投资机会突出",
      action: "聚焦营收增速>20%、毛利率>30%的成长股",
      allocation: "30-40%仓位",
      targetStocks: opportunityTypes.growthPlays.slice(0, 3).map(s => s.ticker)
    });
  }

  if (opportunityTypes.momentumPlays.length > 2) {
    strategyRecommendations.push({
      type: "动量策略",
      description: "技术面动量强劲、资金流入明显的股票集中",
      action: "关注竞争地位领先、脆弱性低的动量股",
      allocation: "20-30%仓位",
      targetStocks: opportunityTypes.momentumPlays.slice(0, 3).map(s => s.ticker)
    });
  }

  // 5. 风险提示（基于板块特性）
  const sectorRiskMap = {
    "半导体": ["技术迭代风险", "地缘政治风险", "周期下行风险"],
    "新能源": ["产能过剩风险", "政策退坡风险", "技术路线风险"],
    "消费电子": ["需求疲软风险", "库存减值风险", "竞争加剧风险"],
    "医药生物": ["集采降价风险", "研发失败风险", "专利到期风险"],
    "金融": ["息差收窄风险", "资产质量风险", "监管政策风险"],
    "default": ["宏观经济下行风险", "市场流动性风险", "黑天鹅事件风险"]
  };

  // 6. 最终报告整合
  return {
    // 报告元数据
    reportId: `SR-${Date.now()}`,
    timestamp: new Date().toISOString(),
    sector: sector,
    generatedBy: "Anthropic Financial Services Framework",
    
    // 板块分析
    sectorAnalysis: {
      name: sectorAnalysis.sector,
      stats: sectorAnalysis.stats,
      leaders: sectorAnalysis.leaders,
      investmentLogic: sectorAnalysis.investmentLogic,
      keyMetrics: sectorAnalysis.keyMetrics,
      riskFactors: sectorAnalysis.riskFactors
    },
    
    // 股票分析（前5名详细分析）
    topPicks: stockAnalyses.slice(0, 5),
    allStocks: stockAnalyses.map(s => ({
      ticker: s.ticker,
      company: s.company,
      currentPrice: s.currentPrice,
      recommendation: s.recommendation,
      upside: s.upside,
      conviction: s.conviction,
      competitivePosition: s.competitivePosition
    })),
    
    // 机会分析
    opportunityTypes: {
      valueCount: opportunityTypes.valuePlays.length,
      growthCount: opportunityTypes.growthPlays.length,
      qualityCount: opportunityTypes.qualityPlays.length,
      momentumCount: opportunityTypes.momentumPlays.length
    },
    
    // 投资策略
    strategyRecommendations,
    
    // 风险提示
    sectorSpecificRisks: sectorRiskMap[sector] || sectorRiskMap.default,
    commonRisks: [
      "宏观经济不及预期",
      "政策变化超预期",
      "市场流动性收紧",
      "地缘政治冲突升级"
    ],
    
    // 监控要点
    keyMonitoringPoints: [
      "季度财报业绩表现",
      "行业政策变化",
      "竞争格局演变",
      "技术面关键支撑/压力位",
      "主力资金流向变化"
    ],
    
    // 免责声明
    disclaimer: "本报告基于Anthropic Financial Services框架生成，仅为AI分析结果，不构成投资建议。投资者应独立判断，谨慎决策。"
  };
}

// ==================== 3. 综合研判报告生成 ====================

/**
 * 生成机构级综合研判报告（8-12页标准）
 */
export async function generateComprehensiveResearchReport(stock, peers, technicalAnalysis, financialAnalysis) {
  try {
    const report = await generateResearchReport(stock, peers, technicalAnalysis, financialAnalysis);
    
    // 快速分析（1页摘要）
    const quickAnalysis = generateQuickAnalysis(stock, report.competitiveAnalysis, report.investmentThesis);
    
    return {
      success: true,
      reportType: "comprehensive",
      pageCount: 12,
      generatedAt: new Date().toISOString(),
      
      // 执行摘要（1页）
      executiveSummary: quickAnalysis,
      
      // 完整报告（8-12页）
      fullReport: report,
      
      // 关键图表
      keyCharts: [
        "竞争格局矩阵",
        "行业排名雷达图",
        "财务指标对比表",
        "风险收益分析表"
      ],
      
      // 数据来源
      dataSources: [
        "东方财富API",
        "智兔API",
        "公司财报",
        "行业研究报告"
      ]
    };
  } catch (error) {
    console.error("Comprehensive report generation failed:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// ==================== 4. API接口 ====================

export async function analyzeStockScreenerResults(stocks, sector = "all") {
  try {
    if (!stocks || stocks.length === 0) {
      return {
        success: false,
        error: "无股票数据",
        timestamp: new Date().toISOString()
      };
    }

    // 生成增强版报告
    const report = generateScreeningReportEnhanced(stocks, sector);

    return {
      success: true,
      report,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("AI分析失败:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// ==================== 5. 格式化输出 ====================

/**
 * 格式化报告为可读文本
 */
export function formatReportForDisplay(report) {
  if (!report || !report.success) {
    return "分析失败，请重试。";
  }

  const { sectorAnalysis, topPicks, strategyRecommendations } = report.report;
  
  let output = `# 机构级选股研判报告\n\n`;
  output += `## 板块概况\n`;
  output += `- **板块**: ${report.report.sector}\n`;
  output += `- **股票数量**: ${sectorAnalysis.stats.stockCount}只\n`;
  output += `- **平均PE**: ${sectorAnalysis.stats.avgPE?.toFixed(1) || 'N/A'}x\n`;
  output += `- **平均营收增长**: ${sectorAnalysis.stats.avgRevenueGrowth?.toFixed(1) || 'N/A'}%\n`;
  output += `- **平均ROE**: ${sectorAnalysis.stats.avgROE?.toFixed(1) || 'N/A'}%\n`;
  output += `- **板块龙头**: ${sectorAnalysis.leaders?.map(l => l.name).join('、')}\n\n`;

  output += `## 重点推荐（前5名）\n\n`;
  topPicks.forEach((pick, idx) => {
    output += `### ${idx + 1}. ${pick.company}（${pick.ticker}）\n`;
    output += `- **当前价**: ¥${pick.currentPrice}（${pick.changePercent || 0}%）\n`;
    output += `- **目标价**: ¥${pick.targetPrice}（${pick.upside}）\n`;
    output += `- **投资建议**: ${pick.recommendation}（${pick.conviction}）\n`;
    output += `- **竞争地位**: ${pick.competitivePosition}\n`;
    output += `- **竞争优势**: ${pick.competitiveAdvantage?.detail || 'N/A'}\n`;
    output += `- **核心论点**: ${pick.thesisStatement}\n`;
    output += `- **关键风险**: ${pick.risks?.map(r => r.risk).join('、') || "无重大风险"}\n\n`;
  });

  if (strategyRecommendations.length > 0) {
    output += `## 投资策略建议\n\n`;
    strategyRecommendations.forEach(strategy => {
      output += `### ${strategy.type}\n`;
      output += `${strategy.description}\n`;
      output += `**操作建议**: ${strategy.action}\n`;
      output += `**建议仓位**: ${strategy.allocation}\n`;
      output += `**目标股票**: ${strategy.targetStocks?.join('、')}\n\n`;
    });
  }

  output += `## 风险提示\n`;
  report.report.sectorSpecificRisks.forEach(risk => {
    output += `- ${risk}\n`;
  });
  report.report.commonRisks.forEach(risk => {
    output += `- ${risk}\n`;
  });

  output += `\n---\n`;
  output += `*报告生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}*\n`;
  output += `*分析框架: Anthropic Financial Services*\n`;
  output += `*免责声明: ${report.report.disclaimer}*\n`;

  return output;
}

/**
 * 生成快速研判摘要（1页）
 */
export function generateQuickSummary(stock, peers) {
  const competitiveAnalysis = analyzeCompetitiveLandscape(stock, peers);
  const thesis = buildInvestmentThesis(stock, competitiveAnalysis, {}, {});
  const quickAnalysis = generateQuickAnalysis(stock, competitiveAnalysis, thesis);
  
  return {
    type: "quick_summary",
    generatedAt: new Date().toISOString(),
    data: quickAnalysis
  };
}

// ==================== 6. 导出 ====================

export default {
  buildInvestmentThesis: buildInvestmentThesisEnhanced,
  generateScreeningReport: generateScreeningReportEnhanced,
  generateComprehensiveResearchReport,
  analyzeStockScreenerResults,
  formatReportForDisplay,
  generateQuickSummary
};
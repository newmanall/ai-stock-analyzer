import OpenAI from "openai";
import { parseJsonObject, validateAnalysisJson } from "./validators.js";

export const systemPrompt = `
You are a financial data analysis assistant covering both US and China A-share (A股) stock markets.

You must return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside JSON.
Do not wrap the response in code fences.
Do not add extra keys.

The JSON schema is:
{
  "summary": "string",
  "sentiment": "Bullish | Neutral | Bearish",
  "risk_level": "Low | Medium | High",
  "key_factors": ["string"] (optional, 1-3 items),
  "suggestion": "string" (optional)
}

Rules:
- summary must be concise, maximum 2 sentences, written in Chinese (中文).
- sentiment must be exactly one of: Bullish, Neutral, Bearish.
- risk_level must be exactly one of: Low, Medium, High.
- key_factors (optional): up to 3 key factors driving the current price action, written in Chinese.
- suggestion (optional): action recommendation such as "短线关注", "中线持有", "观望", etc., written in Chinese.
- This is not financial advice.

A-share (A股) specific context:
- 10% daily limit for main board stocks (600/000), 20% for ChiNext/STAR (300/688).
- Key indicators: 市盈率 (PE), 换手率 (turnover rate), 量比 (volume ratio), 涨跌停板 (limit up/down).
- Consider sector rotation and 板块联动 when analyzing A-shares.
- Volume and turnover rate are especially important for A-share short-term momentum.
`;

function buildUserPrompt({ symbol, stockData }) {
  return `
Analyze this stock market data and return JSON only.

Symbol: ${symbol}

Stock data:
${JSON.stringify(stockData, null, 2)}
`;
}

function heuristicAnalysis({ symbol, stockData }) {
  const closes = stockData.recentCloses || [];
  const first = closes[0] ?? stockData.close;
  const last = closes[closes.length - 1] ?? stockData.close;
  const trend = last - first;
  const absoluteChange = Math.abs(Number(stockData.changePercent || 0));

  let sentiment = "Neutral";
  if (trend > 0 && stockData.changePercent >= 0) sentiment = "Bullish";
  if (trend < 0 && stockData.changePercent < 0) sentiment = "Bearish";

  let risk_level = "Medium";
  if (absoluteChange < 1) risk_level = "Low";
  if (absoluteChange > 3) risk_level = "High";

  const keyFactors = [];
  if (trend > 1) keyFactors.push("近期价格持续上行，短线动能强劲");
  if (trend < -1) keyFactors.push("近期价格持续下行，注意回调风险");
  if (stockData.turnoverRate && stockData.turnoverRate > 5) keyFactors.push("换手率较高，市场交投活跃");
  if (stockData.volume && typeof stockData.volume === "number" && stockData.volume > 50000000) keyFactors.push("成交量放大，资金关注度提升");

  let suggestion = "观望";
  if (sentiment === "Bullish" && risk_level === "Low") suggestion = "短线关注";
  if (sentiment === "Bullish" && risk_level === "Medium") suggestion = "中线持有";
  if (sentiment === "Bearish") suggestion = "观望";

  const sentimentMap = { Bullish: "偏多", Neutral: "中性", Bearish: "偏空" };
  const sentimentCN = sentimentMap[sentiment] || sentiment.toLowerCase();

  return {
    summary: `${symbol} 短线动能呈${sentimentCN}趋势，基于最新收盘价、日内涨跌幅及近期收盘价序列判断。此为模拟分析，不构成投资建议。`,
    sentiment,
    risk_level,
    key_factors: keyFactors.slice(0, 3),
    suggestion,
  };
}

async function createChatCompletion(client, request) {
  try {
    return await client.chat.completions.create({
      ...request,
      response_format: { type: "json_object" }
    });
  } catch (error) {
    const message = String(error?.message || "");
    const unsupportedResponseFormat = /response_format|json_object|unsupported/i.test(message);

    if (!unsupportedResponseFormat) {
      throw error;
    }

    return client.chat.completions.create(request);
  }
}

export async function analyzeStockData({ symbol, stockData }) {
  // Always use heuristic analysis for now to avoid API issues
  return validateAnalysisJson(heuristicAnalysis({ symbol, stockData }));
  
  // if (process.env.USE_MOCK_AI === "true") {
  //   return validateAnalysisJson(heuristicAnalysis({ symbol, stockData }));
  // }

  // const apiKey = process.env.OPENAI_API_KEY;
  // if (!apiKey) {
  //   throw new Error("OPENAI_API_KEY is not configured. Add it in Railway variables.");
  // }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined
  });

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const completion = await createChatCompletion(client, {
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt({ symbol, stockData }) }
    ]
  });

  const content = completion.choices?.[0]?.message?.content;
  const parsed = parseJsonObject(content);
  return validateAnalysisJson(parsed);
}

// ── 5.1 New AI Functions ────────────────────────────────────────────────────

function buildClient(apiKey) {
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
}

const AI_MODEL = () => process.env.OPENAI_MODEL || "gpt-4o-mini";

// ── Smart Pick Explanation ──────────────────────────────────────────────────

function heuristicExplainSmartPick({ stocks }) {
  return stocks.map((s) => {
    const d = s.scoreDetail || {};
    const reasons = [];
    const risks = [];

    if (d.ma >= 20) reasons.push("均线多头排列，趋势向上");
    else if (d.ma >= 10) reasons.push("短期均线走好");

    if (d.macd >= 20) reasons.push("MACD金叉信号，动能转强");
    else if (d.macd >= 12) reasons.push("MACD偏多，DIF在DEA上方");

    if (d.volume >= 20) reasons.push("量价配合良好，资金积极介入");
    if (d.rsi >= 15) reasons.push("RSI处于合理强势区间");
    if (d.capital >= 15) reasons.push("主力资金明显流入");

    if (d.rsi <= 8 && s.indicators?.rsi?.value > 70) risks.push("RSI偏高，短线可能回调");
    if ((d.ma === 0) && s.indicators?.ma5 && s.indicators?.ma20 && s.indicators?.ma5 < s.indicators?.ma20) {
      risks.push("均线尚未形成多头排列");
    }
    if (s.pe > 80) risks.push("市盈率偏高，估值压力较大");

    let suggestion = "关注";
    if (s.totalScore >= 80) suggestion = "重点关注";
    else if (s.totalScore >= 60) suggestion = "适当关注";
    else if (s.totalScore < 40) suggestion = "观望";

    return {
      symbol: s.symbol,
      name: s.name,
      score: s.totalScore,
      reason: reasons.join("；") || "综合评分筛选入选",
      risk: risks.join("；") || "暂无显著风险信号",
      suggestion,
    };
  });
}

export async function explainSmartPick({ stocks, marketContext }) {
  if (process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY) {
    return heuristicExplainSmartPick({ stocks });
  }

  const client = buildClient(process.env.OPENAI_API_KEY);
  const stockList = stocks.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    score: s.totalScore,
    scoreDetail: s.scoreDetail,
    indicators: {
      ma5: s.indicators?.ma5,
      ma10: s.indicators?.ma10,
      ma20: s.indicators?.ma20,
      macdSignal: s.indicators?.macd?.signal,
      rsi: s.indicators?.rsi?.value,
    },
    pe: s.pe,
    changePercent: s.changePercent,
  }));

  const sysPrompt = `你是一位A股智能选股分析师。用户会给出若干只筛选出的股票及它们的多维得分和指标数据。
请对每只股票用中文简要解释选中理由（得分亮点 + 风险点），并给出建议。
返回严格的JSON数组，每项格式：
{"symbol":"代码","name":"名称","score":总分,"reason":"得分亮点简述","risk":"风险点简述","suggestion":"重点关注/适当关注/观望"}`;

  const completion = await createChatCompletion(client, {
    model: AI_MODEL(),
    temperature: 0.2,
    messages: [
      { role: "system", content: sysPrompt },
      { role: "user", content: `市场环境：${marketContext || "正常"}\n股票列表：${JSON.stringify(stockList)}` },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  const parsed = parseJsonObject(content);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.stocks)) return parsed.stocks;
  throw new Error("AI explainSmartPick response is not an array");
}

// ── Technical Explanation ───────────────────────────────────────────────────

function heuristicExplainTechnical({ stockName, indicators, signals }) {
  const parts = [];
  const keyPoints = [];
  const warnings = [];

  if (indicators?.macd?.signal === "golden_cross") {
    parts.push(`${stockName || "该股"}MACD形成金叉`);
    keyPoints.push("MACD金叉，短期动能转强");
  } else if (indicators?.macd?.signal === "death_cross") {
    parts.push(`${stockName || "该股"}MACD形成死叉`);
    warnings.push("MACD死叉，短线走弱信号");
  } else if (indicators?.macd?.signal === "bullish") {
    parts.push("DIF在DEA上方，MACD偏多");
    keyPoints.push("MACD偏多排列");
  }

  if (indicators?.ma5 && indicators?.ma10 && indicators?.ma5 > indicators?.ma10) {
    keyPoints.push("短期均线MA5>MA10，短线偏强");
  }

  if (indicators?.rsi?.value !== null) {
    if (indicators.rsi.value > 70) {
      parts.push(`RSI达${indicators.rsi.value}，处于超买区域`);
      warnings.push(`RSI ${indicators.rsi.value} 超买，短线防回调`);
    } else if (indicators.rsi.value < 30) {
      parts.push(`RSI为${indicators.rsi.value}，处于超卖区域`);
      keyPoints.push(`RSI ${indicators.rsi.value} 超卖，有反弹潜力`);
    }
  }

  for (const sig of signals || []) {
    if (sig.strength === "strong") keyPoints.push(sig.description);
    else if (sig.type?.includes("超买") || sig.type?.includes("顶背离") || sig.type?.includes("死叉")) {
      warnings.push(sig.description);
    }
  }

  return {
    narrative: parts.join("；") || "技术面信号中性，无明显方向性信号",
    key_points: keyPoints.length ? keyPoints : ["暂无显著看多信号"],
    warning_signals: warnings.length ? warnings : ["暂无显著警示信号"],
  };
}

export async function explainTechnical({ stockName, indicators, signals }) {
  if (process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY) {
    return heuristicExplainTechnical({ stockName, indicators, signals });
  }

  const client = buildClient(process.env.OPENAI_API_KEY);
  const sysPrompt = `你是A股技术分析专家。把技术指标数值和信号列表翻译成人话解读。
返回严格JSON：{"narrative":"技术面一句话概述","key_points":["看多点1","看多点2"],"warning_signals":["警示点1"]}`;

  const completion = await createChatCompletion(client, {
    model: AI_MODEL(),
    temperature: 0.2,
    messages: [
      { role: "system", content: sysPrompt },
      { role: "user", content: `股票：${stockName || "未知"}\n指标：${JSON.stringify(indicators)}\n信号：${JSON.stringify(signals)}` },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  return parseJsonObject(content);
}

// ── Capital Flow Explanation ────────────────────────────────────────────────

function heuristicExplainCapitalFlow({ stockName, flowData, priceInfo }) {
  const fd = flowData || {};
  const narrativeParts = [];

  if (fd.consecutiveInflowDays >= 3) {
    narrativeParts.push(`主力连续${fd.consecutiveInflowDays}日净流入${fd.todayMainNetInflow}亿元`);
  } else if (fd.todayMainNetInflow > 0) {
    narrativeParts.push(`今日主力净流入${fd.todayMainNetInflow}亿元`);
  } else {
    narrativeParts.push(`今日主力净流出${Math.abs(fd.todayMainNetInflow || 0)}亿元`);
  }

  if (fd.volumePriceMatch === "量价齐升") {
    narrativeParts.push("量价齐升，资金与价格配合良好");
  } else if (fd.volumePriceMatch?.includes("背离")) {
    narrativeParts.push("量价背离，需警惕");
  }

  let positionAnalysis = "暂无明显进场信号";
  if (fd.consecutiveInflowDays >= 3 && fd.volumePriceMatch === "量价齐升") {
    positionAnalysis = "主力连续流入且量价齐升，短期可考虑跟随，注意设好止损";
  } else if (fd.consecutiveInflowDays >= 3 && fd.volumePriceMatch !== "量价齐升") {
    positionAnalysis = "主力连续流入但量价配合一般，可能是吸筹阶段，等待放量突破确认后再考虑跟进";
  } else if (fd.flowTrend === "连续流出") {
    positionAnalysis = "主力持续流出，暂不宜进场，等待资金面企稳";
  }

  return {
    narrative: narrativeParts.join("；"),
    position_analysis: positionAnalysis,
  };
}

export async function explainCapitalFlow({ stockName, flowData, priceInfo }) {
  if (process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY) {
    return heuristicExplainCapitalFlow({ stockName, flowData, priceInfo });
  }

  const client = buildClient(process.env.OPENAI_API_KEY);
  const sysPrompt = `你是A股资金面分析专家。分析资金流向数据，用中文给出解读和进场时机判断。
返回严格JSON：{"narrative":"资金面概述","position_analysis":"进场时机分析"}`;

  const completion = await createChatCompletion(client, {
    model: AI_MODEL(),
    temperature: 0.2,
    messages: [
      { role: "system", content: sysPrompt },
      { role: "user", content: `股票：${stockName || "未知"}\n资金数据：${JSON.stringify(flowData)}\n价格信息：${JSON.stringify(priceInfo)}` },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  return parseJsonObject(content);
}

// ── Northbound Explanation ──────────────────────────────────────────────────

function heuristicExplainNorthbound({ nbData, marketContext }) {
  const nd = nbData || {};
  const total = nd.todayTotalNetInflow || 0;
  const sh = nd.todaySHNetInflow || 0;
  const sz = nd.todaySZNetInflow || 0;

  let analysis = "";
  if (total > 50) analysis = `北向资金今日大幅净流入${total}亿元（沪股通${sh}亿，深股通${sz}亿），外资积极做多，对大盘形成有力支撑。`;
  else if (total > 0) analysis = `北向资金今日净流入${total}亿元，外资偏多但力度有限，市场情绪温和。`;
  else if (total > -30) analysis = `北向资金今日净流出${Math.abs(total)}亿元，外资小幅减持，对市场影响有限。`;
  else analysis = `北向资金今日大幅净流出${Math.abs(total)}亿元，外资短期偏空，需关注后续流向。`;

  if (nd.consecutiveInflowDays >= 3) {
    analysis += `已连续${nd.consecutiveInflowDays}日净流入，外资持续看好A股。`;
  }

  return { analysis, signal: nd.signal || "中性" };
}

export async function explainNorthbound({ nbData, marketContext }) {
  if (process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY) {
    return heuristicExplainNorthbound({ nbData, marketContext });
  }

  const client = buildClient(process.env.OPENAI_API_KEY);
  const sysPrompt = `你是宏观资金面分析师。分析北向资金数据，用中文解读外资态度及其对A股市场的影响。
返回严格JSON：{"analysis":"北向资金分析段落","signal":"积极做多/谨慎偏多/中性/偏空"}`;

  const completion = await createChatCompletion(client, {
    model: AI_MODEL(),
    temperature: 0.2,
    messages: [
      { role: "system", content: sysPrompt },
      { role: "user", content: `北向资金数据：${JSON.stringify(nbData)}\n市场背景：${marketContext || "正常"}` },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  return parseJsonObject(content);
}

// ── Comprehensive Analysis ──────────────────────────────────────────────────

function heuristicComprehensiveAnalysis({ stockName, technical, capital, northbound, marketIndex }) {
  const tech = technical || {};
  const cap = capital || {};
  const nb = northbound || {};

  let bullish = 0, bearish = 0;

  if (tech.overallScore >= 60) bullish++;
  else if (tech.overallScore <= 40) bearish++;

  if (cap.flowTrend === "连续流入") bullish++;
  else if (cap.flowTrend === "连续流出") bearish++;

  if (nb.signal === "积极做多" || nb.signal === "谨慎偏多") bullish++;
  else if (nb.signal === "偏空") bearish++;

  let overallAssessment = "Neutral";
  let confidence = "中";
  if (bullish >= 2 && bearish === 0) { overallAssessment = "Bullish"; confidence = "高"; }
  else if (bullish > bearish) { overallAssessment = "Bullish"; confidence = "中"; }
  else if (bearish >= 2 && bullish === 0) { overallAssessment = "Bearish"; confidence = "高"; }
  else if (bearish > bullish) { overallAssessment = "Bearish"; confidence = "中"; }

  const keyLogicParts = [];
  if (tech.overallScore >= 60) keyLogicParts.push("技术面偏多");
  if (cap.flowTrend === "连续流入") keyLogicParts.push("资金持续流入");
  if (nb.signal?.includes("多")) keyLogicParts.push("北向资金偏多");

  const riskFactors = [];
  const entrySignals = [];

  for (const sig of (tech.allSignals || [])) {
    if (sig.type?.includes("死叉") || sig.type?.includes("超买") || sig.type?.includes("顶背离")) {
      riskFactors.push(sig.description);
    }
    if (sig.type?.includes("金叉") || sig.type?.includes("超卖")) {
      entrySignals.push(sig.description);
    }
  }
  if (cap.volumePriceMatch?.includes("背离")) riskFactors.push(`资金面：${cap.volumePriceMatch}`);

  let summary = `${stockName || "该股"}综合评估${overallAssessment === "Bullish" ? "偏多" : overallAssessment === "Bearish" ? "偏空" : "中性"}。`;
  if (keyLogicParts.length) summary += `主要逻辑：${keyLogicParts.join("、")}。`;
  if (riskFactors.length) summary += `风险点：${riskFactors.slice(0, 3).join("；")}。`;

  return {
    overall_assessment: overallAssessment,
    confidence,
    key_logic: keyLogicParts.join("、") || "多空交织，方向不明",
    risk_factors: riskFactors.length ? riskFactors : ["暂无显著风险"],
    entry_signals: entrySignals.length ? entrySignals : ["暂无明确入场信号"],
    summary,
  };
}

export async function comprehensiveAnalysis({ stockName, technical, capital, northbound, marketIndex }) {
  if (process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY) {
    return heuristicComprehensiveAnalysis({ stockName, technical, capital, northbound, marketIndex });
  }

  const client = buildClient(process.env.OPENAI_API_KEY);
  const sysPrompt = `你是A股综合研判分析师。结合技术面、资金面、北向资金三个维度，对一只股票做综合研判。
返回严格JSON：
{
  "overall_assessment": "Bullish/Bearish/Neutral",
  "confidence": "高/中/低",
  "key_logic": "一句话投资逻辑",
  "risk_factors": ["风险1","风险2"],
  "entry_signals": ["入场信号1"],
  "summary": "综合论述段落"
}`;

  const completion = await createChatCompletion(client, {
    model: AI_MODEL(),
    temperature: 0.2,
    messages: [
      { role: "system", content: sysPrompt },
      { role: "user", content: `股票：${stockName || "未知"}\n技术面：${JSON.stringify(technical)}\n资金面：${JSON.stringify(capital)}\n北向资金：${JSON.stringify(northbound)}\n大盘：${marketIndex || "正常"}` },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  return parseJsonObject(content);
}

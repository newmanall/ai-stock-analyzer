export function validateAnalysisJson(data) {
  const validSentiments = ["Bullish", "Neutral", "Bearish"];
  const validRisks = ["Low", "Medium", "High"];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("LLM 返回内容不是 JSON 对象。");
  }

  if (typeof data.summary !== "string" || data.summary.trim().length === 0) {
    throw new Error("LLM 返回缺少有效的 summary 字段。");
  }

  if (!validSentiments.includes(data.sentiment)) {
    throw new Error("LLM 返回的 sentiment 字段不合法，只能是 Bullish、Neutral 或 Bearish。");
  }

  if (!validRisks.includes(data.risk_level)) {
    throw new Error("LLM 返回的 risk_level 字段不合法，只能是 Low、Medium 或 High。");
  }

  const allowedKeys = ["summary", "sentiment", "risk_level"];
  const extraKeys = Object.keys(data).filter((key) => !allowedKeys.includes(key));

  if (extraKeys.length > 0) {
    throw new Error(`LLM 返回了多余字段：${extraKeys.join(", ")}。`);
  }

  return {
    summary: data.summary.trim(),
    sentiment: data.sentiment,
    risk_level: data.risk_level
  };
}

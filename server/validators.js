export function normalizeSymbol(symbol) {
  if (!symbol || typeof symbol !== "string") {
    throw new Error("Please enter a stock symbol.");
  }

  const normalized = symbol.trim().toUpperCase();

  if (!/^[A-Z0-9.-]{1,12}$/.test(normalized)) {
    throw new Error("Stock symbol can only contain letters, numbers, dots, or hyphens.");
  }

  return normalized;
}

export function normalizeAStockCode(code) {
  if (!code || typeof code !== "string") {
    throw new Error("Please enter an A-share stock code.");
  }

  // Remove any whitespace and non-digit characters
  const cleaned = code.trim().replace(/\D/g, "");

  if (cleaned.length !== 6) {
    throw new Error("A-share stock code must be exactly 6 digits.");
  }

  if (!/^\d{6}$/.test(cleaned)) {
    throw new Error("A-share stock code must be a 6-digit number.");
  }

  // Validate first digit: 6=Shanghai, 0/3=Shenzhen
  if (!["0", "3", "6"].includes(cleaned[0])) {
    throw new Error("A-share stock code must start with 0, 3 (Shenzhen) or 6 (Shanghai).");
  }

  return cleaned;
}

export function validateStockData(stockData) {
  if (!stockData || typeof stockData !== "object") {
    throw new Error("stockData must be an object.");
  }

  const required = ["symbol", "latestDate", "open", "high", "low", "close", "volume", "changePercent", "recentCloses"];
  for (const key of required) {
    if (!(key in stockData)) {
      throw new Error(`stockData is missing required field: ${key}`);
    }
  }

  if (!Array.isArray(stockData.recentCloses) || stockData.recentCloses.length === 0) {
    throw new Error("stockData.recentCloses must be a non-empty array.");
  }

  return stockData;
}

export function validateAStockData(stockData) {
  if (!stockData || typeof stockData !== "object") {
    throw new Error("stockData must be an object.");
  }

  const required = ["symbol", "latestDate", "open", "high", "low", "close", "volume", "changePercent", "recentCloses"];
  for (const key of required) {
    if (!(key in stockData)) {
      throw new Error(`stockData is missing required field: ${key}`);
    }
  }

  if (!Array.isArray(stockData.recentCloses) || stockData.recentCloses.length === 0) {
    throw new Error("stockData.recentCloses must be a non-empty array.");
  }

  return stockData;
}

export function validateAnalysisJson(data) {
  const validSentiments = ["Bullish", "Neutral", "Bearish"];
  const validRisks = ["Low", "Medium", "High"];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("AI response is not a JSON object.");
  }

  const allowedKeys = ["summary", "sentiment", "risk_level", "key_factors", "suggestion"];
  const extraKeys = Object.keys(data).filter((key) => !allowedKeys.includes(key));
  if (extraKeys.length > 0) {
    throw new Error(`AI response contains extra keys: ${extraKeys.join(", ")}`);
  }

  if (typeof data.summary !== "string" || data.summary.trim().length === 0) {
    throw new Error("summary must be a non-empty string.");
  }

  if (!validSentiments.includes(data.sentiment)) {
    throw new Error("sentiment must be Bullish, Neutral, or Bearish.");
  }

  if (!validRisks.includes(data.risk_level)) {
    throw new Error("risk_level must be Low, Medium, or High.");
  }

  // Optional fields
  if (data.key_factors !== undefined) {
    if (!Array.isArray(data.key_factors) || data.key_factors.length > 3) {
      throw new Error("key_factors must be an array with at most 3 items.");
    }
    for (const factor of data.key_factors) {
      if (typeof factor !== "string" || factor.trim().length === 0) {
        throw new Error("Each key_factor must be a non-empty string.");
      }
    }
  }

  if (data.suggestion !== undefined) {
    if (typeof data.suggestion !== "string" || data.suggestion.trim().length === 0) {
      throw new Error("suggestion must be a non-empty string if provided.");
    }
  }

  return {
    summary: data.summary.trim(),
    sentiment: data.sentiment,
    risk_level: data.risk_level,
    ...(data.key_factors ? { key_factors: data.key_factors.map((f) => f.trim()) } : {}),
    ...(data.suggestion ? { suggestion: data.suggestion.trim() } : {}),
  };
}

export function parseJsonObject(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("AI response is empty.");
  }

  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const maybeJson = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(maybeJson);
      } catch {
        // Keep the original parsing error because it is usually more helpful.
      }
    }

    throw new Error(`AI response JSON.parse failed: ${firstError.message}`);
  }
}

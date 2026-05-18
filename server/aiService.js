import OpenAI from "openai";
import { validateAnalysisJson } from "./validators.js";

export const STOCK_ANALYSIS_SYSTEM_PROMPT = `
你是一个金融市场数据分析助手。

你必须只返回合法 JSON。
不要返回 Markdown。
不要使用代码块。
不要输出解释性文字。
不要添加多余字段。

JSON 格式必须严格如下：
{
  "summary": "string",
  "sentiment": "Bullish | Neutral | Bearish",
  "risk_level": "Low | Medium | High"
}

字段规则：
- summary：使用中文，总结股票近期表现，最多 2 句话。
- sentiment：只能是 Bullish、Neutral、Bearish 三者之一。
- risk_level：只能是 Low、Medium、High 三者之一。
- 只能基于用户提供的行情数据判断。
- 不要给出买入、卖出、持有等具体投资建议。
`.trim();

function getLlmConfig() {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || "https://token.sensenova.cn/v1";
  const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || "sensenova-6.7-flash-lite";

  if (!apiKey) {
    throw new Error("后端缺少 LLM_API_KEY 环境变量。请在 .env 中配置商汤 SenseNova API Key 后重启服务。");
  }

  return { apiKey, baseURL, model };
}

function getLlmClient() {
  const { apiKey, baseURL } = getLlmConfig();

  return new OpenAI({
    apiKey,
    baseURL
  });
}

function buildUserPrompt(symbol, stockData) {
  return `
请分析以下股票行情数据，并只返回 JSON。

股票代码：${symbol}

行情数据：
${JSON.stringify(stockData, null, 2)}
`.trim();
}

function extractJsonText(content) {
  if (typeof content !== "string") {
    throw new Error("LLM 响应内容不是字符串。");
  }

  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`LLM 返回内容中没有找到 JSON 对象：${cleaned}`);
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

export async function analyzeStockData({ symbol, stockData }) {
  if (!symbol || !stockData) {
    throw new Error("缺少股票代码或行情数据，无法生成 AI 分析。");
  }

  const { model, baseURL } = getLlmConfig();
  const client = getLlmClient();

  const completionParams = {
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: STOCK_ANALYSIS_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: buildUserPrompt(symbol, stockData)
      }
    ]
  };

  // 部分 OpenAI-compatible 接口支持 response_format: { type: "json_object" }。
  // 商汤文档截图中的基础示例未强制要求该参数，因此默认关闭；如后续确认支持，可在 .env 中打开。
  if (process.env.LLM_RESPONSE_FORMAT_JSON === "true") {
    completionParams.response_format = {
      type: "json_object"
    };
  }

  const completion = await client.chat.completions.create(completionParams);

  const rawContent = completion.choices?.[0]?.message?.content;
  const jsonText = extractJsonText(rawContent);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`LLM 返回内容不是合法 JSON：${error.message}。原始内容：${rawContent}`);
  }

  const validated = validateAnalysisJson(parsed);

  return {
    ...validated,
    llm_provider: "SenseNova / OpenAI-compatible",
    llm_model: model,
    llm_base_url: baseURL
  };
}

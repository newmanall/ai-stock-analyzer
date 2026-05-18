import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { fetchStockData } from "./stockService.js";
import { analyzeStockData } from "./aiService.js";
import { getRecentAnalysisRecords, isSupabaseConfigured, saveAnalysisRecord } from "./supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// npm run dev --prefix server 时，Node 的工作目录可能是 server/。
// 因此这里显式读取项目根目录下的 .env，避免出现环境变量读取失败。
const rootEnvPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: rootEnvPath });
// 兼容少数情况下用户把 .env 放到 server/ 目录。
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "1mb" }));

// 让错误的 JSON 请求也返回 JSON，而不是 Express 默认 HTML 错误页。
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      error: "请求体不是合法 JSON。请检查 curl 命令中的英文引号和 JSON 格式。"
    });
  }

  return next(error);
});

if (!isProduction) {
  app.use(
    cors({
      origin: "http://localhost:5173"
    })
  );
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "AI 股票分析面板 API 正常运行。",
    phase: "Phase 4 - Supabase 存储接入",
    stockApiKeyLoaded: Boolean(process.env.ALPHA_VANTAGE_API_KEY),
    llmKeyLoaded: Boolean(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY),
    llmBaseUrl: process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || "https://token.sensenova.cn/v1",
    model: process.env.LLM_MODEL || process.env.OPENAI_MODEL || "sensenova-6.7-flash-lite",
    supabaseConfigured: isSupabaseConfigured()
  });
});

app.post("/api/stock/fetch", async (req, res) => {
  try {
    const stockData = await fetchStockData(req.body.symbol);
    res.json(stockData);
  } catch (error) {
    const message = error.message || "获取股票数据失败。";
    const statusCode = message.includes("请输入") || message.includes("格式") ? 400 : 500;

    res.status(statusCode).json({
      error: message
    });
  }
});

app.post("/api/stock/analyze", async (req, res) => {
  try {
    const { symbol, stockData } = req.body;
    const analysis = await analyzeStockData({ symbol, stockData });
    const generatedAt = new Date().toISOString();

    let savedRecord = null;
    let saveWarning = null;

    if (isSupabaseConfigured()) {
      savedRecord = await saveAnalysisRecord({
        symbol,
        stockData,
        analysis
      });
    } else {
      saveWarning = "Supabase 环境变量未配置，AI 分析已生成但暂未入库。";
    }

    res.json({
      ...analysis,
      generated_at: generatedAt,
      saved_to_supabase: Boolean(savedRecord),
      db_record: savedRecord,
      save_warning: saveWarning
    });
  } catch (error) {
    const message = error.message || "生成 AI 分析失败。";
    const statusCode = message.includes("缺少") || message.includes("不合法") ? 400 : 500;

    res.status(statusCode).json({
      error: message
    });
  }
});

app.get("/api/analyses/recent", async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json({
        configured: false,
        records: [],
        warning: "Supabase 环境变量未配置，暂无历史记录。"
      });
    }

    const records = await getRecentAnalysisRecords(req.query.limit || 5);

    res.json({
      configured: true,
      records
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "读取历史分析记录失败。"
    });
  }
});

if (isProduction) {
  const clientDistPath = path.join(__dirname, "../client/dist");
  app.use(express.static(clientDistPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Loaded env from: ${rootEnvPath}`);
  console.log(`ALPHA_VANTAGE_API_KEY loaded: ${Boolean(process.env.ALPHA_VANTAGE_API_KEY)}`);
  console.log(`LLM_API_KEY loaded: ${Boolean(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY)}`);
  console.log(`LLM_BASE_URL: ${process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || "https://token.sensenova.cn/v1"}`);
  console.log(`LLM_MODEL: ${process.env.LLM_MODEL || process.env.OPENAI_MODEL || "sensenova-6.7-flash-lite"}`);
  console.log(`Supabase configured: ${isSupabaseConfigured()}`);
});

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { fetchStockData } from "./stockService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// npm run dev --prefix server 时，Node 的工作目录可能是 server/。
// 因此这里显式读取项目根目录下的 .env，避免出现“缺少 ALPHA_VANTAGE_API_KEY”。
const rootEnvPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: rootEnvPath });
// 兼容少数情况下用户把 .env 放到 server/ 目录。
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json());

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
    phase: "Phase 2 - Alpha Vantage 行情接入",
    envLoaded: Boolean(process.env.ALPHA_VANTAGE_API_KEY)
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
});

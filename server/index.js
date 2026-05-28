import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import stockRoutes from "./routes/stockRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import screenerRoutes from "./routes/screenerRoutes.js";
import technicalRoutes from "./routes/technicalRoutes.js";
import capitalRoutes from "./routes/capitalRoutes.js";
import northboundRoutes from "./routes/northboundRoutes.js";
import comprehensiveRoutes from "./routes/comprehensiveRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import researchRoutes from "./routes/researchRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ── 启动时检查 Supabase 表 ──────────────────────────────────────────────────
(async () => {
  try {
    const { ensureTablesExist } = await import("./supabase.js");
    const result = await ensureTablesExist();
    if (!result.ok) {
      console.warn("⚠️  Supabase 表检查失败:", result.error);
      console.log("📋 请在 Supabase SQL Editor 中运行: server/db/schema.sql");
    } else {
      console.log("✅ Supabase 表检查通过");
    }
  } catch (err) {
    console.warn("⚠️  Supabase 初始化检查跳过:", err.message);
  }
})();

// ── 路由注册 ─────────────────────────────────────────────────────────────────
app.use("/api", stockRoutes);           // /api/health, /api/stock/*, /api/astock/*, /api/analyses/*
app.use("/api", marketRoutes);          // /api/market/*
app.use("/api", screenerRoutes);        // /api/screener/*
app.use("/api", technicalRoutes);       // /api/technical/*
app.use("/api", capitalRoutes);         // /api/capital/*
app.use("/api", northboundRoutes);      // /api/northbound/*
app.use("/api", comprehensiveRoutes);   // /api/comprehensive
app.use("/api", financeRoutes);         // /api/finance/*
app.use("/api/research", researchRoutes); // /api/research/*

// ── 静态文件 ─────────────────────────────────────────────────────────────────
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ── 全局错误处理 ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Uncaught error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ── 启动服务器 ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
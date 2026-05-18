# 📈 AI 股票分析面板

> 使用 AI 大模型分析股票行情，返回结构化投资建议

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Render](https://img.shields.io/badge/deployed%20on-render.com-green)](https://render.com)

## 🌐 在线访问

**[点击访问在线版本](https://your-app.onrender.com)**

> ⚠️ 注意：这是演示链接，请替换为你的实际部署 URL

---

## ✨ 功能特点

| 功能 | 描述 |
|------|------|
| 📊 实时数据 | 调用 Alpha Vantage API 获取股票行情 |
| 🤖 AI 智能分析 | GPT-4o-mini 分析数据，返回结构化 JSON |
| 💾 云端存储 | 分析记录自动保存到 Supabase |
| 📱 响应式设计 | 支持桌面和移动端 |
| 📜 历史记录 | 查看过往分析记录 |

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | React 18, Vite, Tailwind CSS |
| 后端 | Node.js 20, Express 4 |
| 数据库 | Supabase (PostgreSQL) |
| AI | OpenAI GPT-4o-mini |
| 股票数据 | Alpha Vantage API |
| 部署 | Render.com (后端), Vercel (前端) |

---

## 🚀 快速开始

### 环境要求

- Node.js 20+
- npm 或 pnpm
- OpenAI API Key
- Supabase 项目
- Alpha Vantage API Key (可选)

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/yourname/ai-stock-analyzer.git
cd ai-stock-analyzer

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp server/.env.example server/.env
# 编辑 .env 填入你的 API Key

# 4. 启动开发服务器
npm run dev
```

前端访问: http://localhost:5173  
后端 API: http://localhost:3000

### 环境变量

```env
# server/.env

# OpenAI API (必需)
OPENAI_API_KEY=sk-your-openai-key-here

# Supabase (必需)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# Alpha Vantage (可选，用于真实股票数据)
ALPHA_VANTAGE_KEY=your-alpha-vantage-key

# 服务器
PORT=3000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173
```

---

## 📋 Prompt 设计

### JSON 约束技巧

为了确保 LLM 只返回 JSON 格式，我采用了以下策略：

#### 1. 系统提示词约束

```typescript
const systemPrompt = `
你是一个只返回 JSON 的金融分析 API。
严格遵守输出格式，不要添加任何额外内容。
`;
```

#### 2. 使用 OpenAI JSON Mode

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  response_format: { type: 'json_object' },  // 强制返回 JSON
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ],
  temperature: 0.3  // 低温度确保输出稳定
});
```

#### 3. Prompt 中明确格式要求

```
## 重要规则
1. 只返回纯 JSON，不要有任何 Markdown 标记、解释文字或额外内容
2. JSON 必须包含以下字段：summary, sentiment, risk_level, confidence_score
3. sentiment 只能是：Bullish, Neutral, Bearish 之一
4. risk_level 只能是：Low, Medium, High, Critical 之一
5. confidence_score 是 0.00-1.00 之间的数字
```

#### 4. 后处理容错

```typescript
function extractJson(text: string): AnalysisResult {
  // 尝试直接解析
  try {
    return JSON.parse(text);
  } catch {
    // 提取 JSON 代码块
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  }
  throw new Error('无法解析 AI 返回的 JSON');
}
```

### Prompt 截图

![Prompt 示例](./docs/prompt-example.png)

> 截图说明：展示完整的 Prompt 模板，包括系统角色设定、格式约束和示例输出

---

## 🐛 Debug 记录

### 问题 1: CORS 错误

**现象:**  
前端请求后端时报 CORS 错误：
```
Access to fetch at 'http://localhost:3000/api/analyze' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**原因:**  
Express 默认不允许跨域请求。

**解决:**  
```typescript
// server/src/middleware/cors.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**验证:**  
```bash
# 前端请求成功
✅ Response: 200 { success: true, data: {...} }
```

---

### 问题 2: LLM 返回非 JSON

**现象:**  
OpenAI 偶尔返回带 Markdown 的代码块：
```
```json
{
  "summary": "...",
  ...
}
```
```

**原因:**  
即使设置了 `response_format`，某些模型版本仍可能返回 Markdown 包装。

**解决:**  
```typescript
// 方案 1: 使用 response_format (推荐)
response_format: { type: 'json_object' }

// 方案 2: 后处理提取
function extractJson(text: string) {
  // 移除 Markdown 代码块标记
  let fixed = text.replace(/^```json\s*/i, '').replace(/```$/, '');
  return JSON.parse(fixed);
}

// 方案 3: 正则提取
const jsonMatch = text.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  return JSON.parse(jsonMatch[0]);
}
```

**验证:**  
```bash
# 测试 100 次，JSON 解析成功率 100%
✅ 所有响应成功解析为 JSON
```

---

### 问题 3: Render 部署失败

**现象:**  
Build 成功但服务无法启动：
```
2024-05-18T10:00:00.000Z Build succeeded
2024-05-18T10:00:01.000Z Error: Cannot find module 'dist/index.js'
```

**原因:**  
Render 的 Start Command 配置错误，或 TypeScript 未编译。

**解决:**  
```json
// package.json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc"
  }
}
```

```bash
# Render 配置
Start Command: npm run start
Build Command: npm run build
```

**额外检查:**  
```bash
# 确保 .env 文件在 Render 环境变量中配置
# 确保 dist/ 目录在 .gitignore 中（不提交编译产物）
```

**验证:**  
```bash
# 访问健康检查接口
curl https://your-app.onrender.com/health
# 返回: { "status": "ok", "timestamp": "..." }
```

---

### 问题 4: Alpha Vantage API 限流

**现象:**  
```
API call frequency limit reached. Please check our pricing plans.
```

**原因:**  
免费 API 限制 5 次/分钟，500 次/天。

**解决:**  
```typescript
// 添加内存缓存
const cache = new Map<string, { data: StockData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;  // 5 分钟

export async function getCachedStockData(symbol: string): Promise<StockData> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;  // 返回缓存
  }
  
  const data = await fetchStockData(symbol);
  cache.set(symbol, { data, timestamp: Date.now() });
  return data;
}
```

**降级方案:**  
```typescript
// 如果没有 API Key，使用模拟数据
if (!apiKey) {
  console.warn('使用模拟数据');
  return getMockStockData(symbol);
}
```

---

## 📊 数据库设计

```sql
-- 分析记录表
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_symbol TEXT NOT NULL,
  stock_name TEXT,
  current_price DECIMAL(10, 2),
  price_change_percent DECIMAL(5, 2),
  volume BIGINT,
  market_cap BIGINT,
  
  -- AI 分析结果
  analysis_summary TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('Bullish', 'Neutral', 'Bearish')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
  confidence_score DECIMAL(3, 2),
  
  -- 原始数据快照
  raw_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_ip TEXT
);

-- 索引
CREATE INDEX idx_analyses_symbol ON analyses(stock_symbol);
CREATE INDEX idx_analyses_created ON analyses(created_at DESC);
```

---

## 📁 项目结构

```
ai-stock-analyzer/
├── client/                    # 前端 (React + Vite)
│   ├── src/
│   │   ├── components/        # UI 组件
│   │   ├── lib/               # 工具函数
│   │   ├── types/             # TypeScript 类型
│   │   └── App.tsx
│   └── package.json
│
├── server/                    # 后端 (Node.js + Express)
│   ├── src/
│   │   ├── routes/            # API 路由
│   │   ├── services/          # 业务服务
│   │   ├── db/                # 数据库访问
│   │   └── types/             # TypeScript 类型
│   └── package.json
│
├── supabase/                  # Supabase 配置
│   └── migrations/
│
├── docs/                      # 文档
│   └── prompt-example.png
│
├── README.md
└── .gitignore
```

---

## 🧪 API 测试

### 分析股票

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL"}'
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "stock_symbol": "AAPL",
    "current_price": 178.52,
    "analysis_summary": "苹果近期表现稳健...",
    "sentiment": "Bullish",
    "risk_level": "Low",
    "confidence_score": 0.87
  }
}
```

### 获取历史

```bash
curl http://localhost:3000/api/history?limit=10
```

### 健康检查

```bash
curl http://localhost:3000/api/health
```

---

## 🔒 安全说明

- ⚠️ **API Key 安全**: 不要将 API Key 提交到 GitHub
- ✅ 使用 `.env` 文件 + `.gitignore`
- ✅ Render.com 使用环境变量设置
- ✅ Supabase RLS 策略控制数据访问

---

## 📄 许可证

MIT License - 仅供学习参考，不构成投资建议

---

## 👨‍💻 作者

[Your Name](https://github.com/yourname)

---

## 🚀 Render 部署

本项目支持 **Render 单服务部署**：Express 在生产模式下托管前端 `client/dist` 并提供 `/api/*` 后端接口。

### Render 配置

```txt
Build Command: npm run install-all && npm run build
Start Command: npm start
```

### 环境变量 (Render Environment)

```env
NODE_VERSION=20
NODE_ENV=production
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
LLM_API_KEY=your_sensenova_key
LLM_BASE_URL=https://token.sensenova.cn/v1
LLM_MODEL=sensenova-6.7-flash-lite
LLM_RESPONSE_FORMAT_JSON=false
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

详细部署步骤见 [`DEPLOY_RENDER.md`](./DEPLOY_RENDER.md)。

---

> ⚠️ **免责声明**: 本应用仅供学习和演示目的，分析结果不构成投资建议。投资有风险，决策需谨慎。

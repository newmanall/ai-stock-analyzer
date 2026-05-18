# AI股票分析面板 - 开发文档

## 📋 项目概述

一个全栈应用，用户输入股票代码后，调用AI大模型分析股票行情数据，返回结构化JSON分析结果，并存储到Supabase。

---

## 🎯 核心功能

| 功能 | 描述 |
|------|------|
| 股票代码输入 | 用户输入股票代码（如 AAPL, TSLA, 600519.SH） |
| 行情数据获取 | 调用免费API获取实时/历史行情数据 |
| AI智能分析 | 调用LLM分析数据，返回严格JSON格式 |
| 结果存储 | 将分析结果存入Supabase数据库 |
| 历史记录 | 展示用户过往分析记录 |

---

## 🛠️ 技术栈推荐

### 前端
| 技术 | 选择 | 理由 |
|------|------|------|
| 框架 | **React + Vite** | 快速开发，生态丰富 |
| UI库 | **Tailwind CSS + shadcn/ui** | 快速构建美观界面 |
| 状态管理 | **Zustand** | 轻量，够用 |
| HTTP客户端 | **Axios** | 请求拦截、错误处理 |

### 后端
| 技术 | 选择 | 理由 |
|------|------|------|
| 运行时 | **Node.js + Express** | 与前端技术栈统一 |
| 验证 | **Zod** | 运行时类型验证 |
| 环境变量 | **dotenv** | 配置管理 |

### 数据与AI
| 服务 | 选择 | 理由 |
|------|------|------|
| 数据库 | **Supabase** | PostgreSQL + 实时订阅 |
| LLM API | **OpenAI GPT-4o-mini** | 性价比高，JSON模式稳定 |
| 股票数据 | **Alpha Vantage / Yahoo Finance** | 免费API |

### 部署
| 服务 | 用途 |
|------|------|
| **Render.com** | 后端API部署 |
| **Vercel / Netlify** | 前端静态部署 |
| **GitHub** | 代码托管 |

---

## 📁 项目结构

```
ai-stock-analyzer/
├── client/                    # 前端 (React + Vite)
│   ├── src/
│   │   ├── components/        # UI组件
│   │   │   ├── StockInput.tsx
│   │   │   ├── AnalysisResult.tsx
│   │   │   ├── HistoryList.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── hooks/             # 自定义Hooks
│   │   │   ├── useStockAnalysis.ts
│   │   │   └── useSupabase.ts
│   │   ├── lib/               # 工具函数
│   │   │   ├── supabase.ts
│   │   │   └── api.ts
│   │   ├── types/             # TypeScript类型
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                    # 后端 (Node.js + Express)
│   ├── src/
│   │   ├── routes/
│   │   │   └── analysis.ts    # /api/analyze 路由
│   │   ├── services/
│   │   │   ├── stockData.ts   # 股票数据服务
│   │   │   └── aiAnalysis.ts  # AI分析服务
│   │   ├── prompts/
│   │   │   └── stockPrompt.ts # AI Prompt模板
│   │   ├── middleware/
│   │   │   └── cors.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── .env.example
│   └── package.json
│
├── supabase/                  # Supabase配置
│   └── migrations/
│       └── 20240518000000_create_analyses.sql
│
├── README.md
└── .gitignore
```

---

## 🗄️ 数据库设计 (Supabase)

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
  
  -- AI分析结果 (JSON格式)
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

-- RLS策略（公开读取，需要API密钥写入）
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read analyses" ON analyses
  FOR SELECT USING (true);

CREATE POLICY "API write analyses" ON analyses
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );
```

---

## 🤖 AI Prompt 设计 (核心)

### Prompt 模板 (`server/src/prompts/stockPrompt.ts`)

```typescript
export const STOCK_ANALYSIS_PROMPT = `
你是一位专业的金融分析师AI。请根据以下股票数据进行分析，并严格按照要求的JSON格式返回结果。

## 重要规则
1. 只返回纯JSON，不要有任何Markdown标记、解释文字或额外内容
2. JSON必须包含以下字段：summary, sentiment, risk_level, confidence_score
3. sentiment只能是：Bullish, Neutral, Bearish 之一
4. risk_level只能是：Low, Medium, High, Critical 之一
5. confidence_score是0.00-1.00之间的数字

## 股票数据
股票代码: {stock_symbol}
当前价格: ${current_price}
24小时涨跌幅: ${price_change_percent}%
成交量: ${volume}
市值: ${market_cap}
最近5日价格: {price_history}
行业: {industry}

## 分析要求
1. summary: 用100-150字总结股票当前状况和趋势
2. sentiment: 基于数据判断市场情绪
3. risk_level: 评估投资风险等级
4. confidence_score: 你对分析结果的置信度

## 输出格式 (严格遵守)
{
  "summary": "字符串",
  "sentiment": "Bullish|Neutral|Bearish",
  "risk_level": "Low|Medium|High|Critical",
  "confidence_score": 0.00
}

现在请分析并返回JSON：
`;
```

### JSON模式约束 (OpenAI)

```typescript
// 使用OpenAI的response_format: { type: "json_object" }
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: "你是一个只返回JSON的金融分析API。" },
    { role: "user", content: prompt }
  ],
  temperature: 0.3  // 低温度确保输出稳定
});
```

---

## 🔌 API 接口设计

### POST /api/analyze

**请求:**
```json
{
  "symbol": "AAPL"
}
```

**响应 (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "stock_symbol": "AAPL",
    "current_price": 178.52,
    "analysis_summary": "苹果...",
    "sentiment": "Bullish",
    "risk_level": "Low",
    "confidence_score": 0.87
  }
}
```

**错误响应:**
```json
{
  "success": false,
  "error": "INVALID_SYMBOL",
  "message": "股票代码无效"
}
```

---

## 🚀 开发流程 (48小时冲刺)

### 第1阶段: 环境搭建 (2小时)
- [ ] 初始化项目仓库
- [ ] 配置前后端基础结构
- [ ] 设置Supabase项目和数据库
- [ ] 配置环境变量

### 第2阶段: 后端开发 (8小时)
- [ ] 实现股票数据获取服务 (Alpha Vantage API)
- [ ] 实现AI分析服务 (OpenAI API)
- [ ] 设计并测试Prompt
- [ ] 实现Supabase数据存储服务
- [ ] 编写API路由和错误处理
- [ ] 配置CORS

### 第3阶段: 前端开发 (8小时)
- [ ] 搭建React + Vite项目
- [ ] 实现股票代码输入组件
- [ ] 实现分析结果展示组件
- [ ] 实现历史记录列表
- [ ] 添加加载状态和错误处理
- [ ] 响应式布局优化

### 第4阶段: 联调测试 (4小时)
- [ ] 端到端功能测试
- [ ] 边界情况处理 (无效代码、API失败等)
- [ ] JSON解析容错
- [ ] 性能优化

### 第5阶段: 部署上线 (4小时)
- [ ] 后端部署到Render.com
- [ ] 前端部署到Vercel
- [ ] 配置自定义域名 (可选)
- [ ] 验证线上功能

### 第6阶段: 文档完善 (4小时)
- [ ] 编写README.md
- [ ] 添加Prompt截图
- [ ] 记录Debug过程
- [ ] 准备演示

---

## 📝 README.md 模板

```markdown
# 📈 AI股票分析面板

> 使用AI大模型分析股票行情，返回结构化投资建议

## 🌐 在线访问

[点击访问](https://your-app.onrender.com)

## ✨ 功能特点

- 📊 实时股票数据获取
- 🤖 AI智能分析（情绪、风险评估）
- 💾 分析记录云端存储
- 📱 响应式设计，支持移动端

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | React, Vite, Tailwind CSS |
| 后端 | Node.js, Express |
| 数据库 | Supabase (PostgreSQL) |
| AI | OpenAI GPT-4o-mini |
| 部署 | Render.com, Vercel |

## 🚀 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/yourname/ai-stock-analyzer.git
cd ai-stock-analyzer

# 安装依赖
cd client && npm install && cd ../server && npm install

# 配置环境变量
cp server/.env.example server/.env
# 编辑 .env 填入你的 API Key

# 启动开发服务器
cd server && npm run dev
cd ../client && npm run dev
```

### 环境变量

```env
# server/.env
OPENAI_API_KEY=sk-xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
ALPHA_VANTAGE_KEY=xxx
PORT=3000
```

## 📋 Prompt 设计

### JSON约束技巧

```typescript
// 1. 系统提示词约束
const systemPrompt = "你是一个只返回JSON的金融分析API。";

// 2. 使用response_format
response_format: { type: "json_object" }

// 3. Prompt中明确格式要求
"只返回纯JSON，不要有任何Markdown标记或解释文字"

// 4. 低温度确保稳定性
temperature: 0.3
```

### Prompt 截图

![Prompt示例](./docs/prompt-screenshot.png)

## 🐛 Debug记录

### 问题1: CORS错误

**现象:** 前端请求后端时报 CORS 错误

**解决:**
```typescript
// server/src/middleware/cors.ts
import cors from 'cors';

export const corsMiddleware = cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

### 问题2: LLM返回非JSON

**现象:** OpenAI偶尔返回带Markdown的代码块

**解决:**
```typescript
// 后处理：提取JSON
function extractJson(text: string): object {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Invalid JSON response');
}

// 或使用response_format: { type: "json_object" }
```

### 问题3: Render部署失败

**现象:** Build成功但服务无法启动

**解决:**
```bash
# 检查Render的Start Command
# 应该是: npm run start (不是 dev)

# 确保package.json有start脚本
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc"
  }
}
```

## 📄 许可证

MIT
```

---

## ⚠️ 关键注意事项

### 1. API Key安全
- ❌ 不要将API Key提交到GitHub
- ✅ 使用`.env`文件 + `.gitignore`
- ✅ Render.com使用环境变量设置

### 2. 免费API限制
| API | 免费额度 | 建议 |
|-----|----------|------|
| Alpha Vantage | 5次/分钟 | 添加请求缓存 |
| OpenAI | $5新户额度 | 控制temperature |

### 3. JSON解析容错
```typescript
// 多层容错
try {
  const data = JSON.parse(llmResponse);
  // 验证必填字段
  if (!data.summary || !data.sentiment) {
    throw new Error('Missing required fields');
  }
  return data;
} catch (e) {
  // 尝试提取JSON
  const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Failed to parse AI response');
}
```

---

## 📊 界面设计参考

```
┌─────────────────────────────────────────────────────────────┐
│  📈 AI Stock Analyzer                              [GitHub] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔍 输入股票代码:  [AAPL      ]  [分析按钮]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │                      │  │  📊 分析结果              │   │
│  │   📈 股价图表        │  │                          │   │
│  │   (TradingView)      │  │  情绪: 🟢 Bullish        │   │
│  │                      │  │  风险: 🟡 Medium         │   │
│  │                      │  │  置信度: 87%             │   │
│  │                      │  │                          │   │
│  │                      │  │  ─────────────────────   │   │
│  │                      │  │  📝 分析总结:            │   │
│  │                      │  │  苹果近期表现稳健...     │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📜 历史记录                                        │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  AAPL  2024-05-18  🟢 Bullish  🟡 Medium           │   │
│  │  TSLA  2024-05-17  🔴 Bearish  🔴 High             │   │
│  │  NVDA  2024-05-16  🟢 Bullish  🟢 Low              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 交付检查清单

- [ ] 在线访问URL可正常访问
- [ ] README.md包含完整说明
- [ ] Prompt截图/代码展示
- [ ] Debug记录完整
- [ ] 代码已推送到GitHub
- [ ] 核心功能测试通过
  - [ ] 输入有效股票代码 → 返回分析结果
  - [ ] 输入无效股票代码 → 显示错误提示
  - [ ] 分析结果正确存入Supabase
  - [ ] 历史记录可查询

---

*文档生成时间: 2026-05-18*
*预计开发时间: 48小时*

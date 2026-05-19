# AI Stock Insight - 智能股票分析面板

一个精简全栈 AI 股票分析应用。用户输入股票代码后，系统会获取最新日线行情，调用商汤 SenseNova 生成严格 JSON 格式的分析结果，并把行情数据与 AI 分析结果保存到 Supabase。

> 本项目用于技术演示与面试交付，不构成任何投资建议。

## 在线访问

Railway URL: https://your-railway-url.up.railway.app

GitHub Repo: https://github.com/your-name/ai-stock-dashboard

## 功能亮点

- 输入股票代码并获取最新市场行情
- 展示收盘价、涨跌幅、成交量、日内振幅和近 7 日趋势
- 调用商汤 SenseNova 生成 AI 分析
- 强制 LLM 返回严格 JSON：`summary`、`sentiment`、`risk_level`
- 后端执行 JSON 提取、`JSON.parse()` 和枚举校验
- 将行情数据与 AI 分析结果写入 Supabase
- 展示最近 5 条云端历史分析记录
- 前端 UI 已整理为产品化展示，不再显示开发阶段信息

## 技术栈

- Frontend: React + Vite
- Backend: Node.js + Express
- Stock API: Alpha Vantage `TIME_SERIES_DAILY`
- LLM API: 商汤 SenseNova OpenAI-compatible Chat Completions
- Database: Supabase PostgreSQL
- Deployment: Railway / Render

## 系统流程

```txt
用户输入股票代码
  -> React 前端
  -> Express 后端
  -> Alpha Vantage 获取行情
  -> SenseNova 生成 JSON 分析
  -> 后端校验 JSON
  -> Supabase 入库
  -> 前端展示结果与历史记录
```

## 环境变量

本地开发时，在项目根目录创建 `.env`：

```env
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

LLM_API_KEY=your_sensenova_key
LLM_BASE_URL=https://token.sensenova.cn/v1
LLM_MODEL=sensenova-6.7-flash-lite
LLM_RESPONSE_FORMAT_JSON=false

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

STOCK_CACHE_TTL_MS=3600000
NODE_ENV=development
```

注意：

- `.env` 已被 `.gitignore` 忽略。
- `SUPABASE_SERVICE_ROLE_KEY` 只能放后端环境变量，不能放到前端。
- 商汤 API 使用 Bearer Token 鉴权；代码中通过 OpenAI SDK 的 `apiKey` 自动加入 `Authorization: Bearer <key>`，不需要手写请求头。
- 当前 SenseNova 文档截图没有明确展示 `response_format` 字段，因此默认 `LLM_RESPONSE_FORMAT_JSON=false`，通过强 Prompt + 后端校验保障 JSON 稳定性。

## Supabase 建表 SQL

进入 Supabase SQL Editor 执行：

```sql
create table if not exists stock_analyses (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  stock_data jsonb not null,
  ai_analysis jsonb not null,
  summary text not null,
  sentiment text not null check (sentiment in ('Bullish', 'Neutral', 'Bearish')),
  risk_level text not null check (risk_level in ('Low', 'Medium', 'High')),
  created_at timestamptz default now()
);

create index if not exists stock_analyses_created_at_idx
on stock_analyses (created_at desc);

create index if not exists stock_analyses_symbol_idx
on stock_analyses (symbol);
```

## 本地运行

```bash
npm run install-all
npm run dev
```

前端访问：

```txt
http://localhost:5173
```

后端健康检查：

```txt
http://localhost:3000/api/health
```

健康检查示例：

```json
{
  "ok": true,
  "message": "AI Stock Insight API 正常运行。",
  "product": "AI Stock Insight",
  "stockApiKeyLoaded": true,
  "llmKeyLoaded": true,
  "supabaseConfigured": true
}
```

## API 说明

### POST /api/stock/fetch

请求：

```json
{
  "symbol": "AAPL"
}
```

响应示例：

```json
{
  "symbol": "AAPL",
  "latestDate": "2026-05-15",
  "previousDate": "2026-05-14",
  "open": 297.9,
  "high": 303.2,
  "low": 296.52,
  "close": 300.2,
  "previousClose": 298.21,
  "change": 1.99,
  "changePercent": 0.67,
  "dayRangePercent": 2.23,
  "volume": 54862836,
  "recentCloses": [],
  "cached": false,
  "source": "Alpha Vantage TIME_SERIES_DAILY"
}
```

### POST /api/stock/analyze

请求：

```json
{
  "symbol": "AAPL",
  "stockData": {
    "symbol": "AAPL",
    "close": 300.2,
    "changePercent": 0.67,
    "recentCloses": []
  }
}
```

响应示例：

```json
{
  "summary": "AAPL 近期收盘价保持上行，最新交易日涨幅为正，短期表现偏稳。需要继续关注成交量与波动区间变化。",
  "sentiment": "Bullish",
  "risk_level": "Medium",
  "generated_at": "2026-05-18T00:00:00.000Z",
  "saved_to_supabase": true,
  "db_record": {
    "id": "...",
    "symbol": "AAPL",
    "summary": "...",
    "sentiment": "Bullish",
    "risk_level": "Medium",
    "created_at": "2026-05-18T00:00:00.000Z"
  }
}
```

### GET /api/analyses/recent

返回最近 5 条 Supabase 分析记录。

## Prompt 设计

`server/aiService.js` 中的核心 Prompt：

```js
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
`;
```

## JSON 校验策略

后端不会直接相信模型输出，而是执行：

1. 从模型回复中提取 JSON 对象。
2. 执行 `JSON.parse()`。
3. 校验字段是否只包含 `summary`、`sentiment`、`risk_level`。
4. 校验枚举值：
   - `sentiment`: `Bullish` / `Neutral` / `Bearish`
   - `risk_level`: `Low` / `Medium` / `High`

## Railway 部署

Railway Variables：

```env
NODE_ENV=production
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
LLM_API_KEY=your_sensenova_key
LLM_BASE_URL=https://token.sensenova.cn/v1
LLM_MODEL=sensenova-6.7-flash-lite
LLM_RESPONSE_FORMAT_JSON=false
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STOCK_CACHE_TTL_MS=3600000
```

Build Command：

```bash
npm run install-all && npm run build
```

Start Command：

```bash
npm start
```

## Render 部署

Render 配置与 Railway 类似：

```txt
Build Command: npm run install-all && npm run build
Start Command: npm start
```

生产环境下 Express 会托管 `client/dist`，同时提供 `/api/*` 接口。

## Debug 记录

### Issue: AI 返回内容不是合法 JSON

早期测试中，模型有时会返回 Markdown 代码块，例如：

````txt
```json
{
  "summary": "...",
  "sentiment": "Bullish",
  "risk_level": "Medium"
}
```
````

这会导致 `JSON.parse()` 报错。

### Fix

我使用 AI 工具定位后，确认问题不是 `JSON.parse()` 本身，而是 Prompt 约束不够强。解决方式：

1. 在 system prompt 中明确要求“只返回合法 JSON”。
2. 禁止 Markdown、代码块和解释性文字。
3. 固定 JSON 字段和枚举值。
4. 后端增加 JSON 提取与字段校验。

## 免责声明

本项目仅用于技术演示与学习交流，不构成投资建议。

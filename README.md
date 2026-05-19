# AI Stock Analysis Dashboard

A full-stack AI stock analysis dashboard. Users can enter a stock symbol, fetch market data from a free stock API, generate AI-based analysis in strict JSON format, and save the result to Supabase.

This project is optimized for Railway deployment from GitHub.

## Final Delivery Links

After deployment, submit these two links:

1. **Live URL:** `https://your-railway-domain.up.railway.app`
2. **GitHub Repository URL:** `https://github.com/your-name/ai-stock-dashboard-railway`

The GitHub README contains the prompt code, debug record, database schema, API details, and deployment instructions.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Stock API: Alpha Vantage
- LLM API: OpenAI or OpenAI-compatible API
- Database: Supabase PostgreSQL
- Deployment: Railway

## Core Features

- Enter stock symbol
- Fetch latest stock market data
- Generate AI analysis
- Force LLM to return strict JSON
- Validate AI response on backend
- Save stock data and AI analysis to Supabase
- Display summary, sentiment, and risk level
- Display recent Supabase analysis records

## Project Architecture

```txt
User
  -> React Frontend
  -> Express Backend
  -> Alpha Vantage Stock API
  -> LLM API
  -> Backend JSON validation
  -> Supabase
```

## Required JSON Output

The LLM must return only this JSON structure:

```json
{
  "summary": "string",
  "sentiment": "Bullish | Neutral | Bearish",
  "risk_level": "Low | Medium | High"
}
```

## Prompt Design

```js
const systemPrompt = `
You are a financial data analysis assistant.

You must return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside JSON.
Do not wrap the response in code fences.
Do not add extra keys.

The JSON schema is:
{
  "summary": "string",
  "sentiment": "Bullish | Neutral | Bearish",
  "risk_level": "Low | Medium | High"
}

Rules:
- summary must be concise, maximum 2 sentences.
- sentiment must be exactly one of: Bullish, Neutral, Bearish.
- risk_level must be exactly one of: Low, Medium, High.
- This is not financial advice.
`;
```

The backend also validates the model output before saving it to Supabase.

## API Endpoints

### GET `/api/health`

Health check endpoint.

### POST `/api/stock/fetch`

Request:

```json
{
  "symbol": "AAPL"
}
```

Response:

```json
{
  "symbol": "AAPL",
  "latestDate": "2026-05-15",
  "open": 210.1,
  "high": 212.5,
  "low": 208.7,
  "close": 211.2,
  "volume": 53400000,
  "changePercent": 1.23,
  "recentCloses": [205.3, 207.1, 209.5, 211.2]
}
```

### POST `/api/stock/analyze`

Request:

```json
{
  "symbol": "AAPL",
  "stockData": {
    "symbol": "AAPL",
    "latestDate": "2026-05-15",
    "open": 210.1,
    "high": 212.5,
    "low": 208.7,
    "close": 211.2,
    "volume": 53400000,
    "changePercent": 1.23,
    "recentCloses": [205.3, 207.1, 209.5, 211.2]
  }
}
```

Response:

```json
{
  "summary": "The stock shows mild upward momentum based on recent closing prices.",
  "sentiment": "Bullish",
  "risk_level": "Medium",
  "saved": true,
  "recordId": "uuid"
}
```

### GET `/api/analyses/recent`

Returns the latest 5 records from Supabase.

## Supabase Table

Run this SQL in Supabase SQL Editor:

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

create index if not exists stock_analyses_created_at_idx on stock_analyses (created_at desc);
create index if not exists stock_analyses_symbol_idx on stock_analyses (symbol);
```

## Environment Variables

Create these variables in Railway:

```env
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
OPENAI_API_KEY=your_openai_or_compatible_llm_key
OPENAI_MODEL=gpt-4o-mini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=production
```

Optional variables:

```env
OPENAI_BASE_URL=https://api.openai.com/v1
USE_MOCK_AI=true
USE_MOCK_STOCK=true
```

Use mock variables only for local UI testing. For final interview delivery, use real API keys.

## Local Development

```bash
npm install
npm run dev
```

Open the frontend at:

```txt
http://localhost:5173
```

The backend runs at:

```txt
http://localhost:3000
```

## Production Build

```bash
npm install
npm run build
npm start
```

## Railway Deployment

This project includes `railway.json`.

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

Railway will provide a public URL after successful deployment.

## Debug Record

### Issue: AI response JSON parse failed

During development, the LLM sometimes returned Markdown instead of pure JSON, for example:

~~~txt
Here is the analysis:
```json
{
  "summary": "...",
  "sentiment": "Bullish",
  "risk_level": "Medium"
}
```
~~~

This caused `JSON.parse()` to fail.

### Solution

I used AI tools to debug this issue. The suggestion was to make the prompt stricter and validate the response on the backend.

Fixes:

1. Added `Return ONLY valid JSON`.
2. Added `Do not include markdown`.
3. Added `Do not wrap the response in code fences`.
4. Added a JSON schema with enum values.
5. Added backend validation for `summary`, `sentiment`, and `risk_level`.
6. Added fallback JSON extraction in case the model accidentally returns code fences.

After this change, the LLM returned stable JSON:

```json
{
  "summary": "The stock shows mild upward momentum based on recent closing prices.",
  "sentiment": "Bullish",
  "risk_level": "Medium"
}
```

## Security Notes

- API keys are used only on the backend.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- Do not commit `.env` to GitHub.
- Railway Variables should store all secrets.

## Disclaimer

This project is for demo and educational purposes only. It is not financial advice.

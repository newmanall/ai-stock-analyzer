# Railway 部署说明

## 1. 构建与启动命令

Build Command:

```bash
npm run install-all && npm run build
```

Start Command:

```bash
npm start
```

## 2. 环境变量

在 Railway Variables 中配置：

```env
NODE_ENV=production
ALPHA_VANTAGE_API_KEY=你的 Alpha Vantage Key

LLM_API_KEY=你的商汤 SenseNova Key
LLM_BASE_URL=https://token.sensenova.cn/v1
LLM_MODEL=sensenova-6.7-flash-lite
LLM_RESPONSE_FORMAT_JSON=false

SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role key

STOCK_CACHE_TTL_MS=3600000
```

## 3. 部署后检查

访问：

```txt
https://你的域名/api/health
```

需要看到：

```json
{
  "stockApiKeyLoaded": true,
  "llmKeyLoaded": true,
  "supabaseConfigured": true
}
```

## 4. Alpha Vantage 限流排查

如果 `/api/stock/fetch` 返回：

```json
{
  "error": "股票 API 访问频率受限或当前 Key 暂不可用，请稍后再试。",
  "code": "ALPHA_VANTAGE_RATE_LIMIT"
}
```

说明 Railway 服务已经正常运行，但 Alpha Vantage 对当前 Key 返回了 `Note` 或 `Information`，常见原因是免费额度或访问频率被限制。

处理方式：

1. 等额度恢复；
2. 换一个新的 Alpha Vantage Key；
3. 避免演示时重复点击同一只股票；
4. 使用本版本内置的 1 小时缓存减少重复请求。

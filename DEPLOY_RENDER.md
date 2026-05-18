# Render 部署说明

本项目采用一个 Render Web Service 部署：Express 后端负责 `/api/*`，生产环境下同时托管 `client/dist` 前端静态文件。

## 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "deploy ai stock dashboard"
git branch -M main
git remote add origin https://github.com/你的用户名/ai-stock-dashboard.git
git push -u origin main
```

确认 `.env` 没有被提交。本项目 `.gitignore` 已忽略 `.env`。

## 2. Render 新建 Web Service

1. 登录 Render。
2. New + → Web Service。
3. 连接 GitHub 仓库。
4. Root Directory 留空。
5. Runtime 选择 Node。
6. Build Command 填：

```bash
npm run install-all && npm run build
```

7. Start Command 填：

```bash
npm start
```

## 3. 环境变量

在 Render 的 Environment 中添加：

```env
NODE_VERSION=20
NODE_ENV=production
ALPHA_VANTAGE_API_KEY=你的 Alpha Vantage key
LLM_API_KEY=你的商汤 SenseNova key
LLM_BASE_URL=https://token.sensenova.cn/v1
LLM_MODEL=sensenova-6.7-flash-lite
LLM_RESPONSE_FORMAT_JSON=false
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role key
```

注意：`SUPABASE_SERVICE_ROLE_KEY` 只能放在 Render 后端环境变量中，不能写到前端代码，也不能提交到 GitHub。

## 4. 部署后验证

部署完成后，打开：

```txt
https://你的服务名.onrender.com/api/health
```

正常应看到：

```json
{
  "ok": true,
  "stockApiKeyLoaded": true,
  "llmKeyLoaded": true,
  "supabaseConfigured": true
}
```

然后打开 Render 提供的主 URL，测试完整流程：

1. 输入 `MSFT` 或 `AAPL`。
2. 点击“获取行情”。
3. 点击“生成 AI 分析”。
4. 检查是否显示“已写入 Supabase”。
5. 检查 Supabase 表 `stock_analyses` 是否新增记录。

## 5. 常见问题

### 页面能打开，但接口报 404

确认 `NODE_ENV=production` 已设置。生产模式下 Express 会托管前端静态文件，并保留 `/api/*` 接口。

### `/api/health` 显示 `stockApiKeyLoaded: false`

Render 没配置 `ALPHA_VANTAGE_API_KEY`，或者变量名拼错。

### `/api/health` 显示 `llmKeyLoaded: false`

Render 没配置 `LLM_API_KEY`，或者商汤 key 没有保存成功。Render 修改环境变量后需要重新部署。

### `/api/health` 显示 `supabaseConfigured: false`

Render 缺少 `SUPABASE_URL` 或 `SUPABASE_SERVICE_ROLE_KEY`。

### AI 分析成功但没有入库

检查 Supabase 表是否已经执行 README 中的建表 SQL；同时确认使用的是 service_role key，而不是 anon public key。

### 部署日志提示找不到 vite 或 express

确认 Build Command 是：

```bash
npm run install-all && npm run build
```

不要只写 `npm install && npm run build`，因为本项目的前端和后端依赖分别在 `client/` 和 `server/` 目录中。

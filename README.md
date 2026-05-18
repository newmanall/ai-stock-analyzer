# AI 股票分析面板 - Phase 2

本阶段完成：

- 前端页面中文化和美化
- 后端接入 Alpha Vantage 真实日线行情 API
- 新增 `server/stockService.js`
- 清洗股票行情数据并返回前端
- 增加 Windows CMD / PowerShell 调试说明
- 修复 `.env` 在根目录但后端读取不到的问题

## 本地运行

```bash
npm run install-all
npm run dev
```

前端：

```txt
http://localhost:5173
```

后端健康检查：

```txt
http://localhost:3000/api/health
```

如果 `envLoaded` 是 `true`，说明后端已经读取到 `ALPHA_VANTAGE_API_KEY`。

## Windows CMD 测试接口

```cmd
curl -X POST "http://localhost:3000/api/stock/fetch" -H "Content-Type: application/json" -d "{\"symbol\":\"AAPL\"}"
```

## PowerShell 测试接口

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/stock/fetch" -ContentType "application/json" -Body '{"symbol":"AAPL"}'
```

## 环境变量

项目根目录 `.env`：

```env
ALPHA_VANTAGE_API_KEY=你的 Alpha Vantage API Key
NODE_ENV=development
```

`.env` 已经写入 `.gitignore`，不要提交到 GitHub。

## 目录说明

```txt
client/                 React + Vite 前端
server/index.js         Express 入口
server/stockService.js  Alpha Vantage 请求和数据清洗
.env.example            环境变量模板
WINDOWS_DEBUG.md        Windows 调试说明
```

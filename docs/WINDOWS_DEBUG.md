# Windows 调试说明

## 1. 确认你启动的是 Phase 2 Envfix 目录

在 CMD 中执行：

```cmd
cd /d D:\code\ai-stock-dashboard-phase2-envfix
npm run install-all
npm run dev
```

如果页面上看到英文 `Stock Insight Dashboard` 或 `Phase 1 mock response`，说明你启动的还是第一阶段旧目录。

## 2. 确认后端读取到 API Key

打开：

```txt
http://localhost:3000/api/health
```

你应该看到：

```json
{
  "ok": true,
  "envLoaded": true
}
```

如果 `envLoaded` 是 `false`，检查项目根目录是否存在 `.env` 文件，并且内容是：

```env
ALPHA_VANTAGE_API_KEY=你的 Alpha Vantage Key
NODE_ENV=development
```

## 3. Windows CMD 正确 curl 写法

CMD 里不要用 Linux 的反斜杠换行，也不要用中文/弯引号。

正确：

```cmd
curl -X POST "http://localhost:3000/api/stock/fetch" -H "Content-Type: application/json" -d "{\"symbol\":\"AAPL\"}"
```

PowerShell 推荐：

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/stock/fetch" -ContentType "application/json" -Body '{"symbol":"AAPL"}'
```

## 4. 中文乱码问题

如果 CMD 返回中文乱码，可以临时执行：

```cmd
chcp 65001
```

或者直接用浏览器访问页面测试，页面不会乱码。

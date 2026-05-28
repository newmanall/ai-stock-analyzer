# AI Stock Dashboard - AI 协作约定

> **本文件是多 Agent 反馈闭环的"大脑"存储第一层**
> FE/BE Agent 和全栈工程师在每次审计时自动加载本文件
> 所有新发现的重复性错误模式沉淀到这里

## 🔴 运行时规则
- 所有 async 路由必须有 try-catch 包裹，未 catch 的异常由全局错误中间件捕获
- 前端组件必须覆盖 4 种状态：loading → empty → data → error
- 异步调用必须有 `.catch()` 或 try-catch，可选链用于可能为 null 的属性
- 第三方 API 调用必须有超时控制（AbortController 或 Promise.race）

## 🔴 数据真实性规则
- 绝不硬编码假数据 — 使用真实 API 或显式标注 Mock
- 降级链完整：主 API → 备用 API → null/[] → 显式错误消息（含 warning 字段）
- API 未返回数据时显示 "--" 而非伪造数值
- 所有用户可见文字使用中文，错误消息统一：`{ error: "中文消息" }`

## 🟡 项目结构约定
- 路由文件：按业务功能拆分到 `server/routes/`，每个文件职责单一
- Service 文件：统一 `*Service.js` 后缀（如 `screenerService.js`）——不要用 `smartScreener.js`、`technicalAnalyzer.js` 这种无后缀命名
- 数据库操作：按表拆分到 `server/db/`，通过 `supabase.js` barrel 导出
- 前端 hooks：提取到 `client/src/hooks/`（如 `useTheme.js`、`useTabNavigation.js`）
- 前端公共组件：通过 barrel 文件（`index.js`）统一导出
- App.jsx 职责：纯编排层 + 状态管理，不超过 400 行。趋势膨胀时及时提取 hooks/组件

## 🟡 API 约定
- 所有错误响应统一格式：`{ error: "中文消息" }`
- 所有成功列表响应格式：`{ items: [...] }`
- 前端统一通过 `api.js` 的 `request()` 调用 API
- `POST /api/astock/analyze` 有超时保护（8s Promise.race）
- 路由注册统一在 `index.js`，同名路径不可分散在多个路由文件

## 🟡 业务逻辑约定
- 参数校验覆盖所有边界（空值、超长、特殊字符）
- HTTP 状态码：400 参数错误 / 404 未找到 / 500 服务错误
- 用户操作流程完整：输入 → 反馈 → 结果 → 错误恢复

## ⚠️ 已知陷阱
- 东财 push2 API 在 WSL 中不可用（UND_ERR_SOCKET），必须通过后端代理（server/services/eastmoney.js）并走降级链
- Supabase 4 张表（stock_analyses, search_history, research_reports, investment_theses）都通过 `db/client.js` 的 `supabaseRequest()` 访问
- 服务端使用 ESM（`import`/`export`），import 路径必须带 `.js` 后缀
- 两个路由文件不能挂载相同 prefix 到同一路径（如 `research_api.js` 和 `routes/researchRoutes.js` 的冲突问题）
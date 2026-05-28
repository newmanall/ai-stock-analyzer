# Code Structure（已重构 v2）

## Frontend

```
client/src/
├── App.jsx                   ← 页面编排 + 状态管理（~500 行）
├── api.js                    ← 统一 API 封装层
├── hooks/
│   ├── useTheme.js           ← 主题切换（亮/暗）状态管理
│   └── useTabNavigation.js   ← Tab 导航状态管理
├── components/
│   ├── index.js              ← barrel 导出
│   ├── MarketOverview.jsx    ← 大盘概览
│   └── common/
│       ├── index.js          ← barrel 导出（Badges, Sparkline）
│       ├── Badges.jsx        ← 情绪/风险标签
│       └── Sparkline.jsx     ← 迷你走势图
├── StockDetail.jsx           ← 股票详情卡片
├── AIAnalysisPanel.jsx       ← AI 分析结果
├── SearchPanel.jsx           ← 搜索栏 + 操作按钮
├── WatchlistPanel.jsx        ← 自选列表
├── HistoryPanel.jsx          ← 最近分析记录
├── DataManagement.jsx        ← 数据管理（3 标签页）
├── SmartScreener.jsx         ← 智能选股
├── TechAnalysis.jsx          ← 技术分析
├── CapitalFlow.jsx           ← 资金流向
├── Northbound.jsx            ← 北向资金
├── Comprehensive.jsx         ← 综合研判
├── utils/
│   ├── formatters.js         ← 纯格式化函数（null→"--"统一处理）
│   └── watchlistStorage.js   ← localStorage 自选列表
├── main.jsx
└── styles.css
```

- **组件只渲染**：事件处理和 API 调用由 App.jsx 统一管理，传入 props
- **数据降级链**：api.js 的 request() 统一处理 fetch 和错误解析
- **null 安全渲染**：formatters 统一处理 null → "--"
- **双主题**：亮/暗 CSS 变量系统，通过 useTheme hook 管理

## Backend

```
server/
├── index.js                  ← Express 启动 + 路由注册（~70 行）
├── routes/
│   ├── stockRoutes.js        ← /api/health, /api/stock/*, /api/astock/*, /api/analyses/*
│   ├── marketRoutes.js       ← /api/market/*
│   ├── screenerRoutes.js     ← /api/screener/*
│   ├── technicalRoutes.js    ← /api/technical/*
│   ├── capitalRoutes.js      ← /api/capital/*
│   ├── northboundRoutes.js   ← /api/northbound/*
│   ├── comprehensiveRoutes.js← /api/comprehensive
│   ├── financeRoutes.js      ← /api/finance/*
│   └── researchRoutes.js     ← /api/research/*（含 CRUD + AI 研判，合并自 research_api.js）
├── db/
│   ├── client.js             ← Supabase 配置 + 通用请求
│   ├── analyses.js           ← stock_analyses 表 CRUD
│   ├── searchHistory.js      ← search_history 表 CRUD
│   ├── researchReports.js    ← research_reports 表 CRUD
│   ├── investmentTheses.js   ← investment_theses 表 CRUD
│   └── schema.sql            ← 完整的 Supabase DDL
├── screenerService.js        ← 智能选股逻辑（原 smartScreener.js）
├── technicalAnalysisService.js ← 技术分析逻辑（原 technicalAnalyzer.js）
├── aiResearchAnalystService.js  ← AI 研判分析师（原 aiResearchAnalyst.js）
├── aiResearchEngineService.js   ← AI 研判引擎（原 aiResearchEngine.js）
├── stockService.js           ← 美股数据服务
├── aStockService.js          ← A 股数据服务
├── aiService.js              ← SenseNova AI 服务
├── capitalFlowService.js     ← 资金流向服务
├── northboundService.js      ← 北向资金服务
├── sectorService.js          ← 板块数据服务
├── services/
│   └── eastmoney.js          ← 东方财富免费 API 代理
├── validators.js             ← 校验层
├── supabase.js               ← barrel 导出（向后兼容）
└── scripts/                  ← 工具/测试脚本
```

- **路由分层**：index.js 只挂载，具体路由逻辑在 routes/ 中
- **Service 命名统一**：所有业务服务使用 `*Service.js` 后缀
- **数据层分层**：db/ 按表拆分，通过 supabase.js barrel 向后兼容
- **校验层独立**：validators.js 可脱离 Express 单独测试
- **降级链**：主 API → 备用 API → null → 显式错误消息

## Root

```
docs/                         ← 所有文档
AGENTS.md                     ← AI 协作约定（多 Agent 反馈闭环）
README.md                     ← 项目说明
```

## 重构对照

| 操作 | 说明 |
|------|------|
| `server/index.js` 511→70 行 + 9 个 routes/ | 路由拆分 |
| `client/src/App.jsx` 1130→500 行 + 6 组件 | 组件拆分 |
| `server/supabase.js` 424 行 → 5 个 db/ + barrel | 数据层拆分 |
| `research_api.js` → 合并到 routes/researchRoutes.js || 路由冲突修复 |
| `smartScreener.js→screenerService.js` 等 4 文件 | 命名统一 |
| `hooks/useTheme.js` + `hooks/useTabNavigation.js` | 提取 hooks |
| `components/index.js` + `components/common/index.js` | barrel 导出 |
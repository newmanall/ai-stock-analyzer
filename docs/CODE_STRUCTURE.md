# Code Structure（已重构）

## Frontend

```
client/src/
├── App.jsx                   ← 页面编排 + 状态管理（220 行）
├── api.js                    ← 统一 API 封装层
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
├── components/
│   ├── MarketOverview.jsx    ← 大盘概览
│   └── common/
│       ├── Badges.jsx        ← 情绪/风险标签
│       └── Sparkline.jsx     ← 迷你走势图
├── utils/
│   ├── formatters.js         ← 纯格式化函数
│   └── watchlistStorage.js   ← localStorage 自选列表
├── main.jsx
└── styles.css
```

- **组件只渲染**：所有事件处理和 API 调用由 App.jsx 统一管理，传入 props
- **数据降级链**：api.js 的 request() 统一处理 fetch 和错误解析
- **null 安全渲染**：formatters 统一处理 null → "--"

## Backend

```
server/
├── index.js                  ← Express 启动 + 路由注册（80 行）
├── routes/
│   ├── stockRoutes.js        ← /api/health, /api/stock/*, /api/astock/*, /api/analyses/*
│   ├── marketRoutes.js       ← /api/market/*
│   ├── screenerRoutes.js     ← /api/screener/*
│   ├── technicalRoutes.js    ← /api/technical/*
│   ├── capitalRoutes.js      ← /api/capital/*
│   ├── northboundRoutes.js   ← /api/northbound/*
│   ├── comprehensiveRoutes.js← /api/comprehensive
│   ├── financeRoutes.js      ← /api/finance/*
│   └── researchRoutes.js     ← /api/research/*（AI 研判）
├── db/
│   ├── client.js             ← Supabase 配置 + 通用请求
│   ├── analyses.js           ← stock_analyses 表 CRUD
│   ├── searchHistory.js      ← search_history 表 CRUD
│   ├── researchReports.js    ← research_reports 表 CRUD
│   ├── investmentTheses.js   ← investment_theses 表 CRUD
│   └── schema.sql            ← 完整的 Supabase DDL
├── research_api.js           ← 数据管理路由（Express Router）
├── *Service.js               ← 各类数据服务/业务逻辑
├── validators.js             ← 校验层
├── supabase.js               ← barrel 导出（向后兼容）
└── scripts/                  ← 工具/测试脚本
```

- **路由分层**：index.js 只挂载，具体路由逻辑在 routes/ 中
- **数据层分层**：db/ 按表拆分，通过 supabase.js barrel 向后兼容
- **校验层独立**：validators.js 可脱离 Express 单独测试

## Root

```
docs/                         ← 所有文档（AGENTS.md, DEVELOPMENT_LOG.md 等）
README.md                     ← 项目说明（唯一根目录文件）
```

## 拆分对照

| 原文件 | 行数 | 拆分为 | 行数 |
|--------|------|--------|------|
| `server/index.js` | 511 | `server/index.js` + 9 个 routes/ 文件 | 80 + ~500 |
| `client/src/App.jsx` | 1130 | `App.jsx` + 5 个组件 | 220 + ~900 |
| `server/supabase.js` | 424 | `db/` 5 个文件 + barrel | 18 + ~400 |

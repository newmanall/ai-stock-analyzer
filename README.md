# 🧠 AI Stock Dashboard — 智能量化投研平台

> **多因子量化选股 · 实时资金流分析 · AI 深度解读 · 全栈自动化**
>
> 由 Hermes 多 Agent 协作架构驱动的新一代智能投研系统。

<div align="center">

[![Node](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📋 目录

- [系统概述](#-系统概述)
- [核心架构](#-核心架构)
- [功能矩阵](#-功能矩阵)
- [智能选股引擎](#-智能选股引擎)
- [快速开始](#-快速开始)
- [环境变量](#-环境变量)
- [API 参考](#-api-参考)
- [项目结构](#-项目结构)
- [技术栈](#-技术栈)
- [许可证](#-许可证)

---

## 🏗️ 系统概述

**AI Stock Dashboard** 是一个面向 A 股市场的**全栈量化投研平台**，整合了：

| 模块 | 能力 |
|------|------|
| **实时行情** | 东方财富实时数据接口集群，毫秒级行情推送 |
| **智能选股** | 多因子评分引擎（流动性 × 估值 × 技术面 × 板块匹配 × 风险控制） |
| **资金流向** | 主力/超大单/大单/中单/小单逐级解析，北向资金实时追踪 |
| **AI 研报** | 大语言模型驱动：技术面解读、资金面研判、综合投资建议 |
| **估值分析** | PE/PB/市值健康度评估，行业对标分析，财务深度审查 |

**核心定位**：让机构级量化研究能力触手可及，为个人投资者提供专业、透明的辅助决策工具。

---

## 🧩 核心架构

```
┌─────────────────────────────────────────────────────┐
│                     Frontend                         │
│  React 18 · Vite 6 · 亮/暗双主题 · 响应式布局       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │
│  │行情面板│ │技术分析│ │资金流向│ │北向资金│ │智能选股  │  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘  │
└──────────────────┬──────────────────────────────────┘
                   │ REST API (Express)
┌──────────────────▼──────────────────────────────────┐
│                     Backend                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 行情服务  │ │ 选股引擎  │ │ AI 服务  │            │
│  │ EastMoney │ │ 多因子评分 │ │ SenseNova │           │
│  │ 实时行情  │ │ 降级策略  │ │ 研报生成 │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 资金分析  │ │ 估值分析  │ │ Supabase │            │
│  │ 资金流解析 │ │ 财务健康  │ │ 持久化   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└──────────────────┬──────────────────────────────────┘
                   ▼
         东方财富 API 集群 · SenseNova LLM · Supabase
```

### 多 Agent 协作流水线

系统采用 **Hermes 多 Agent 架构**，7 个专业化 Agent 角色协同工作：

| 角色 | 职责 |
|------|------|
| 🔧 **Fullstack Lead** | 架构决策、代码审查、任务分解 |
| 🎨 **FE Engineer** | 前端组件、UI 交互、主题系统 |
| ⚙️ **BE Engineer** | 后端服务、API 路由、数据管道 |
| 🔍 **Code Reviewer** | 代码质量、安全审查、最佳实践 |
| 📊 **Stock Frontend** | 股票数据展示、可视化组件 |
| 📈 **Stock Backend** | 量化逻辑、数据源集成 |
| 🎯 **Visual Designer** | UI/UX 设计、视觉一致性 |

---

## 🎯 功能矩阵

### 📊 实时行情面板
- 沪深两市实时行情（涨跌幅、成交量、成交额、换手率）
- 行业板块轮动监控与资金流向热力图
- 亮色/暗色双主题自适应

### 📈 技术面分析
- 均线系统（MA5/10/20/60）
- MACD 金叉/死叉/看涨/看跌信号检测
- RSI 超买/超卖状态监控
- KDJ 随机指标计算
- AI 技术形态解读（基于历史信号序列与当前价格结构）

### 💰 资金流向分析
- **主力净流入**：衡量大资金态度
- **超大单与大单**：机构资金动向追踪
- **中单与小单**：散户情绪辅助判断
- **北向资金实时监控**：外资进出 A 股实时数据

### 🧠 智能选股引擎
详见 [智能选股引擎](#-智能选股引擎) 章节。

### 🤖 AI 深度研报
- 技术面 AI 解读：指标组合 → 自然语言研判
- 资金面 AI 分析：资金流结构 → 主力意图解读
- 综合研判报告：技术 × 资金 × 估值三维融合

---

## 🔬 智能选股引擎

### 工作流

```
板块股票池 → 实时行情过滤 → K 线技术扫描 → 同行对标 → 排序精选 → 风险审查
```

系统模拟机构级投研的 **Sector Universe → Market Data → K-line History → Peer Fit → Shortlist → Thesis & Risk Review** 完整工作流。

### 评分模型（100 分制）

| 维度 | 权重 | 指标 |
|------|------|------|
| 📐 **技术面** | 40 分 | 均线排列、MACD 信号、RSI 区间、动量趋势 |
| 💧 **流动性** | 20 分 | 成交额等级、换手率健康度 |
| 💵 **估值** | 20 分 | PE 合理区间、PB 安全边际、行业估值修正 |
| 📊 **板块匹配** | 15 分 | 涨跌幅健康度、市值规模、板块龙头识别 |
| ⭐ **质量** | 5 分 | 风险扣分逆映射 |
| ⚠️ **风险扣分** | - | 高换手率、高 PE、高 RSI、高动量惩罚 |

### 动态数据特性

选股评分依赖**实时市场数据**（成交额、换手率、涨跌幅每秒变化），因此每次扫描结果均反映**当前市场快照**。同一只股票在不同时间点的评分差异，源于市场本身的微观波动，而非系统随机性。

### 数据降级策略（Graceful Degradation）

| 数据源 | 主数据 | 备选 | 不可用时 |
|--------|--------|------|---------|
| 行情列表 | 东方财富 API | — | 提示源不可用 |
| K 线历史 | 东方财富 | 知兔 API | 技术面评分为 0 |
| 资金流向 | 东方财富实时 | — | 返回 null（前端显示"--"） |
| 北向资金 | 东方财富实时 | — | 返回 null（前端显示"--"） |

> **数据真实性承诺**：系统**绝不生成虚构/模拟数据**。任何数据源不可用时，前端统一显示 `"--"` 占位，确保用户清晰知晓数据状态。

---

## 🚀 快速开始

### 前置要求

- Node.js 20+
- npm 10+

### 安装

```bash
# 克隆仓库
git clone https://github.com/newmanall/ai-stock-dashboard-railway.git
cd ai-stock-dashboard-railway

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env
# 编辑 .env 填入你的 API Key（见下方说明）

# 构建前端
npm run build

# 启动服务
npm start
```

访问 `http://localhost:3000`

### 开发模式

```bash
# 前端开发服务器（热更新）
npm run dev

# 独立后端
npm run server
```

---

## 🔐 环境变量

**.env 文件模板（.env.example）：**

| 变量 | 必填 | 说明 | 获取方式 |
|------|------|------|---------|
| `SUPABASE_URL` | ✅ | Supabase 项目地址 | [supabase.com](https://supabase.com) 控制台 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase 服务角色密钥（只存历史记录） | Supabase 项目设置 → API |
| `ZHITU_API_TOKEN` | ✅ | 知兔 API 令牌 | [zhituapi.com](https://zhituapi.com) |
| `ALPHA_VANTAGE_API_KEY` | ❌ | Alpha Vantage API（美股备用） | [alphavantage.co](https://alphavantage.co) |
| `OPENAI_API_KEY` | ✅ | OpenAI/SenseNova 兼容 API Key | SenseNova / OpenAI |
| `OPENAI_BASE_URL` | ❌ | 自定义 API 地址（默认 OpenAI） | — |
| `OPENAI_MODEL` | ❌ | 模型名称（默认 gpt-4o） | — |

> ⚠️ **安全说明**：`.env` 文件已加入 `.gitignore` 白名单，不会提交到版本库。所有 API 密钥通过 `process.env` 在运行时加载，代码中**无任何硬编码密钥**。

---

## 📖 API 参考

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/stock/fetch` | POST | 获取个股行情（沪深/美股） |
| `/api/stock/analyze` | POST | AI 股票分析 |
| `/api/screener/scan?sector=` | GET | 智能选股扫描 |
| `/api/screener/explain` | POST | AI 选股解读 |
| `/api/technical/analyze` | POST | 技术指标计算 |
| `/api/technical/explain` | POST | AI 技术面解读 |
| `/api/capital/flow` | POST | 资金流向数据 |
| `/api/capital/explain` | POST | AI 资金面解读 |
| `/api/northbound/analyze` | GET | 北向资金数据 |
| `/api/finance/health-assessment` | POST | 财务健康评估 |
| `/api/history` | GET | 历史搜索记录 |
| `/api/health` | GET | 服务健康检查 |

---

## 📁 项目结构

```
ai-stock-dashboard-railway/
├── client/                    # React 前端
│   ├── src/
│   │   ├── App.jsx           # 主应用（路由 + 状态管理）
│   │   ├── api.js            # API 客户端
│   │   ├── SmartScreener.jsx # 智能选股组件
│   │   ├── TechAnalysis.jsx  # 技术面分析组件
│   │   ├── CapitalFlow.jsx   # 资金流向组件
│   │   ├── Northbound.jsx    # 北向资金组件
│   │   ├── Comprehensive.jsx # 综合研判组件
│   │   ├── StockDetail.jsx   # 个股详情
│   │   ├── AIAnalysisPanel.jsx
│   │   ├── SearchPanel.jsx
│   │   ├── WatchlistPanel.jsx
│   │   ├── HistoryPanel.jsx
│   │   ├── DataManagement.jsx
│   │   ├── styles.css        # 全局样式（含主题变量）
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── utils/            # 工具函数
│   │   └── components/       # 通用组件
│   ├── vite.config.js
│   └── package.json
├── server/                    # Express 后端
│   ├── index.js              # 入口
│   ├── routes/               # API 路由
│   │   ├── stockRoutes.js
│   │   ├── screenerRoutes.js
│   │   ├── technicalRoutes.js
│   │   ├── capitalRoutes.js
│   │   ├── northboundRoutes.js
│   │   ├── financeRoutes.js
│   │   ├── researchRoutes.js
│   │   └── historyRoutes.js
│   ├── services/             # 数据服务
│   │   └── eastmoney.js      # 东方财富 API 封装
│   ├── screenerService.js    # 选股引擎（核心评分逻辑）
│   ├── capitalFlowService.js # 资金流分析
│   ├── northboundService.js  # 北向资金
│   ├── technicalAnalysisService.js  # 技术指标计算
│   ├── aiService.js          # AI 研报生成
│   └── supabase.js           # 数据库客户端
├── .env.example              # 环境变量模板
├── .gitignore
└── package.json
```

---

## 🛠️ 技术栈

### 前端
- **React 18 + Vite 6** — 极速 HMR 开发体验
- **Lucide React** — 轻量级图标系统
- **CSS 变量主题系统** — 亮/暗双主题，CSS Grid 布局

### 后端
- **Express 4** — 健壮的 HTTP 服务
- **ESM 模块** — 原生 `import/export`
- **东方财富 API** — 免费实时行情/资金流/北向数据
- **Supabase** — 搜索历史持久化

### AI
- **SenseNova / OpenAI 兼容 API** — 研报生成、选股解读
- **多 Agent 协作** — Hermes 7 角色流水线

### DevOps
- **Hermes Agent** — 智能编排与自动化
- **Git 惯例提交** — Conventional Commits
- **Railway 就绪** — 一键部署配置

---

## 📄 许可证

[MIT License](LICENSE)

---

<div align="center">
  <sub>Built with ❤️ · Powered by Hermes Multi-Agent System</sub>
</div>
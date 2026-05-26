# AI 开发过程记录

本文件记录 AI 协助开发过程中的关键决策、问题修复和代码变更。

---

## 2026-05-26 项目初始化

### 任务
- 初始化 git 仓库（本地）
- 建立开发过程记录机制
- 项目功能审计

### 操作
1. 创建 `.git/` 仓库
2. 配置 `.gitignore`（已存在，排除 node_modules、.env 等）
3. 创建 `DEVELOPMENT_LOG.md` 记录开发过程
4. 创建 `GIT_WORKFLOW.md` 定义 commit 规范
5. 首次提交：49 文件，13402 行

### 技术栈确认
- 前端: React 18 + Vite 6 + Lucide Icons
- 后端: Node.js + Express + CORS
- 美股数据: Tencent Finance API (实时)
- A股数据: Zhitu API
- LLM API: SenseNova (商汤) via OpenAI-compatible
- 数据库: Supabase PostgreSQL
- 部署: Railway

### 已实现功能
| 模块 | 功能 | API 端点 |
|------|------|----------|
| 数据获取 | 美股/A股实时行情 | `/api/stock/fetch`, `/api/astock/fetch` |
| AI 分析 | 基本面分析 (summary/sentiment/risk) | `/api/stock/analyze`, `/api/astock/analyze` |
| 智能选股 | 多维度评分筛选 + AI 解释 | `/api/screener/scan`, `/api/screener/explain` |
| 技术分析 | MA/MACD/RSI + AI 解读 | `/api/technical/analyze`, `/api/technical/explain` |
| 资金流向 | 主力资金分析 + AI 解读 | `/api/capital/analyze`, `/api/capital/explain` |
| 北向资金 | 沪股通/深股通分析 | `/api/northbound/analyze`, `/api/northbound/explain` |
| 综合研判 | 技术+资金+北向三维融合 | `/api/comprehensive` |
| 研究报告 | 机构级研报生成 | `/api/research/*` |
| 数据管理 | 自选股、搜索历史、分析记录 | Supabase 存储 |
| 市场概览 | 大盘指数、板块表现 | `/api/market/indices`, `/api/market/sectors` |

### Git 状态
- 分支: `main`
- 远程: 无（本地开发，后续配置 SSH 推送到 GitHub）
- 最新提交: `73cca75` (chore(init): initial project setup)

### 待办
- [ ] 配置 SSH 密钥推送到 GitHub
- [ ] 功能完善（见下方改进建议）

---

## 2026-05-26 功能审计与改进建议

### 项目功能审计

已完成全面功能审计，项目结构完整，核心功能已实现。

### 建议改进方向

#### 1. AI 分析质量优化
- **问题**: 当前 `temperature: 0.2` 但无 JSON mode 强制
- **建议**: 添加 `response_format: { type: "json_object" }` 确保 JSON 稳定性
- **优先级**: 高

#### 2. 性能优化
- **问题**: 多步骤分析（综合研判）串行调用，总延迟高
- **建议**: 添加请求缓存层，相同股票 5 分钟内返回缓存结果
- **优先级**: 中

#### 3. 用户体验
- **问题**: 缺少加载进度指示器（综合研判需调用 4 个 API）
- **建议**: 前端添加分步进度条，显示当前步骤
- **优先级**: 中

#### 4. 数据持久化
- **问题**: 分析记录仅存 Supabase，本地无缓存
- **建议**: 添加 IndexedDB 缓存，支持离线查看历史
- **优先级**: 低

### 下一步行动

请告诉我你想优先实现哪个改进，我会逐步实现并记录到开发日志。

---

## 2026-05-26 选股器财务维度修复

### 任务
修复 `smartScreener.js` 中毛利率计算的数据源问题

### 问题发现
- **现象**: 毛利率计算不准确
- **原因**: 东财 API 请求字段缺少 `f39`（主营收入），导致 `grossMargin = f40/f39` 回退到默认值 1
- **影响**: 所有股票的毛利率评分均为 0 或错误值

### 修复操作
1. 在 API 请求字段中添加 `f39`
2. 验证字段顺序：`f2,f3,f5,f6,f8,f9,f10,f12,f14,f15,f16,f20,f23,f37,f39,f40,f41,f46,f49`

### 变更
- 修改文件: `server/smartScreener.js` (第 88 行)
- 新增字段: `f39` (主营收入)

### 验证
- [ ] 重启服务器
- [ ] 调用 `/api/screener/scan` 测试
- [ ] 检查返回结果中 `finance.grossMargin` 是否有合理值

### 提交信息
```
fix(screener): add f39 field for gross margin calculation

- East Money API was missing f39 (主营收入) in fields list
- grossMargin = f40/f39 was falling back to default value 1
- Added f39 to API request to enable accurate gross margin scoring
```

---

## 开发记录规范

每次 AI 协助开发时，按以下格式记录：

### 日期: YYYY-MM-DD

#### 任务
简要描述本次开发任务

#### 操作
1. 具体操作步骤
2. 使用的命令或工具

#### 变更
- 新增文件: `path/to/file.js`
- 修改文件: `path/to/file.js` (描述变更)
- 删除文件: `path/to/file.js`

#### 问题与解决
| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 描述 | 根本原因 | 修复方法 |

#### 提交信息
```
type(scope): subject

- 详细变更点 1
- 详细变更点 2
```

---

## Commit 规范

使用 `type(scope): subject` 格式：

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(api): add stock analysis endpoint` |
| `fix` | 修复 bug | `fix(validation): handle null sentiment` |
| `docs` | 文档变更 | `docs(readme): add deployment instructions` |
| `refactor` | 代码重构 | `refactor(aircraft): extract validation logic` |
| `test` | 测试相关 | `test(api): add stock fetch tests` |
| `chore` | 构建/工具 | `chore(git): add development log` |

Scope 可选范围: `api`, `client`, `server`, `ai`, `db`, `deploy`, `config`

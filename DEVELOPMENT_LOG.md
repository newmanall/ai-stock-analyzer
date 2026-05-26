# AI 开发过程记录

本文件记录 AI 协助开发过程中的关键决策、问题修复和代码变更。

---

## 2026-05-26 项目初始化

### 任务
- 初始化 git 仓库
- 配置 GitHub 远程仓库
- 建立开发过程记录机制

### 操作
1. 创建 `.git/` 仓库
2. 配置 `.gitignore`（已存在，排除 node_modules、.env 等）
3. 创建 `DEVELOPMENT_LOG.md` 记录开发过程
4. 准备 GitHub 仓库创建

### 技术栈确认
- 前端: React + Vite
- 后端: Node.js + Express
- 股票 API: Alpha Vantage
- LLM API: OpenAI / 兼容 API
- 数据库: Supabase PostgreSQL
- 部署: Railway

### 待办
- [ ] GitHub 认证 (`gh auth login`)
- [ ] 创建 GitHub 仓库
- [ ] 首次提交并推送

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

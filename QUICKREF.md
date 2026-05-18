# 🚀 快速参考 - 开发协作指南

## 👥 分工

| 你 (用户) | 我 (AI) |
|-----------|---------|
| ✅ 编写/修改代码 | ✅ 审核代码结构 |
| ✅ 调整架构 | ✅ 测试功能 |
| ✅ 决定功能实现 | ✅ 编写 commit message |
| ✅ 提供代码内容 | ✅ 执行 git commit/push |
| ❌ 不让我改代码 | ❌ 不修改业务代码 |

---

## 📤 提交流程

### 步骤 1: 你修改代码后告诉我

```
示例消息:
"我修改了 server/src/services/aiAnalysis.ts，添加了重试机制
还新增了 client/src/components/Chart.tsx 股票图表组件
请测试并提交"
```

### 步骤 2: 我执行测试

```bash
# 我会运行
python3 scripts/test.py
```

### 步骤 3: 我提供 commit message 草稿

```
我会回复:

📋 测试报告:
✅ 后端编译成功
✅ 前端编译成功
✅ 健康检查通过
✅ 分析功能正常

---

📝 Commit message 草稿:

feat(analysis): add retry mechanism for AI analysis

- 添加 3 次重试机制，处理临时网络错误
- 新增 Chart 组件，集成 TradingView 图表
- 优化错误提示信息

测试: 所有测试通过

是否确认提交？(回复"确认"或"修改: xxx")
```

### 步骤 4: 你确认后我执行

```bash
git add .
git commit -m "feat(analysis): add retry mechanism for AI analysis

- 添加 3 次重试机制，处理临时网络错误
- 新增 Chart 组件，集成 TradingView 图表
- 优化错误提示信息

测试: 所有测试通过"
git push
```

### 步骤 5: 我更新任务跟踪

```
更新 TASKS.md，标记任务完成
```

---

## 📝 Commit Message 速查

### 常用类型

| 类型 | 用途 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(chart): add stock chart component` |
| `fix` | Bug 修复 | `fix(api): resolve CORS error` |
| `docs` | 文档 | `docs(readme): add installation guide` |
| `refactor` | 重构 | `refactor(server): extract AI service` |
| `style` | 格式 | `style(client): format component code` |
| `test` | 测试 | `test(api): add health check test` |
| `chore` | 工具 | `chore(deps): update dependencies` |

### 常用范围

- `server` - 后端
- `client` - 前端
- `api` - API 接口
- `db` - 数据库
- `docs` - 文档
- `ui` - UI 组件

### 示例

```
feat(api): add stock history caching

- 添加 5 分钟内存缓存，减少 API 调用
- 优化 getStockData 函数性能
- 添加缓存命中率日志

fix(client): resolve chart rendering bug

- 修复图表在移动端显示异常
- 调整响应式布局

docs(readme): add deployment guide

- 新增 DEPLOYMENT.md
- 添加 Render/Vercel 部署步骤
```

---

## 🧪 测试命令

```bash
# 运行完整测试
python3 scripts/test.py

# 仅后端编译
cd server && npm run build

# 仅前端编译
cd client && npm run build

# 启动开发环境
npm run dev

# 查看测试日志
cat scripts/test.log
```

---

## 📋 任务状态

查看 `TASKS.md` 获取最新进度。

---

## 💬 常用指令

| 你发送 | 我回复 |
|--------|--------|
| "测试并提交" | 运行测试 → 提供 commit 草稿 |
| "查看进度" | 显示 TASKS.md 摘要 |
| "帮我写 commit" | 根据修改内容生成 commit message |
| "查看最近提交" | `git log --oneline -5` |
| "回滚到上一个版本" | `git reset --hard HEAD~1` (需确认) |

---

## ⚠️ 注意事项

1. **我不会修改你的代码** — 只审核结构、测试功能、提交代码
2. **测试失败时** — 我会报告错误，由你决定如何修复
3. **架构调整** — 你可以要求我调整，我会提供方案供你确认
4. **紧急修复** — 如果线上有问题，直接告诉我，我优先处理

---

*保存此文件，随时查阅协作流程*

# 🚀 部署指南

## Render.com 后端部署

### 1. 创建 New Web Service

1. 登录 [Render.com](https://render.com)
2. 点击 "New" → "Web Service"
3. 连接 GitHub 仓库

### 2. 配置服务

| 配置项 | 值 |
|--------|-----|
| Name | `ai-stock-analyzer-api` |
| Region | 选择离用户最近的区域 |
| Branch | `main` |
| Root Directory | `server` |
| Runtime | `Node` |
| Build Command | `npm run build` |
| Start Command | `npm run start` |

### 3. 设置环境变量

在 Render 控制台的 "Environment" 标签页添加：

```
OPENAI_API_KEY=sk-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
ALPHA_VANTAGE_KEY=your-key-here
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
```

### 4. 部署

点击 "Create Web Service"，Render 会自动：
1. 拉取代码
2. 安装依赖
3. 编译 TypeScript
4. 启动服务

### 5. 验证

访问 `https://your-app.onrender.com/api/health` 应该返回：
```json
{ "status": "ok", "timestamp": "..." }
```

---

## Vercel 前端部署

### 1. 创建项目

1. 登录 [Vercel](https://vercel.com)
2. 点击 "Add New..." → "Project"
3. 导入 GitHub 仓库

### 2. 配置

| 配置项 | 值 |
|--------|-----|
| Framework Preset | `Vite` |
| Root Directory | `client` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 3. 环境变量

```
VITE_API_URL=https://your-api.onrender.com
```

### 4. 部署

点击 "Deploy"，Vercel 会自动部署。

---

## 自定义域名（可选）

### Render 后端

1. 进入服务设置
2. "Custom Domains" → "Add Domain"
3. 输入域名，按提示配置 DNS

### Vercel 前端

1. 进入项目设置
2. "Domains" → "Add"
3. 输入域名，配置 DNS

---

## 生产环境检查清单

- [ ] API Key 已配置到环境变量
- [ ] CORS 配置正确（FRONTEND_URL）
- [ ] 健康检查接口可访问
- [ ] 前端能成功调用后端 API
- [ ] 数据库连接正常
- [ ] 日志监控已配置

---

## 监控与日志

### Render 日志

```bash
# 查看实时日志
render logs <service-id>

# 或直接在控制台查看
```

### 错误追踪（可选）

添加 Sentry：

```bash
# 后端
npm install @sentry/node

# 前端
npm install @sentry/react
```

---

## 回滚

### Render

1. 进入服务页面
2. "Manual Deploys" → "Rollback"
3. 选择要回滚的版本

### Vercel

1. 进入项目页面
2. "Deployments" → 选择要回滚的部署
3. "Promote to Production"

# AI Stock Dashboard - AI 协作约定

> **本文件是多 Agent 反馈闭环的"大脑"存储第一层**
> FE/BE Agent 和全栈工程师在每次审计时自动加载本文件
> 所有新发现的重复性错误模式沉淀到这里

## 🔴 运行时规则
<!-- 新增规则写在此处 -->

## 🔴 数据真实性规则
<!-- 新增规则写在此处 -->

## 🟡 API 约定
- 所有错误响应统一格式：`{ error: "中文消息" }`
- 所有成功列表响应推荐格式：`{ items: [...] }`
- 前端统一通过 api.js 的 request() 调用 API，避免直连 fetch
- `POST /api/astock/analyze` 有超时保护（8s Promise.race）

## 🟡 业务逻辑约定
- 组件必须覆盖 4 种状态：loading → empty → data → error
- 所有用户可见文字使用中文
- API 未返回数据时显示 "--" 而非伪造数值
- 数据降级链：主 API → 备用 API → null → 显式错误消息

## ⚠️ 已知陷阱
<!-- 新增陷阱写在此处 -->

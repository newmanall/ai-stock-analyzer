# 数据造假修复报告

## 修复时间
2026-05-26

## 修复范围

### 1. A 股数据服务 (`server/aStockService.js`)

#### 修复前（造假数据）
```javascript
// 第 120-127 行 - 完全随机生成
turnoverRate: Number((Math.random() * 8 + 0.5).toFixed(2)),  // ❌ 随机换手率
pe: Number((Math.random() * 80 + 5).toFixed(2)),             // ❌ 随机 PE
totalMarketCap: Math.floor(Math.random() * 500000000000 + 5000000000), // ❌ 随机市值
amount: Math.floor(Math.random() * 10000000000) + 500000000, // ❌ 随机成交额
amplitude: Number((Math.random() * 5 + 1).toFixed(2)),       // ❌ 随机振幅
```

#### 修复后（真实数据）

| 字段 | 数据源 | 说明 |
|------|--------|------|
| `close` (现价) | 腾讯 Finance API `[3]` | ✅ 实时真实 |
| `high` (最高) | 腾讯 Finance API `[33]` | ✅ 实时真实 |
| `low` (最低) | 腾讯 Finance API `[34]` | ✅ 实时真实 |
| `amplitude` (振幅) | 腾讯 Finance API `[43]` | ✅ 实时真实 |
| `volume` (成交量) | 腾讯 Finance API `[6]` × 100 | ✅ 实时真实（手→股） |
| `amount` (成交额) | 腾讯 Finance API `[35]` 复合字段解析 | ✅ 实时真实（元） |
| `volumeRatio` (量比) | 腾讯 Finance API `[44]` | ✅ 实时真实 |
| `changePercent` (涨跌幅) | 腾讯 Finance API `[32]` | ✅ 实时真实 |
| `changeYuan` (涨跌额) | 腾讯 Finance API `[31]` | ✅ 实时真实 |
| `limitUp`/`limitDown` | 计算（主板 10%/创业板 20%） | ✅ 基于真实昨收 |
| `turnoverRate` (换手率) | 东财 API `f8`（优先）或量比估算 | ⚠️ 优先真实，回退估算 |
| `pe` (市盈率) | 东财 API `f9` | ⚠️ 需东财 API 可用 |
| `totalMarketCap` (总市值) | 东财 API `f20` | ⚠️ 需东财 API 可用 |
| `pb` (市净率) | 东财 API `f175` | ⚠️ 需东财 API 可用 |
| `dividendYield` (股息率) | 东财 API `f176` | ⚠️ 需东财 API 可用 |

#### 新增功能
- `fetchAStockFundamentals(code)` - 从东财 API 补充 PE、市值、换手率等基本面数据
- 涨停/跌停价自动适配主板（10%）和创业板/科创板（20%）

---

### 2. 美股数据服务 (`server/stockService.js`)

#### 修复前（造假数据）
```javascript
// 高/低价基于现价 ±1% 估算
high: Number((close * 1.01).toFixed(2)),  // ❌ 估算
low: Number((close * 0.99).toFixed(2)),   // ❌ 估算
```

#### 修复后（真实数据）
```javascript
// 从腾讯美股接口真实获取
high: Number(data.high.toFixed(2)),  // ✅ 字段 [7]
low: Number(data.low.toFixed(2)),    // ✅ 字段 [8]
```

---

### 3. 前端适配 (`client/src/App.jsx` + `client/src/SmartScreener.jsx`)

#### App.jsx 变更

| 变更 | 说明 |
|------|------|
| `formatVolume()` | `!value` → `value === null \|\| value === undefined \|\| value === 0`，区分 0 和 null |
| `formatMarketCap()` | 同上，区分 0 和 null |
| 条件检查 `!== undefined` | → `!= null`（同时排除 null 和 undefined） |
| **新增显示字段** | `changeYuan`（涨跌额）、`amplitude`（振幅）、`volumeRatio`（量比）、`pb`（市净率）、`dividendYield`（股息率） |
| **新增显示字段（美股）** | `amplitude`、`volumeRatio` |
| **时间戳显示** | 从 `_raw.timestamp` 解析并显示精确到秒的更新时间 |

#### SmartScreener.jsx 变更

| 变更 | 说明 |
|------|------|
| `stock.close.toFixed(2)` | → `stock.close != null ? stock.close.toFixed(2) : "--"` |
| `stock.turnoverRate.toFixed(2)` | → `stock.turnoverRate != null ? ... : "--"` |
| `stock.changePercent.toFixed(2)` | → `stock.changePercent?.toFixed(2) ?? "--"` |
| **新增显示字段** | `amplitude`（振幅） |

---

## 数据源说明

### 腾讯 Finance API（已验证可用）
- **A 股**: `https://qt.gtimg.cn/q=sh600519` 或 `sz000001`
- **美股**: `https://qt.gtimg.cn/q=usAAPL`
- **编码**: GBK
- **字段数**: 88 个（A 股）

### 东财 API（当前环境不可达）
- **用途**: 补充 PE、总市值、换手率等基本面数据
- **状态**: ⚠️ 网络不可达，返回 `null`（优于造假）
- **建议**: 在可访问东财 API 的环境中启用完整功能

### 智兔 API（需配置）
- **用途**: 历史 K 线数据（用于技术指标计算）
- **配置**: 需设置 `ZHITU_API_TOKEN` 环境变量
- **回退**: 无历史数据时使用基于昨收的合理估算

---

## 验证结果

### 贵州茅台 (600519) 实测数据
```
✅ 名称: 贵州茅台
✅ 价格: 1273.38
✅ 最高: 1289.89
✅ 最低: 1270.01
✅ 振幅: 1.55%
✅ 成交额: 58.68亿
✅ 涨跌幅: -0.97%
✅ 量比: 0.37
⚠️  PE: null (东财 API 不可达)
⚠️  总市值: null (东财 API 不可达)
```

---

## 前端 null 值处理策略

| 场景 | 处理方式 | 示例 |
|------|----------|------|
| `formatNumber(null)` | 返回 `"--"` | 市盈率未获取时显示 `--` |
| `formatVolume(null)` | 返回 `"--"` | 成交额未获取时显示 `--` |
| `formatMarketCap(null)` | 返回 `"--"` | 总市值未获取时显示 `--` |
| `!= null` 条件渲染 | 隐藏整个 stat-item | PE 为 null 时不显示市盈率卡片 |
| `?.toFixed() ?? "--"` | 内联显示 `--` | 换手率直接显示 `--` 而非隐藏 |

---

## 后续建议

1. **启用东财 API** - 在可访问的环境中配置网络代理或白名单
2. **配置智兔 API Token** - 设置 `ZHITU_API_TOKEN` 环境变量获取真实 K 线
3. **前端处理 null 值** - 已实现：null 值显示 `"--"` 或隐藏对应卡片

---

## 文件变更

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `server/aStockService.js` | 重写 | 修复 6 个造假字段，新增东财 API 补充 |
| `server/stockService.js` | 重写 | 修复高/低价估算，接入智兔 K 线 |
| `client/src/App.jsx` | 适配 | null 安全处理 + 新增 5 个显示字段 |
| `client/src/SmartScreener.jsx` | 适配 | null 安全处理 + 新增振幅字段 |

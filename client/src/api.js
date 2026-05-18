export async function fetchStockData(symbol) {
  const response = await fetch("/api/stock/fetch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ symbol })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "获取股票行情失败。");
  }

  return data;
}

export async function analyzeStockData(symbol, stockData) {
  const response = await fetch("/api/stock/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ symbol, stockData })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "生成 AI 分析失败。");
  }

  return data;
}

export async function fetchRecentAnalyses(limit = 5) {
  const response = await fetch(`/api/analyses/recent?limit=${limit}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "读取历史分析记录失败。");
  }

  return data;
}

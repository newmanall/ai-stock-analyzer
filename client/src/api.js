async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  return payload;
}

// US Stock
export function fetchStock(symbol) {
  return request("/api/stock/fetch", {
    method: "POST",
    body: JSON.stringify({ symbol }),
  });
}

export function analyzeStock(symbol, stockData) {
  return request("/api/stock/analyze", {
    method: "POST",
    body: JSON.stringify({ symbol, stockData }),
  });
}

// A-Share
export function fetchAStock(code) {
  return request("/api/astock/fetch", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function analyzeAStock(code, stockData) {
  return request("/api/astock/analyze", {
    method: "POST",
    body: JSON.stringify({ code, stockData }),
  });
}

// Market Overview
export function fetchMarketIndices(market = "cn") {
  return request(`/api/market/indices?market=${market}`);
}

export function fetchSectorPerformance() {
  return request("/api/market/sectors");
}

// Recent analyses
export function fetchRecentAnalyses() {
  return request("/api/analyses/recent");
}

// ── Smart Screener ──────────────────────────────────────────────────────────

export function scanMarket(sector = "all") {
  return request(`/api/screener/scan?sector=${encodeURIComponent(sector)}`);
}

export function explainSmartPick(stocks, marketContext) {
  return request("/api/screener/explain", {
    method: "POST",
    body: JSON.stringify({ stocks, marketContext }),
  });
}

// ── Technical Analysis ─────────────────────────────────────────────────────

export function analyzeTechnical(code) {
  return request("/api/technical/analyze", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function explainTechnical(data) {
  return request("/api/technical/explain", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Capital Flow ────────────────────────────────────────────────────────────

export function analyzeCapitalFlow(code) {
  return request("/api/capital/analyze", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function explainCapitalFlow(data) {
  return request("/api/capital/explain", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Northbound ──────────────────────────────────────────────────────────────

export function analyzeNorthbound() {
  return request("/api/northbound/analyze");
}

export function explainNorthbound(data) {
  return request("/api/northbound/explain", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Comprehensive Analysis ──────────────────────────────────────────────────

export function comprehensiveAnalysis(data) {
  return request("/api/comprehensive", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Data Management (Research API) ──────────────────────────────────────────

export function saveSearchHistory({ symbol, name, sector, analysisType, resultCount }) {
  return request("/api/research/search-history", {
    method: "POST",
    body: JSON.stringify({ symbol, name, sector, analysisType, resultCount }),
  });
}

export function fetchSearchHistory(limit = 20) {
  return request(`/api/research/search-history?limit=${limit}`);
}

export function deleteSearchHistory(id) {
  return request(`/api/research/search-history/${id}`, {
    method: "DELETE",
  });
}

export function clearAllSearchHistory() {
  return request("/api/research/search-history", {
    method: "DELETE",
  });
}

export function fetchResearchReports(limit = 10) {
  return request(`/api/research/research-reports?limit=${limit}`);
}

export function deleteResearchReport(id) {
  return request(`/api/research/research-reports/${id}`, {
    method: "DELETE",
  });
}

export function fetchInvestmentTheses(limit = 20, status = "active") {
  return request(`/api/research/investment-theses?limit=${limit}&status=${status}`);
}

export function deleteInvestmentThesis(id) {
  return request(`/api/research/investment-theses/${id}`, {
    method: "DELETE",
  });
}

export function updateThesisStatus(id, status) {
  return request(`/api/research/investment-theses/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteAnalysis(id) {
  return request(`/api/research/analyses/${id}`, {
    method: "DELETE",
  });
}
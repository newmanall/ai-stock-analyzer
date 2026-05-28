import { supabaseRequest, getSupabaseConfig } from "./client.js";

/**
 * 检查并创建 Supabase 表（如果不存在）
 */
export async function ensureTablesExist() {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, error: "Supabase not configured" };

  const { data, error } = await supabaseRequest("/rest/v1/stock_analyses?select=id&limit=1");

  if (error) {
    if (error.status === 404) {
      return { ok: false, error: "Table stock_analyses not found. Run supabase-schema.sql in Supabase SQL Editor." };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, message: "Table exists", sample: data?.[0] };
}

/**
 * 保存分析结果到 Supabase
 */
export async function saveAnalysis({ symbol, stockData, analysis }) {
  const config = getSupabaseConfig();
  if (!config) {
    return { saved: false, record: null, warning: "Supabase not configured" };
  }

  const record = {
    symbol,
    stock_data: {
      low: stockData.low,
      high: stockData.high,
      open: stockData.open,
      close: stockData.close,
      change: stockData.changeYuan,
      source: "tencent_finance",
      symbol: stockData.symbol,
      volume: stockData.volume,
      latestDate: stockData.latestDate,
      previousDate: null,
      recentCloses: [],
      changePercent: stockData.changePercent,
      previousClose: stockData.previousClose,
      dayRangePercent: stockData.amplitude
    },
    ai_analysis: {
      summary: analysis.summary,
      llm_model: analysis._data_source?.llm_model || "sensenova-6.7-flash-lite",
      sentiment: analysis.sentiment,
      risk_level: analysis.risk_level,
      llm_base_url: process.env.OPENAI_BASE_URL || "openai-compatible-api-url",
      llm_provider: "SenseNova / OpenAI-compatible"
    },
    summary: analysis.summary,
    sentiment: analysis.sentiment,
    risk_level: analysis.risk_level,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabaseRequest("/rest/v1/stock_analyses", {
    method: "POST",
    body: JSON.stringify(record)
  });

  if (error) {
    console.warn(`[saveAnalysis] Supabase insert error for ${symbol}: ${error.message}`);
    return { saved: false, record: null, warning: `保存失败：${error.message}` };
  }

  return { saved: true, record: data };
}

/**
 * 获取历史分析记录
 */
export async function getAnalysisHistory(symbol, limit = 10) {
  const config = getSupabaseConfig();
  if (!config) return { records: [], error: "Supabase not configured" };

  const { data, error } = await supabaseRequest(
    `/rest/v1/stock_analyses?select=*&symbol=eq.${symbol}&order=created_at.desc&limit=${limit}`
  );

  if (error) {
    return { records: [], error: error.message };
  }

  return { records: data || [] };
}

/**
 * 获取所有分析记录（分页）
 */
export async function getAllAnalyses(page = 1, limit = 20) {
  const config = getSupabaseConfig();
  if (!config) return { records: [], error: "Supabase not configured" };

  const offset = (page - 1) * limit;
  const { data, error } = await supabaseRequest(
    `/rest/v1/stock_analyses?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`
  );

  if (error) {
    return { records: [], error: error.message };
  }

  return { records: data || [] };
}

/**
 * 获取最近 N 条分析记录（简化版，直接返回数组）
 */
export async function getRecentAnalyses(limit = 5) {
  const { records } = await getAllAnalyses(1, limit);
  return records;
}

/**
 * 删除分析记录
 */
export async function deleteAnalysis(id) {
  const config = getSupabaseConfig();
  if (!config) return { deleted: false, error: "Supabase not configured" };

  const { error } = await supabaseRequest(`/rest/v1/stock_analyses?id=eq.${id}`, {
    method: "DELETE"
  });

  if (error) return { deleted: false, error: error.message };
  return { deleted: true };
}

/**
 * 清空所有分析记录
 */
export async function clearAllAnalyses() {
  const config = getSupabaseConfig();
  if (!config) return { cleared: false, error: "Supabase not configured" };

  const { error } = await supabaseRequest("/rest/v1/stock_analyses", {
    method: "DELETE"
  });

  if (error) return { cleared: false, error: error.message };
  return { cleared: true };
}
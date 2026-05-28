import { supabaseRequest, getSupabaseConfig } from "./client.js";

/**
 * 保存搜索历史记录
 */
export async function saveSearchHistory({ symbol, name, sector, analysisType, resultCount }) {
  const config = getSupabaseConfig();
  if (!config) {
    return { saved: false, error: "Supabase not configured" };
  }

  const record = {
    symbol,
    name: name || symbol,
    sector: sector || '',
    analysis_type: analysisType || 'screener',
    result_count: resultCount || 0,
    created_at: new Date().toISOString()
  };

  const { error } = await supabaseRequest("/rest/v1/search_history", {
    method: "POST",
    body: JSON.stringify(record)
  });

  if (error) {
    console.warn(`[saveSearchHistory] Error: ${error.message}`);
    return { saved: false, error: error.message };
  }

  return { saved: true };
}

/**
 * 获取搜索历史记录
 */
export async function getSearchHistory(limit = 20) {
  const config = getSupabaseConfig();
  if (!config) return { items: [], error: "Supabase not configured" };

  const { data, error } = await supabaseRequest(
    `/rest/v1/search_history?select=*&order=created_at.desc&limit=${limit}`
  );

  if (error) return { items: [], error: error.message };
  return { items: data || [] };
}

/**
 * 删除搜索历史记录
 */
export async function deleteSearchHistory(id) {
  const config = getSupabaseConfig();
  if (!config) return { deleted: false, error: "Supabase not configured" };

  const { error } = await supabaseRequest(`/rest/v1/search_history?id=eq.${id}`, {
    method: "DELETE"
  });

  if (error) return { deleted: false, error: error.message };
  return { deleted: true };
}

/**
 * 清空所有搜索历史记录
 */
export async function clearAllSearchHistory() {
  const config = getSupabaseConfig();
  if (!config) return { cleared: false, error: "Supabase not configured" };

  const { error } = await supabaseRequest("/rest/v1/search_history", {
    method: "DELETE"
  });

  if (error) return { cleared: false, error: error.message };
  return { cleared: true };
}
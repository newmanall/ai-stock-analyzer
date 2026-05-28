import { supabaseRequest, getSupabaseConfig } from "./client.js";

/**
 * 保存投资论点
 */
export async function saveInvestmentThesis({ symbol, name, thesisStatement, pillars, risks, catalysts, targetPrice, recommendation }) {
  const config = getSupabaseConfig();
  if (!config) return { saved: false, error: "Supabase not configured" };

  const record = {
    symbol,
    name,
    thesis_statement: thesisStatement || "",
    pillars: pillars || [],
    risks: risks || [],
    catalysts: catalysts || [],
    target_price: targetPrice || null,
    recommendation: recommendation || "hold",
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabaseRequest("/rest/v1/investment_theses", {
    method: "POST",
    body: JSON.stringify(record)
  });

  if (error) return { saved: false, error: error.message };
  return { saved: true, record: data };
}

/**
 * 获取投资论点列表
 */
export async function getInvestmentTheses(limit = 20) {
  const config = getSupabaseConfig();
  if (!config) return { items: [], error: "Supabase not configured" };

  const { data, error } = await supabaseRequest(
    `/rest/v1/investment_theses?select=*&order=created_at.desc&limit=${limit}`
  );

  if (error) return { items: [], error: error.message };
  return { items: data || [] };
}

/**
 * 更新投资论点状态
 */
export async function updateThesisStatus(id, status) {
  const config = getSupabaseConfig();
  if (!config) return { updated: false, error: "Supabase not configured" };

  const { data, error } = await supabaseRequest(`/rest/v1/investment_theses?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, updated_at: new Date().toISOString() })
  });

  if (error) return { updated: false, error: error.message };
  return { updated: true, record: data };
}

/**
 * 删除投资论点
 */
export async function deleteInvestmentThesis(id) {
  const config = getSupabaseConfig();
  if (!config) return { deleted: false, error: "Supabase not configured" };

  const { error } = await supabaseRequest(`/rest/v1/investment_theses?id=eq.${id}`, {
    method: "DELETE"
  });

  if (error) return { deleted: false, error: error.message };
  return { deleted: true };
}
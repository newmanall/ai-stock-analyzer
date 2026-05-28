import { supabaseRequest, getSupabaseConfig } from "./client.js";

/**
 * 保存研究报告
 */
export async function saveResearchReport({ reportId, sector, reportType, content, summary, topPicks }) {
  const config = getSupabaseConfig();
  if (!config) return { saved: false, error: "Supabase not configured" };

  const record = {
    report_id: reportId,
    sector,
    report_type: reportType || "sector_overview",
    content: content || {},
    summary: summary || "",
    top_picks: topPicks || [],
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabaseRequest("/rest/v1/research_reports", {
    method: "POST",
    body: JSON.stringify(record)
  });

  if (error) return { saved: false, error: error.message };
  return { saved: true, record: data };
}

/**
 * 获取研究报告列表
 */
export async function getResearchReports(limit = 10) {
  const config = getSupabaseConfig();
  if (!config) return { items: [], error: "Supabase not configured" };

  const { data, error } = await supabaseRequest(
    `/rest/v1/research_reports?select=*&order=created_at.desc&limit=${limit}`
  );

  if (error) return { items: [], error: error.message };
  return { items: data || [] };
}

/**
 * 删除研究报告
 */
export async function deleteResearchReport(id) {
  const config = getSupabaseConfig();
  if (!config) return { deleted: false, error: "Supabase not configured" };

  const { error } = await supabaseRequest(`/rest/v1/research_reports?id=eq.${id}`, {
    method: "DELETE"
  });

  if (error) return { deleted: false, error: error.message };
  return { deleted: true };
}
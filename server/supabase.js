import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn("Supabase is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    return null;
  }

  try {
    return createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } catch (err) {
    console.warn(`Supabase client creation failed: ${err.message}`);
    return null;
  }
}

export async function saveAnalysis({ symbol, stockData, analysis }) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — skipping saveAnalysis.");
    return {
      saved: false,
      warning: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Railway variables."
    };
  }

  const { data, error } = await supabase
    .from("stock_analyses")
    .insert({
      symbol,
      stock_data: stockData,
      ai_analysis: analysis,
      summary: analysis.summary,
      sentiment: analysis.sentiment,
      risk_level: analysis.risk_level
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  return {
    saved: true,
    record: data
  };
}

export async function getRecentAnalyses(limit = 5) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — returning empty list for getRecentAnalyses.");
    return [];
  }

  const { data, error } = await supabase
    .from("stock_analyses")
    .select("id, symbol, name, summary, sentiment, risk_level, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  return data || [];
}

// ==================== 新增功能：搜索历史 ====================

export async function saveSearchHistory({ symbol, name, sector, analysisType, resultCount, user_ip = "local" }) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — skipping saveSearchHistory.");
    return { saved: false };
  }

  const { data, error } = await supabase
    .from("search_history")
    .insert({
      symbol,
      name,
      sector,
      analysis_type: analysisType,
      result_count: resultCount,
      user_ip: user_ip
    })
    .select()
    .single();

  if (error) {
    // 表可能不存在，先记录
    console.warn(`Search history insert failed: ${error.message}`);
    return { saved: false, error: error.message };
  }

  return { saved: true, record: data };
}

export async function getSearchHistory(limit = 20) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — returning empty list for getSearchHistory.");
    return [];
  }

  const { data, error } = await supabase
    .from("search_history")
    .select("id, symbol, name, sector, analysis_type, result_count, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // 表可能不存在
    console.warn(`Search history query failed: ${error.message}`);
    return [];
  }

  return data || [];
}

export async function deleteSearchHistory(id) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — skipping deleteSearchHistory.");
    return { deleted: false };
  }

  const { error } = await supabase
    .from("search_history")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Search history delete failed: ${error.message}`);
  }

  return { deleted: true };
}

export async function clearAllSearchHistory() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — skipping clearAllSearchHistory.");
    return { cleared: false };
  }

  const { error } = await supabase
    .from("search_history")
    .delete()
    .neq("id", 0); // 删除所有记录

  if (error) {
    throw new Error(`Clear all search history failed: ${error.message}`);
  }

  return { cleared: true };
}

// ==================== 新增功能：研判报告 ====================

export async function saveResearchReport({ reportId, sector, reportType, content, summary, topPicks }) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — skipping saveResearchReport.");
    return { saved: false };
  }

  const { data, error } = await supabase
    .from("research_reports")
    .insert({
      report_id: reportId,
      sector,
      report_type: reportType,
      content,
      summary,
      top_picks: topPicks,
      page_count: 12 // 默认8-12页机构级报告
    })
    .select()
    .single();

  if (error) {
    console.warn(`Research report insert failed: ${error.message}`);
    return { saved: false, error: error.message };
  }

  return { saved: true, record: data };
}

export async function getResearchReports(limit = 10) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — returning empty list for getResearchReports.");
    return [];
  }

  const { data, error } = await supabase
    .from("research_reports")
    .select("id, report_id, sector, report_type, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`Research reports query failed: ${error.message}`);
    return [];
  }

  return data || [];
}

export async function deleteResearchReport(id) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — skipping deleteResearchReport.");
    return { deleted: false };
  }

  const { error } = await supabase
    .from("research_reports")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Research report delete failed: ${error.message}`);
  }

  return { deleted: true };
}

// ==================== 新增功能：投资论点 ====================

export async function saveInvestmentThesis({ symbol, name, thesisStatement, pillars, risks, catalysts, targetPrice, recommendation }) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — skipping saveInvestmentThesis.");
    return { saved: false };
  }

  const { data, error } = await supabase
    .from("investment_theses")
    .insert({
      symbol,
      name,
      thesis_statement: thesisStatement,
      pillars,
      risks,
      catalysts,
      target_price: targetPrice,
      recommendation,
      status: "active"
    })
    .select()
    .single();

  if (error) {
    console.warn(`Investment thesis insert failed: ${error.message}`);
    return { saved: false, error: error.message };
  }

  return { saved: true, record: data };
}

export async function getInvestmentTheses(limit = 20) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — returning empty list for getInvestmentTheses.");
    return [];
  }

  const { data, error } = await supabase
    .from("investment_theses")
    .select("id, symbol, name, thesis_statement, target_price, recommendation, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`Investment theses query failed: ${error.message}`);
    return [];
  }

  return data || [];
}

export async function updateThesisStatus(id, status) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — skipping updateThesisStatus.");
    return { updated: false };
  }

  const { error } = await supabase
    .from("investment_theses")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Thesis status update failed: ${error.message}`);
  }

  return { updated: true };
}

export async function deleteInvestmentThesis(id) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — skipping deleteInvestmentThesis.");
    return { deleted: false };
  }

  const { error } = await supabase
    .from("investment_theses")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Investment thesis delete failed: ${error.message}`);
  }

  return { deleted: true };
}

// ==================== 新增功能：分析记录删除 ====================

export async function deleteAnalysis(id) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — skipping deleteAnalysis.");
    return { deleted: false };
  }

  const { error } = await supabase
    .from("stock_analyses")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Analysis delete failed: ${error.message}`);
  }

  return { deleted: true };
}

export async function clearAllAnalyses() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn("Supabase not available — skipping clearAllAnalyses.");
    return { cleared: false };
  }

  const { error } = await supabase
    .from("stock_analyses")
    .delete()
    .neq("id", 0);

  if (error) {
    throw new Error(`Clear all analyses failed: ${error.message}`);
  }

  return { cleared: true };
}
import { createClient } from "@supabase/supabase-js";

let cachedClient = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("后端缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 环境变量，暂时无法写入 Supabase。");
  }

  if (!cachedClient) {
    cachedClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return cachedClient;
}

export async function saveAnalysisRecord({ symbol, stockData, analysis }) {
  const supabase = getSupabaseClient();

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
    .select("id, symbol, summary, sentiment, risk_level, created_at")
    .single();

  if (error) {
    throw new Error(`Supabase 写入失败：${error.message}`);
  }

  return data;
}

export async function getRecentAnalysisRecords(limit = 5) {
  const supabase = getSupabaseClient();

  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);

  const { data, error } = await supabase
    .from("stock_analyses")
    .select("id, symbol, summary, sentiment, risk_level, created_at")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`读取 Supabase 历史记录失败：${error.message}`);
  }

  return data || [];
}

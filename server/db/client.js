import "dotenv/config";

let _supabaseConfig = null;

export function getSupabaseConfig() {
  if (_supabaseConfig) return _supabaseConfig;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn("Supabase is not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    return null;
  }

  _supabaseConfig = {
    url: url.replace(/\/$/, ""),
    key: serviceRoleKey,
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    }
  };

  return _supabaseConfig;
}

/**
 * 执行 Supabase REST API 请求
 */
export async function supabaseRequest(endpoint, options = {}) {
  const config = getSupabaseConfig();
  if (!config) {
    return { error: { message: "Supabase not configured" } };
  }

  const url = `${config.url}${endpoint}`;
  const fetchOptions = {
    ...options,
    headers: {
      ...config.headers,
      ...options.headers
    },
    signal: AbortSignal.timeout(10000) // 10秒超时
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText, status: response.status };
      }
      return { error: { message: errorData.message || errorData.error || "Request failed", status: response.status } };
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return { data, error: null };
    } else {
      return { data: null, error: null };
    }
  } catch (err) {
    if (err.name === "AbortError") {
      return { error: { message: "Request timeout", status: 408 } };
    }
    return { error: { message: err.message, status: 0 } };
  }
}
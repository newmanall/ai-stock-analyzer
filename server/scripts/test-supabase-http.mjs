import "dotenv/config";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("SUPABASE_URL:", url ? "SET" : "MISSING");
console.log("SUPABASE_KEY:", key ? "SET" : "MISSING");

if (url && key) {
  // 使用纯 HTTP 请求访问 Supabase REST API
  const supabaseUrl = url.replace(/\/$/, "");
  const headers = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  
  // 测试连接
  const testUrl = `${supabaseUrl}/rest/v1/stock_analyses?select=*&limit=1`;
  
  try {
    const response = await fetch(testUrl, { headers });
    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.log("Error:", err.message);
  }
} else {
  console.log("Supabase not configured");
}

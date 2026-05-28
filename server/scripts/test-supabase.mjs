import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("SUPABASE_URL:", url ? "SET" : "MISSING");
console.log("SUPABASE_KEY:", key ? "SET" : "MISSING");

if (url && key) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  console.log("Client created successfully");
  
  // 测试连接
  const { data, error } = await client.from('stock_analyses').select('*').limit(1);
  if (error) {
    console.log("Query error:", error.message);
  } else {
    console.log("Tables exist, data:", data);
  }
} else {
  console.log("Supabase not configured");
}

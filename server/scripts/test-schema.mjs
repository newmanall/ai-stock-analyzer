import "dotenv/config";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (url && key) {
  const headers = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  
  // 获取表结构
  const { data, error } = await fetch(`${url.replace(/\/$/, "")}/rest/v1/stock_analyses?select=*&limit=1`, { headers }).then(r => r.json());
  
  if (error) {
    console.log("Error:", error);
  } else if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
    console.log("Sample:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("No data or error");
  }
}

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('错误: 缺少环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const TABLES = ['search_history', 'research_reports', 'investment_theses'];

async function checkTables() {
  console.log('检查表是否存在...\n');
  
  for (const table of TABLES) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.log(`  ✗ ${table} — 不存在`);
        } else {
          console.log(`  ? ${table} — ${error.message}`);
        }
      } else {
        console.log(`  ✓ ${table} — 已存在 (${count} 条记录)`);
      }
    } catch (e) {
      console.log(`  ✗ ${table} — ${e.message}`);
    }
  }
}

async function execSQL(query) {
  // 尝试通过 RPC 执行
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function createTableViaRPC(tableName, columnsSQL) {
  // Supabase doesn't allow DDL via REST API, but we can try
  // Using the management API through raw HTTP
  const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnsSQL})`;
  return await execSQL(query);
}

async function main() {
  await checkTables();
  
  // 尝试通过 Management API 执行SQL
  console.log('\n尝试通过 Supabase Management API 执行 SQL...');
  
  const managementUrl = `https://api.supabase.com/v1/projects/drkyejfdazpqnumaxxed/query`;
  
  // 读取SQL文件
  const sqlPath = path.join(__dirname, '..', 'output', 'supabase_migration.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
  
  try {
    const response = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sqlContent })
    });
    
    const result = await response.text();
    console.log(`Management API 响应 (${response.status}):`, result.substring(0, 200));
  } catch (e) {
    console.log('Management API 失败:', e.message);
  }
  
  console.log('\n=== SQL 迁移文件路径 ===');
  console.log(sqlPath);
  console.log('\n=== 请在 Supabase SQL Editor 中执行 ===');
  console.log('1. 打开 https://app.supabase.com/project/drkyejfdazpqnumaxxed/sql/new');
  console.log('2. 粘贴以下 SQL');
  console.log('3. 点击 Run');
}

main().catch(console.error);
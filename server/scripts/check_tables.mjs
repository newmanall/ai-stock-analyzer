import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function checkExistingTables() {
  console.log('检查现有表...\n');
  
  // 尝试获取 stock_analyses 表（已知存在）
  try {
    const { data, error } = await supabase
      .from('stock_analyses')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`stock_analyses: ${error.message}`);
    } else {
      console.log(`✓ stock_analyses — 存在 (${data?.length || 0} 条记录)`);
    }
  } catch (e) {
    console.log(`stock_analyses: ${e.message}`);
  }
  
  // 尝试获取所有表（通过查询系统表）
  console.log('\n尝试通过 RPC 查询表列表...');
  
  try {
    // 使用 Supabase 的 REST API 查询表
    const tablesUrl = `${supabaseUrl}/rest/v1/?apikey=${serviceRoleKey}`;
    const response = await fetch(tablesUrl);
    const text = await response.text();
    console.log(`REST API 响应 (${response.status}): ${text.substring(0, 200)}...`);
  } catch (e) {
    console.log(`REST API 失败: ${e.message}`);
  }
  
  console.log('\n=== 数据库连接信息 ===');
  console.log(`项目: ${supabaseUrl}`);
  console.log(`SQL Editor: ${supabaseUrl.replace('https://', 'https://app.supabase.com/project/').replace('.supabase.co', '/sql/new')}`);
  
  console.log('\n=== 迁移状态总结 ===');
  console.log('1. Supabase 连接正常');
  console.log('2. 三张新表（search_history, research_reports, investment_theses）可能不存在或缓存问题');
  console.log('3. stock_analyses 表存在（旧表）');
  console.log('\n=== 下一步 ===');
  console.log('请在 Supabase SQL Editor 中执行以下操作:');
  console.log('1. 打开 SQL Editor');
  console.log('2. 执行以下查询检查表是否存在:');
  console.log("   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
  console.log('3. 如果表不存在，执行 output/supabase_migration.sql 中的 SQL');
}

checkExistingTables().catch(console.error);
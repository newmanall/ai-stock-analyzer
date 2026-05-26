import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TABLES = ['search_history', 'research_reports', 'investment_theses', 'stock_analyses'];

async function main() {
  console.log('验证 Supabase 表结构...\n');
  
  for (const table of TABLES) {
    try {
      // 先尝试插入一条测试记录来确认表结构完整
      const testRecord = {
        search_history: { symbol: '_VERIFY_', name: '_VERIFY_', sector: 'test', analysis_type: 'test', result_count: 0, user_ip: 'test' },
        research_reports: { report_id: '_VERIFY_' + Date.now(), sector: 'test', report_type: 'test', content: {}, summary: 'test', top_picks: [], page_count: 0 },
        investment_theses: { symbol: '_VERIFY_', name: '_VERIFY_', thesis_statement: 'test', pillars: {}, risks: [], catalysts: [], target_price: 0, recommendation: 'hold', status: 'test' },
        stock_analyses: { symbol: '_VERIFY_', stock_data: {}, ai_analysis: {}, summary: 'test', sentiment: 'neutral', risk_level: 'low' }
      };
      
      const rec = testRecord[table];
      if (!rec) {
        console.log(`  ? ${table}: 无测试数据定义`);
        continue;
      }
      
      const { data, error } = await supabase.from(table).insert(rec).select().single();
      
      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log(`  ✗ ${table}: 表不存在`);
        } else if (error.message.includes('schema cache')) {
          console.log(`  ✗ ${table}: schema缓存问题 - ${error.message.substring(0, 60)}`);
        } else {
          console.log(`  ✗ ${table}: ${error.message.substring(0, 80)}`);
        }
      } else {
        console.log(`  ✓ ${table}: 表正常 (插入成功, id=${data.id})`);
        // 清理
        if (table === 'stock_analyses') {
          await supabase.from(table).delete().eq('symbol', '_VERIFY_');
        } else {
          await supabase.from(table).delete().eq('id', data.id);
        }
      }
    } catch (e) {
      console.log(`  ✗ ${table}: ${e.message.substring(0, 60)}`);
    }
  }
}

main().catch(e => console.error('Fatal:', e.message));
// 使用 Supabase 管理 API 执行 SQL
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

const sqlStatements = [
  `CREATE TABLE IF NOT EXISTS search_history (id BIGSERIAL PRIMARY KEY, symbol VARCHAR(20) NOT NULL, name VARCHAR(100) NOT NULL, sector VARCHAR(100), analysis_type VARCHAR(50), result_count INTEGER DEFAULT 0, user_ip VARCHAR(50) DEFAULT 'local', created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_search_history_symbol ON search_history(symbol)`,
  `CREATE TABLE IF NOT EXISTS research_reports (id BIGSERIAL PRIMARY KEY, report_id VARCHAR(100) NOT NULL UNIQUE, sector VARCHAR(100) NOT NULL, report_type VARCHAR(50) NOT NULL DEFAULT 'comprehensive', content JSONB NOT NULL, summary TEXT, top_picks JSONB DEFAULT '[]'::jsonb, page_count INTEGER DEFAULT 12, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_research_reports_created_at ON research_reports(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_research_reports_sector ON research_reports(sector)`,
  `CREATE TABLE IF NOT EXISTS investment_theses (id BIGSERIAL PRIMARY KEY, symbol VARCHAR(20) NOT NULL, name VARCHAR(100) NOT NULL, thesis_statement TEXT NOT NULL, pillars JSONB DEFAULT '{}'::jsonb, risks JSONB DEFAULT '[]'::jsonb, catalysts JSONB DEFAULT '[]'::jsonb, target_price DECIMAL(10,2), recommendation VARCHAR(20) DEFAULT 'hold', status VARCHAR(20) DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_investment_theses_created_at ON investment_theses(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_investment_theses_symbol ON investment_theses(symbol)`,
  `ALTER TABLE search_history ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE investment_theses ENABLE ROW LEVEL SECURITY`,
  `CREATE POLICY "Allow anon read on search_history" ON search_history FOR SELECT USING (true)`,
  `CREATE POLICY "Allow anon read on research_reports" ON research_reports FOR SELECT USING (true)`,
  `CREATE POLICY "Allow anon read on investment_theses" ON investment_theses FOR SELECT USING (true)`,
  `CREATE OR REPLACE VIEW v_recent_search_stats AS SELECT symbol, name, sector, COUNT(*) AS search_count, MAX(created_at) AS last_searched, AVG(result_count) AS avg_results FROM search_history GROUP BY symbol, name, sector ORDER BY last_searched DESC`,
  `CREATE OR REPLACE VIEW v_active_theses AS SELECT symbol, name, thesis_statement, target_price, recommendation, jsonb_array_length(catalysts) AS catalyst_count, jsonb_array_length(risks) AS risk_count, created_at, updated_at FROM investment_theses WHERE status = 'active' ORDER BY updated_at DESC`,
];

async function tryAllEndpoints() {
  const apikey = serviceRoleKey;
  
  // 各种可能的 SQL 执行端点
  const endpoints = [
    {
      label: 'REST SQL API',
      url: `https://${projectRef}.supabase.co/rest/v1/sql`,
      method: 'POST',
      headers: { 'apikey': apikey, 'Authorization': `Bearer ${apikey}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ query: sqlStatements.join(';') })
    },
    {
      label: 'pgREST RPC',
      url: `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`,
      method: 'POST',
      headers: { 'apikey': apikey, 'Authorization': `Bearer ${apikey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql_query: sqlStatements.join(';') })
    },
    {
      label: 'Direct query',
      url: `https://${projectRef}.supabase.co/rest/v1/?apikey=${apikey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/sql', 'Authorization': `Bearer ${apikey}`, 'Prefer': 'tx=commit' },
      body: sqlStatements.join(';\n')
    },
  ];
  
  for (const ep of endpoints) {
    console.log(`\n尝试: ${ep.label} (${ep.url})`);
    try {
      const resp = await fetch(ep.url, { method: ep.method, headers: ep.headers, body: ep.body });
      const text = await resp.text();
      console.log(`  状态: ${resp.status}`);
      console.log(`  响应: ${text.substring(0, 200)}`);
      if (resp.status === 200 || resp.status === 201) {
        console.log(`  ✓ 成功!`);
        return true;
      }
    } catch (e) {
      console.log(`  错误: ${e.message}`);
    }
  }
  return false;
}

async function main() {
  console.log('尝试通过 REST API 执行 SQL...');
  console.log(`项目: ${projectRef}`);
  
  const success = await tryAllEndpoints();
  
  if (!success) {
    console.log('\n所有端点均失败。唯一可执行 SQL 的方式是 Supabase SQL Editor。');
    console.log('请在浏览器中打开并执行:');
    console.log(`https://app.supabase.com/project/${projectRef}/sql/new`);
  }
}

main().catch(e => console.error(e.message));
-- ============================================================
-- Supabase 数据库迁移脚本
-- 创建搜索历史、研判报告、投资论点三张核心表
-- ============================================================

-- 1. 搜索历史表
CREATE TABLE IF NOT EXISTS search_history (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  sector VARCHAR(100),
  analysis_type VARCHAR(50),
  result_count INTEGER DEFAULT 0,
  user_ip VARCHAR(50) DEFAULT 'local',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_symbol ON search_history(symbol);

-- 2. 研判报告表
CREATE TABLE IF NOT EXISTS research_reports (
  id BIGSERIAL PRIMARY KEY,
  report_id VARCHAR(100) NOT NULL UNIQUE,
  sector VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL DEFAULT 'comprehensive',
  content JSONB NOT NULL,
  summary TEXT,
  top_picks JSONB DEFAULT '[]'::jsonb,
  page_count INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_reports_created_at ON research_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_reports_sector ON research_reports(sector);
CREATE INDEX IF NOT EXISTS idx_research_reports_report_type ON research_reports(report_type);

-- 3. 投资论点表
CREATE TABLE IF NOT EXISTS investment_theses (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  thesis_statement TEXT NOT NULL,
  pillars JSONB DEFAULT '{}'::jsonb,
  risks JSONB DEFAULT '[]'::jsonb,
  catalysts JSONB DEFAULT '[]'::jsonb,
  target_price DECIMAL(10,2),
  recommendation VARCHAR(20) DEFAULT 'hold',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_theses_created_at ON investment_theses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investment_theses_symbol ON investment_theses(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_theses_status ON investment_theses(status);

-- 4. RLS 策略：允许 service_role 完全访问，anon 只读
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_theses ENABLE ROW LEVEL SECURITY;

-- anon 角色只读策略
CREATE POLICY "Allow anon read on search_history" ON search_history
  FOR SELECT USING (true);

CREATE POLICY "Allow anon read on research_reports" ON research_reports
  FOR SELECT USING (true);

CREATE POLICY "Allow anon read on investment_theses" ON investment_theses
  FOR SELECT USING (true);

-- 5. 视图：最近搜索统计
CREATE OR REPLACE VIEW v_recent_search_stats AS
SELECT 
  symbol,
  name,
  sector,
  COUNT(*) AS search_count,
  MAX(created_at) AS last_searched,
  AVG(result_count) AS avg_results
FROM search_history
GROUP BY symbol, name, sector
ORDER BY last_searched DESC;

-- 6. 视图：活跃投资论点概览
CREATE OR REPLACE VIEW v_active_theses AS
SELECT 
  symbol,
  name,
  thesis_statement,
  target_price,
  recommendation,
  jsonb_array_length(catalysts) AS catalyst_count,
  jsonb_array_length(risks) AS risk_count,
  created_at,
  updated_at
FROM investment_theses
WHERE status = 'active'
ORDER BY updated_at DESC;
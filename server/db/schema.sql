-- ============================================================
-- Supabase 完整数据库 Schema
-- 统一四张表：stock_analyses / search_history / research_reports / investment_theses
-- 在 Supabase SQL Editor 中运行此文件
-- ============================================================

-- 1. 股票分析记录表
CREATE TABLE IF NOT EXISTS stock_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  name TEXT,
  stock_data JSONB NOT NULL,
  ai_analysis JSONB NOT NULL,
  summary TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('Bullish', 'Neutral', 'Bearish')),
  risk_level TEXT CHECK (risk_level IN ('Low', 'Medium', 'High')),
  sector TEXT,
  analysis_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_analyses_created_at ON stock_analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_analyses_symbol ON stock_analyses (symbol);

-- 2. 搜索历史记录表
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  name TEXT,
  sector TEXT,
  analysis_type TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  user_ip TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_symbol ON search_history (symbol);

-- 3. 研判报告表
CREATE TABLE IF NOT EXISTS research_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL UNIQUE,
  sector TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'comprehensive',
  content JSONB NOT NULL,
  summary TEXT,
  top_picks JSONB DEFAULT '[]'::jsonb,
  page_count INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_reports_created_at ON research_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_reports_sector ON research_reports (sector);
CREATE INDEX IF NOT EXISTS idx_research_reports_report_type ON research_reports (report_type);

-- 4. 投资论点表
CREATE TABLE IF NOT EXISTS investment_theses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  thesis_statement TEXT NOT NULL,
  pillars JSONB DEFAULT '{}'::jsonb,
  risks JSONB DEFAULT '[]'::jsonb,
  catalysts JSONB DEFAULT '[]'::jsonb,
  target_price DECIMAL(10,2),
  recommendation TEXT DEFAULT 'hold',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_theses_created_at ON investment_theses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investment_theses_symbol ON investment_theses (symbol);
CREATE INDEX IF NOT EXISTS idx_investment_theses_status ON investment_theses (status);

-- 5. RLS 策略
ALTER TABLE stock_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_theses ENABLE ROW LEVEL SECURITY;

-- 公开读取策略
CREATE POLICY "Allow public read on stock_analyses" ON stock_analyses
  FOR SELECT USING (true);
CREATE POLICY "Allow public read on search_history" ON search_history
  FOR SELECT USING (true);
CREATE POLICY "Allow public read on research_reports" ON research_reports
  FOR SELECT USING (true);
CREATE POLICY "Allow public read on investment_theses" ON investment_theses
  FOR SELECT USING (true);

-- 6. 视图：最近搜索统计
CREATE OR REPLACE VIEW v_recent_search_stats AS
SELECT
  symbol, name, sector,
  COUNT(*) AS search_count,
  MAX(created_at) AS last_searched,
  AVG(result_count) AS avg_results
FROM search_history
GROUP BY symbol, name, sector
ORDER BY last_searched DESC;

-- 7. 视图：活跃投资论点概览
CREATE OR REPLACE VIEW v_active_theses AS
SELECT
  symbol, name, thesis_statement,
  target_price, recommendation,
  jsonb_array_length(catalysts) AS catalyst_count,
  jsonb_array_length(risks) AS risk_count,
  created_at, updated_at
FROM investment_theses
WHERE status = 'active'
ORDER BY updated_at DESC;
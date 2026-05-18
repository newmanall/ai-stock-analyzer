-- 创建分析记录表
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_symbol TEXT NOT NULL,
  stock_name TEXT,
  current_price DECIMAL(10, 2) NOT NULL,
  price_change_percent DECIMAL(5, 2),
  volume BIGINT,
  market_cap BIGINT,
  
  -- AI 分析结果
  analysis_summary TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('Bullish', 'Neutral', 'Bearish')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- 原始数据快照
  raw_data JSONB,
  
  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_ip TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_analyses_symbol ON analyses(stock_symbol);
CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_sentiment ON analyses(sentiment);

-- 启用行级安全
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- 公开读取策略
CREATE POLICY "Public read analyses" ON analyses
  FOR SELECT USING (true);

-- 服务角色写入策略
CREATE POLICY "Service role write analyses" ON analyses
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- 更新策略
CREATE POLICY "Service role update analyses" ON analyses
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- 删除策略
CREATE POLICY "Service role delete analyses" ON analyses
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- 创建更新updatedAt 的触发器（可选）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

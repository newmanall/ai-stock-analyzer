// AI分析结果
export interface AnalysisResult {
  summary: string;
  sentiment: 'Bullish' | 'Neutral' | 'Bearish';
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence_score: number;
}

// 股票数据
export interface StockData {
  symbol: string;
  name?: string;
  currentPrice: number;
  priceChangePercent: number;
  volume: number;
  marketCap: number;
  priceHistory: number[];
  industry?: string;
}

// API响应
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分析记录
export interface AnalysisRecord {
  id: string;
  stock_symbol: string;
  stock_name?: string;
  current_price: number;
  price_change_percent: number;
  analysis_summary: string;
  sentiment: string;
  risk_level: string;
  confidence_score: number;
  created_at: string;
}

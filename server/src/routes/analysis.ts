import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getCachedStockData } from '../services/stockData.js';
import { analyzeStock } from '../services/aiAnalysis.js';
import { saveAnalysis, getHistory } from '../db/supabase.js';
import { AnalysisResult, StockData } from '../types/index.js';

const router = Router();

// 请求验证Schema
const AnalyzeSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase()
});

/**
 * POST /api/analyze
 * 分析股票
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    // 验证请求
    const { symbol } = AnalyzeSchema.parse(req.body);
    
    console.log(`📊 分析请求: ${symbol}`);
    
    // 1. 获取股票数据
    const stockData = await getCachedStockData(symbol);
    
    // 2. AI分析
    const analysis = await analyzeStock(stockData);
    
    // 3. 保存到数据库
    const record = await saveAnalysis({
      stock_symbol: stockData.symbol,
      stock_name: stockData.name,
      current_price: stockData.currentPrice,
      price_change_percent: stockData.priceChangePercent,
      volume: stockData.volume,
      market_cap: stockData.marketCap,
      analysis_summary: analysis.summary,
      sentiment: analysis.sentiment,
      risk_level: analysis.risk_level,
      confidence_score: analysis.confidence_score,
      raw_data: stockData,
      user_ip: req.ip
    });
    
    console.log(`✅ 分析完成: ${symbol}, ID: ${record.id}`);
    
    res.json({
      success: true,
      data: {
        id: record.id,
        stock_symbol: record.stock_symbol,
        stock_name: record.stock_name,
        current_price: record.current_price,
        price_change_percent: record.price_change_percent,
        analysis_summary: record.analysis_summary,
        sentiment: record.sentiment,
        risk_level: record.risk_level,
        confidence_score: record.confidence_score
      }
    });
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '无效的请求参数',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'ANALYSIS_ERROR',
      message: error instanceof Error ? error.message : '分析失败'
    });
  }
});

/**
 * GET /api/history
 * 获取分析历史
 */
router.get('/history', async (_req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(_req.query.limit as string) || 20, 50);
    const symbol = _req.query.symbol as string;
    
    const history = await getHistory({ limit, symbol });
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('❌ 获取历史失败:', error);
    res.status(500).json({
      success: false,
      error: 'HISTORY_ERROR',
      message: '无法获取历史记录'
    });
  }
});

/**
 * GET /api/health
 * 健康检查
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!process.env.SUPABASE_URL,
      alphaVantage: !!process.env.ALPHA_VANTAGE_KEY
    }
  });
});

export { router as analysisRouter };

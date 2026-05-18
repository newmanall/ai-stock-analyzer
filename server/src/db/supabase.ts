import { createClient } from '@supabase/supabase-js';
import { AnalysisRecord } from '../types/index.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase未配置，使用内存存储（仅用于开发）');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// 内存存储（用于开发/测试）
const memoryStore: AnalysisRecord[] = [];

/**
 * 保存分析记录
 */
export async function saveAnalysis(record: Omit<AnalysisRecord, 'id' | 'created_at'>): Promise<AnalysisRecord> {
  const fullRecord: AnalysisRecord = {
    ...record,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString()
  };
  
  if (supabase) {
    const { data, error } = await supabase
      .from('analyses')
      .insert([{
        stock_symbol: record.stock_symbol,
        stock_name: record.stock_name,
        current_price: record.current_price,
        price_change_percent: record.price_change_percent,
        volume: record.volume,
        market_cap: record.market_cap,
        analysis_summary: record.analysis_summary,
        sentiment: record.sentiment,
        risk_level: record.risk_level,
        confidence_score: record.confidence_score,
        raw_data: record.raw_data,
        user_ip: record.user_ip
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase保存失败:', error);
      throw new Error('数据库保存失败');
    }
    
    return data;
  } else {
    // 使用内存存储
    memoryStore.push(fullRecord);
    return fullRecord;
  }
}

/**
 * 获取分析历史
 */
export async function getHistory(options: { limit?: number; symbol?: string } = {}): Promise<AnalysisRecord[]> {
  const { limit = 20, symbol } = options;
  
  if (supabase) {
    let query = supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (symbol) {
      query = query.eq('stock_symbol', symbol.toUpperCase());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ 获取历史失败:', error);
      throw new Error('获取历史记录失败');
    }
    
    return data || [];
  } else {
    // 使用内存存储
    let results = [...memoryStore];
    
    if (symbol) {
      results = results.filter(r => r.stock_symbol === symbol.toUpperCase());
    }
    
    return results
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }
}

/**
 * 获取单个分析记录
 */
export async function getAnalysisById(id: string): Promise<AnalysisRecord | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return null;
    }
    
    return data;
  }
  
  return memoryStore.find(r => r.id === id) || null;
}

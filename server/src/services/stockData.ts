import { StockData } from '../types/index.js';

/**
 * 从Alpha Vantage获取股票数据
 * 免费API: https://www.alphavantage.co/
 * 限制: 5次/分钟, 500次/天
 */
export async function fetchStockData(symbol: string): Promise<StockData> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  
  if (!apiKey) {
    // 如果没有API Key，返回模拟数据用于开发
    console.warn('⚠️ 未配置ALPHA_VANTAGE_KEY，使用模拟数据');
    return getMockStockData(symbol);
  }
  
  try {
    // 获取实时报价
    const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const quoteResponse = await fetch(quoteUrl);
    const quoteData = await quoteResponse.json();
    
    const quote = quoteData['Global Quote'];
    
    if (!quote || Object.keys(quote).length === 0) {
      throw new Error('股票数据不存在');
    }
    
    // 获取公司信息
    const companyUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
    const companyResponse = await fetch(companyUrl);
    const companyData = await companyResponse.json();
    
    return {
      symbol: symbol.toUpperCase(),
      name: companyData.Name || quote['02. symbol'],
      currentPrice: parseFloat(quote['05. price']),
      priceChangePercent: parseFloat(quote['10. change percent']),
      volume: parseInt(quote['06. volume']),
      marketCap: 0,  // Alpha Vantage免费API不直接提供市值
      priceHistory: [],  // 需要额外调用TIME_SERIES_INTRADAY
      industry: companyData.Industry
    };
    
  } catch (error) {
    console.error(`❌ 获取股票数据失败: ${symbol}`, error);
    throw new Error('无法获取股票数据，请检查股票代码是否正确');
  }
}

/**
 * 模拟数据（用于开发和测试）
 */
function getMockStockData(symbol: string): StockData {
  const mockData: Record<string, Partial<StockData>> = {
    'AAPL': {
      name: 'Apple Inc.',
      currentPrice: 178.52,
      priceChangePercent: 1.25,
      volume: 52000000,
      marketCap: 2800000000000,
      industry: 'Consumer Electronics'
    },
    'TSLA': {
      name: 'Tesla, Inc.',
      currentPrice: 195.89,
      priceChangePercent: -2.34,
      volume: 98000000,
      marketCap: 620000000000,
      industry: 'Auto Manufacturers'
    },
    'NVDA': {
      name: 'NVIDIA Corporation',
      currentPrice: 722.48,
      priceChangePercent: 3.12,
      volume: 45000000,
      marketCap: 1800000000000,
      industry: 'Semiconductors'
    },
    'MSFT': {
      name: 'Microsoft Corporation',
      currentPrice: 415.26,
      priceChangePercent: 0.87,
      volume: 22000000,
      marketCap: 3100000000000,
      industry: 'Software'
    },
    'GOOGL': {
      name: 'Alphabet Inc.',
      currentPrice: 151.94,
      priceChangePercent: -0.56,
      volume: 28000000,
      marketCap: 1900000000000,
      industry: 'Internet Content'
    }
  };
  
  const data = mockData[symbol.toUpperCase()];
  
  if (!data) {
    // 返回随机模拟数据
    return {
      symbol: symbol.toUpperCase(),
      name: `${symbol.toUpperCase()} Corp.`,
      currentPrice: Math.random() * 500 + 50,
      priceChangePercent: (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 100000000),
      marketCap: Math.floor(Math.random() * 1000000000000),
      industry: 'Technology'
    };
  }
  
  return {
    symbol: symbol.toUpperCase(),
    ...data,
    priceHistory: Array.from({ length: 5 }, () => 
      Math.random() * 50 + data.currentPrice! - 25
    )
  } as StockData;
}

/**
 * 缓存股票数据（简单内存缓存）
 */
const cache = new Map<string, { data: StockData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;  // 5分钟

export async function getCachedStockData(symbol: string): Promise<StockData> {
  const cached = cache.get(symbol.toUpperCase());
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`💾 使用缓存数据: ${symbol}`);
    return cached.data;
  }
  
  const data = await fetchStockData(symbol);
  cache.set(symbol.toUpperCase(), { data, timestamp: Date.now() });
  
  return data;
}

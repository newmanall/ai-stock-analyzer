import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000  // 60秒超时（AI分析可能需要较长时间）
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log('📤 Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.data);
    return response.data;
  },
  (error) => {
    console.error('❌ Response error:', error.response?.status, error.message);
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || '请求参数错误');
    }
    if (error.response?.status === 404) {
      throw new Error('接口不存在');
    }
    if (error.response?.status === 500) {
      throw new Error(error.response.data?.message || '服务器内部错误');
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请重试');
    }
    
    throw new Error(error.message || '网络错误');
  }
);

// 分析股票
export async function analyzeStock(symbol: string) {
  const response = await api.post('/analyze', { symbol });
  
  if (!response.success) {
    throw new Error(response.message || '分析失败');
  }
  
  // 从响应中提取数据
  const data = response.data;
  
  return {
    stockData: {
      symbol: data.stock_symbol,
      name: data.stock_name,
      currentPrice: data.current_price,
      priceChangePercent: data.price_change_percent,
      volume: 0,
      marketCap: 0,
      priceHistory: [],
      industry: undefined
    },
    analysis: {
      summary: data.analysis_summary,
      sentiment: data.sentiment,
      risk_level: data.risk_level,
      confidence_score: data.confidence_score
    }
  };
}

// 获取历史记录
export async function getHistory(limit: number = 20, symbol?: string) {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (symbol) {
    params.append('symbol', symbol);
  }
  
  const response = await api.get(`/history?${params}`);
  
  if (!response.success) {
    throw new Error(response.message || '获取历史失败');
  }
  
  return response.data || [];
}

// 健康检查
export async function checkHealth() {
  const response = await api.get('/health');
  return response;
}

export default api;

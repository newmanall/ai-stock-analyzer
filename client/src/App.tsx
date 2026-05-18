import React, { useState } from 'react';
import { analyzeStock, getHistory } from '../lib/api';
import { AnalysisResult, StockData } from '../types';
import StockInput from '../components/StockInput';
import AnalysisResultCard from '../components/AnalysisResultCard';
import HistoryList from '../components/HistoryList';
import LoadingSpinner from '../components/LoadingSpinner';
import './App.css';

function App() {
  const [symbol, setSymbol] = useState('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    setLoading(true);
    setError(null);
    setStockData(null);
    setAnalysis(null);

    try {
      const result = await analyzeStock(symbol.trim().toUpperCase());
      setStockData(result.stockData);
      setAnalysis(result.analysis);
      
      // 刷新历史记录
      const hist = await getHistory();
      setHistory(hist);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    const hist = await getHistory();
    setHistory(hist);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI 股票分析面板</h1>
                <p className="text-xs text-slate-400">Powered by LLM</p>
              </div>
            </div>
            <a 
              href="https://github.com/yourname/ai-stock-analyzer"
              className="text-slate-400 hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Input Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">📈 股票分析</h2>
              <StockInput 
                value={symbol}
                onChange={setSymbol}
                onSubmit={handleSubmit}
                loading={loading}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
                <LoadingSpinner />
                <p className="text-center text-slate-400 mt-4">正在分析 {symbol || '股票'} 数据...</p>
                <p className="text-center text-slate-500 text-sm mt-2">AI 模型正在生成分析报告</p>
              </div>
            )}

            {/* Analysis Result */}
            {analysis && stockData && (
              <AnalysisResultCard 
                stockData={stockData}
                analysis={analysis}
              />
            )}
          </div>

          {/* Right Column - History */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">📜 分析历史</h2>
                <button 
                  onClick={loadHistory}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <HistoryList history={history} />
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-6">
              <h3 className="font-semibold text-emerald-400 mb-2">💡 使用说明</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• 输入美股代码 (AAPL, TSLA, NVDA)</li>
                <li>• 输入港股代码 (0700.HK, 9988.HK)</li>
                <li>• AI 分析返回情绪与风险评估</li>
                <li>• 结果自动保存到云端</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <p>AI 股票分析面板 © 2026 | 仅供学习参考，不构成投资建议</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

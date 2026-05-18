import React from 'react';
import { AnalysisResult, StockData } from '../types';

interface AnalysisResultCardProps {
  stockData: StockData;
  analysis: AnalysisResult;
}

const sentimentColors = {
  Bullish: 'from-emerald-500 to-green-600',
  Neutral: 'from-slate-500 to-gray-600',
  Bearish: 'from-red-500 to-rose-600'
};

const sentimentIcons = {
  Bullish: '📈',
  Neutral: '➡️',
  Bearish: '📉'
};

const riskColors = {
  Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Critical: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({ stockData, analysis }) => {
  const priceChangeColor = stockData.priceChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400';
  const priceChangeIcon = stockData.priceChangePercent >= 0 ? '↑' : '↓';

  return (
    <div className="space-y-6">
      {/* Stock Info Card */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-white">{stockData.symbol}</h3>
              <span className="px-3 py-1 bg-slate-700/50 text-slate-300 text-sm rounded-lg">
                {stockData.name}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">{stockData.industry || '未知行业'}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">${stockData.currentPrice.toFixed(2)}</p>
            <p className={`text-sm font-medium ${priceChangeColor}`}>
              {priceChangeIcon} {Math.abs(stockData.priceChangePercent).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
          <div>
            <p className="text-slate-500 text-xs mb-1">成交量</p>
            <p className="text-white font-medium">{(stockData.volume / 1e6).toFixed(1)}M</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">市值</p>
            <p className="text-white font-medium">${(stockData.marketCap / 1e9).toFixed(0)}B</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">置信度</p>
            <p className="text-white font-medium">{(analysis.confidence_score * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* AI Analysis Card */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI 智能分析
        </h3>

        {/* Sentiment Badge */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`px-6 py-3 bg-gradient-to-r ${sentimentColors[analysis.sentiment]} rounded-xl flex items-center gap-2`}>
            <span className="text-2xl">{sentimentIcons[analysis.sentiment]}</span>
            <span className="font-bold text-white text-lg">{analysis.sentiment}</span>
          </div>
          <div className={`px-4 py-2 rounded-xl border ${riskColors[analysis.risk_level]}`}>
            <span className="text-sm">风险等级: </span>
            <span className="font-semibold">{analysis.risk_level}</span>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className="bg-slate-900/50 rounded-xl p-4">
          <h4 className="text-slate-400 text-sm mb-2">📝 分析总结</h4>
          <p className="text-slate-200 leading-relaxed">{analysis.summary}</p>
        </div>

        {/* Confidence Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">AI 置信度</span>
            <span className="text-white font-medium">{(analysis.confidence_score * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${analysis.confidence_score * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResultCard;

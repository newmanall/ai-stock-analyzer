import React from 'react';

interface HistoryItem {
  id: string;
  stock_symbol: string;
  stock_name?: string;
  current_price: number;
  analysis_summary: string;
  sentiment: string;
  risk_level: string;
  confidence_score: number;
  created_at: string;
}

interface HistoryListProps {
  history: HistoryItem[];
}

const sentimentColors = {
  Bullish: 'text-emerald-400 bg-emerald-500/10',
  Neutral: 'text-slate-400 bg-slate-500/10',
  Bearish: 'text-red-400 bg-red-500/10'
};

const riskColors = {
  Low: 'text-emerald-400',
  Medium: 'text-yellow-400',
  High: 'text-orange-400',
  Critical: 'text-red-400'
};

const HistoryList: React.FC<HistoryListProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-slate-400 text-sm">暂无分析记录</p>
        <p className="text-slate-500 text-xs mt-1">输入股票代码开始分析</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
      {history.map((item) => (
        <div 
          key={item.id}
          className="bg-slate-700/30 hover:bg-slate-700/50 rounded-xl p-4 transition-colors cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{item.stock_symbol}</span>
              {item.stock_name && (
                <span className="text-xs text-slate-400">{item.stock_name}</span>
              )}
            </div>
            <span className="text-xs text-slate-500">
              {new Date(item.created_at).toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${sentimentColors[item.sentiment as keyof typeof sentimentColors]}`}>
              {item.sentiment}
            </span>
            <span className={`text-xs ${riskColors[item.risk_level as keyof typeof riskColors]}`}>
              风险: {item.risk_level}
            </span>
            <span className="text-xs text-slate-400">
              置信度: {(item.confidence_score * 100).toFixed(0)}%
            </span>
          </div>

          <p className="text-slate-300 text-sm line-clamp-2">{item.analysis_summary}</p>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-600/30">
            <span className="text-lg font-bold text-white">${item.current_price.toFixed(2)}</span>
            <button className="text-xs text-emerald-400 hover:text-emerald-300 opacity-0 group-hover:opacity-100 transition-all">
              查看详情 →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryList;

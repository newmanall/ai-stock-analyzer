import React from 'react';

interface StockInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

const StockInput: React.FC<StockInputProps> = ({ value, onChange, onSubmit, loading }) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder="输入股票代码 (如 AAPL, TSLA)"
            className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            disabled={loading}
            maxLength={10}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              分析中
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              分析
            </>
          )}
        </button>
      </div>
      
      {/* Popular stocks */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-500">热门:</span>
        {['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'].map((stock) => (
          <button
            key={stock}
            type="button"
            onClick={() => onChange(stock)}
            className="px-3 py-1 text-xs bg-slate-700/50 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
          >
            {stock}
          </button>
        ))}
      </div>
    </form>
  );
};

export default StockInput;

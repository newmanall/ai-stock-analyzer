import { Activity, AlertTriangle, Loader2, Sparkles, Star } from "lucide-react";

export default function SearchPanel({
  symbol, market, isLoading, isAnalyzing, stockData, error, analysis,
  onSymbolChange, onFetch, onAnalyze, onAddWatchlist
}) {
  const placeholder = market === "usstock" ? "AAPL, TSLA, MSFT" : "600519, 000858, 300750";

  return (
    <section className="search-panel">
      <form onSubmit={onFetch} className="search-form">
        <input
          value={symbol}
          onChange={(e) => onSymbolChange(market === "usstock" ? e.target.value.toUpperCase() : e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button type="submit" disabled={isLoading || isAnalyzing || !symbol.trim()}>
          {isLoading ? <Loader2 className="spin" size={18} /> : <Activity size={18} />}
          获取数据
        </button>
      </form>
      <button
        className="btn-analyze"
        onClick={onAnalyze}
        disabled={!stockData || isAnalyzing || isLoading}
      >
        {isAnalyzing ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
        AI 分析
      </button>
      {stockData && (
        <button className="btn-watchlist" onClick={onAddWatchlist}>
          <Star size={18} /> 加入自选
        </button>
      )}

      {error && (
        <div className="message error-message">
          <AlertTriangle size={18} /> {error}
        </div>
      )}
      {analysis?.warning && (
        <div className="message warning-message">
          <AlertTriangle size={18} /> {analysis.warning}
        </div>
      )}
    </section>
  );
}
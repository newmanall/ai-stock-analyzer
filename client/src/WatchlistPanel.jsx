import { Star, X } from "lucide-react";
import { formatNumber } from "./utils/formatters.js";

export default function WatchlistPanel({ watchlist, onSelect, onRemove }) {
  return (
    <div className="card watchlist-panel">
      <div className="card-header">
        <h2><Star size={18} /> 自选列表</h2>
      </div>
      {watchlist.length > 0 ? (
        <div className="watchlist-items">
          {watchlist.map((item) => (
            <div
              key={item.symbol}
              className="watchlist-row"
              onClick={() => onSelect(item)}
            >
              <div className="wl-info">
                <strong>{item.symbol}</strong>
                <span className="wl-name">{item.name}</span>
                <span className={`wl-market ${item.market}`}>
                  {item.market === "usstock" ? "美股" : "A股"}
                </span>
              </div>
              <div className="wl-price">
                <span className="wl-close">
                  {item.market === "usstock" ? "$" : "¥"}
                  {formatNumber(item.close)}
                </span>
                <span className={`wl-change ${(item.changePercent ?? 0) >= 0 ? "positive" : "negative"}`}>
                  {(item.changePercent ?? 0) >= 0 ? "+" : ""}
                  {formatNumber(item.changePercent)}%
                </span>
              </div>
              <button
                className="wl-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.symbol);
                }}
                title="移除自选"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">获取股票数据后点击"加入自选"，自选股票保存在本地浏览器</div>
      )}
    </div>
  );
}
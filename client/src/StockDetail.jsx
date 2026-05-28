import Sparkline from "./components/common/Sparkline.jsx";
import { formatNumber, formatVolume, formatMarketCap } from "./utils/formatters.js";
import { Loader2, ZoomIn } from "lucide-react";

export default function StockDetail({ stockData, market, compLoading, onComprehensive }) {
  const isPositive =
    stockData?.changePercent != null && Number(stockData.changePercent) >= 0;

  return (
    <div className="card stock-detail">
      <div className="card-header">
        <h2>
          {stockData?.name || stockData?.symbol || "尚未选择股票"}
        </h2>
        {stockData && (
          <span className="symbol-tag">
            {stockData.symbol}
            <span className={`market-badge ${market}`}>
              {market === "usstock" ? "美股" : "A股"}
            </span>
          </span>
        )}
      </div>

      {stockData ? (
        <>
          <div className="price-section">
            <div className="price-main">
              <span className="price-label">最新价</span>
              <strong className="price-value">
                {market === "usstock" ? "$" : "¥"}
                {formatNumber(stockData.close)}
              </strong>
              {stockData.changePercent != null ? (
                <span className={`change-badge ${isPositive ? "positive" : "negative"}`}>
                  {isPositive ? "+" : ""}
                  {formatNumber(stockData.changePercent)}%
                </span>
              ) : (
                <span className="change-badge neutral">--</span>
              )}
            </div>
            <Sparkline values={stockData.recentCloses ?? []} height={64} />
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <span>开盘</span>
              <strong>{market === "usstock" ? "$" : "¥"}{formatNumber(stockData.open)}</strong>
            </div>
            <div className="stat-item">
              <span>最高</span>
              <strong>{market === "usstock" ? "$" : "¥"}{formatNumber(stockData.high)}</strong>
            </div>
            <div className="stat-item">
              <span>最低</span>
              <strong>{market === "usstock" ? "$" : "¥"}{formatNumber(stockData.low)}</strong>
            </div>
            <div className="stat-item">
              <span>成交量</span>
              <strong>{formatVolume(stockData.volume)}</strong>
            </div>
            {stockData.amplitude != null && (
              <div className="stat-item">
                <span>振幅</span>
                <strong>{formatNumber(stockData.amplitude)}%</strong>
              </div>
            )}
            {stockData.volumeRatio != null && (
              <div className="stat-item">
                <span>量比</span>
                <strong>{formatNumber(stockData.volumeRatio)}</strong>
              </div>
            )}
          </div>

          {market === "astock" && (
            <div className="stats-grid astock-extras">
              {stockData.limitUp != null && (
                <div className="stat-item">
                  <span>涨停价</span>
                  <strong className="text-up">¥{formatNumber(stockData.limitUp)}</strong>
                </div>
              )}
              {stockData.limitDown != null && (
                <div className="stat-item">
                  <span>跌停价</span>
                  <strong className="text-down">¥{formatNumber(stockData.limitDown)}</strong>
                </div>
              )}
              {stockData.changeYuan != null && (
                <div className="stat-item">
                  <span>涨跌额</span>
                  <strong className={stockData.changeYuan >= 0 ? "text-up" : "text-down"}>
                    {stockData.changeYuan >= 0 ? "+" : ""}{formatNumber(stockData.changeYuan)}元
                  </strong>
                </div>
              )}
              {stockData.pe != null && (
                <div className="stat-item">
                  <span>市盈率</span>
                  <strong>{formatNumber(stockData.pe)}</strong>
                </div>
              )}
              {stockData.pb != null && (
                <div className="stat-item">
                  <span>市净率</span>
                  <strong>{formatNumber(stockData.pb)}</strong>
                </div>
              )}
              {stockData.turnoverRate != null && (
                <div className="stat-item">
                  <span>换手率</span>
                  <strong>{formatNumber(stockData.turnoverRate)}%</strong>
                </div>
              )}
              {stockData.totalMarketCap != null && (
                <div className="stat-item">
                  <span>总市值</span>
                  <strong>{formatMarketCap(stockData.totalMarketCap)}</strong>
                </div>
              )}
              {stockData.amount != null && (
                <div className="stat-item">
                  <span>成交额</span>
                  <strong>{formatVolume(stockData.amount)}</strong>
                </div>
              )}
              {stockData.dividendYield != null && (
                <div className="stat-item">
                  <span>股息率</span>
                  <strong>{formatNumber(stockData.dividendYield)}%</strong>
                </div>
              )}
            </div>
          )}

          <p className="date-note">
            数据日期: {stockData.latestDate}
            {stockData._raw?.timestamp
              ? ` | 更新时间: ${stockData._raw.timestamp.slice(0, 4)}-${stockData._raw.timestamp.slice(4, 6)}-${stockData._raw.timestamp.slice(6, 8)} ${stockData._raw.timestamp.slice(8, 10)}:${stockData._raw.timestamp.slice(10, 12)}:${stockData._raw.timestamp.slice(12, 14)}`
              : ""}
          </p>

          {market === "astock" && (
            <button
              className="btn-comprehensive"
              onClick={onComprehensive}
              disabled={compLoading}
            >
              {compLoading ? <Loader2 className="spin" size={16} /> : <ZoomIn size={16} />}
              {compLoading ? "研判中…" : "一键综合研判"}
            </button>
          )}
        </>
      ) : (
        <div className="empty-state">
          输入股票代码并点击"获取数据"，此处将展示实时行情
        </div>
      )}
    </div>
  );
}
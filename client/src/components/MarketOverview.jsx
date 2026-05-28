import { ChevronLeft, ChevronRight } from "lucide-react";
import Sparkline from "./common/Sparkline.jsx";
import { formatNumber } from "../utils/formatters.js";
import Skeleton from "./Skeleton.jsx";

export default function MarketOverview({
  indices,
  indicesScroll,
  onScrollIndices,
  sectors,
}) {
  const visibleIndices = indices.slice(indicesScroll, indicesScroll + 5);
  const topSectors = sectors.slice(0, 8);

  return (
    <section className="market-overview">
      <div className="indices-section">
        <div className="section-header">
          <h3>大盘指数</h3>
          {indices.length > 0 && (
            <div className="scroll-arrows">
              <button onClick={() => onScrollIndices("left")} disabled={indicesScroll === 0}>
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => onScrollIndices("right")}
                disabled={indicesScroll >= indices.length - 5}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {indices.length > 0 ? (
          <div className="indices-row">
            {visibleIndices.map((idx) => {
              const idxPositive = idx.changePercent != null && idx.changePercent >= 0;
              return (
                <div key={idx.code} className={`index-card ${idxPositive ? "up" : "down"}`}>
                  <span className="index-name">{idx.name}</span>
                  <strong className="index-value">{formatNumber(idx.close)}</strong>
                  {idx.changePercent != null ? (
                    <span className={`index-change ${idxPositive ? "positive" : "negative"}`}>
                      {idxPositive ? "+" : ""}
                      {formatNumber(idx.changePercent)}%
                    </span>
                  ) : (
                    <span className="index-change neutral">--</span>
                  )}
                  <Sparkline values={idx.recentCloses ?? []} height={32} />
                </div>
              );
            })}
          </div>
        ) : (
          <Skeleton.IndicesRow count={5} />
        )}
      </div>

      {topSectors.length > 0 ? (
        <div className="sectors-section">
          <h3>行业板块</h3>
          <div className="sectors-row">
            {topSectors.map((sec) => {
              const pct = sec.changePercent;
              const secPositive = pct != null && pct >= 0;
              const intensity = pct != null ? Math.min(Math.abs(pct) / 8, 1) : 0;
              const bg =
                pct != null
                  ? secPositive
                    ? `rgba(239,68,68,${intensity * 0.3})`
                    : `rgba(34,197,94,${intensity * 0.3})`
                  : "rgba(148,163,184,0.1)";
              const color =
                pct != null
                  ? secPositive
                    ? "var(--up)"
                    : "var(--down)"
                  : "var(--text-secondary)";

              return (
                <div key={sec.code} className="sector-tag" style={{ background: bg, color }}>
                  <span>{sec.name}</span>
                  <span className="sector-pct">
                    {pct != null ? `${secPositive ? "+" : ""}${formatNumber(pct)}%` : "--"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        indices.length > 0 && (
          <div className="sectors-section">
            <h3>行业板块</h3>
            <Skeleton.Sectors count={8} />
          </div>
        )
      )}
    </section>
  );
}
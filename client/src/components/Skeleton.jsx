/**
 * Skeleton loading components.
 *
 * Usage:
 *   <Skeleton.Card height={120} />
 *   <Skeleton.Text lines={3} />
 *   <Skeleton.Chart height={64} />
 *   <Skeleton.IndexCard />
 *   <Skeleton.IndicesRow count={5} />
 */

function SkeletonCard({ height = 120, className = "" }) {
  return <div className={`skeleton skeleton-card ${className}`} style={{ height }} />;
}

function SkeletonText({ lines = 3 }) {
  return (
    <div className="skeleton-text-group">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton skeleton-line" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

function SkeletonChart({ height = 64 }) {
  return <div className="skeleton skeleton-chart" style={{ height }} />;
}

function SkeletonIndexCard() {
  return (
    <div className="skeleton-index-card">
      <div className="skeleton skeleton-line" style={{ width: "60%", height: 14, marginBottom: 8 }} />
      <div className="skeleton skeleton-line" style={{ width: "80%", height: 24, marginBottom: 8 }} />
      <div className="skeleton skeleton-line" style={{ width: "40%", height: 14, marginBottom: 8 }} />
      <div className="skeleton skeleton-chart" style={{ height: 32 }} />
    </div>
  );
}

function SkeletonIndicesRow({ count = 5 }) {
  return (
    <div className="indices-row">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonIndexCard key={i} />
      ))}
    </div>
  );
}

function SkeletonSectors({ count = 8 }) {
  return (
    <div className="sectors-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: 100, height: 32, borderRadius: 8 }} />
      ))}
    </div>
  );
}

export default {
  Card: SkeletonCard,
  Text: SkeletonText,
  Chart: SkeletonChart,
  IndexCard: SkeletonIndexCard,
  IndicesRow: SkeletonIndicesRow,
  Sectors: SkeletonSectors,
};
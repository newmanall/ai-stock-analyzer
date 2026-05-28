export function SentimentBadge({ value }) {
  const normalized = value || "Neutral";
  return <span className={`badge badge-${normalized.toLowerCase()}`}>{normalized}</span>;
}

export function RiskBadge({ value }) {
  const normalized = value || "Medium";
  return <span className={`badge risk-${normalized.toLowerCase()}`}>{normalized}</span>;
}

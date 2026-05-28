import { useMemo } from "react";

export default function Sparkline({ values = [], height = 48, color }) {
  const points = useMemo(() => {
    if (!values.length) return "";
    const width = 220;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return values
      .map((value, index) => {
        const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [values, height]);

  const isUp = values.length >= 2 && values[values.length - 1] >= values[0];

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 220 ${height}`}
      style={{ color: color || (isUp ? "var(--up)" : "var(--down)") }}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

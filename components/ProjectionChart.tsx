import { Prisma } from "@prisma/client";
import { ProjectionPoint } from "@/lib/forecast";
import { formatDate, formatMoney } from "@/lib/format";

export function ProjectionChart({ baseline, simulated }: { baseline: ProjectionPoint[]; simulated: ProjectionPoint[] }) {
  const width = 720;
  const height = 260;
  const padding = 35;
  const values = [...baseline, ...simulated].map((point) => Number(point.balance));
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = maximum - minimum || 1;
  const coordinates = (points: ProjectionPoint[]) => points.map((point, index) => {
    const x = padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((Number(point.balance) - minimum) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const zeroY = height - padding - ((0 - minimum) / range) * (height - padding * 2);
  const lowest = simulated.reduce((result, point) => point.balance.lt(result.balance) ? point : result, simulated[0]);
  return (
    <div className="projection-chart">
      <div className="chart-legend"><span><i className="legend-baseline" />Initial projection</span><span><i className="legend-simulated" />Simulated projection</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`90-day projection comparison. Lowest simulated balance ${formatMoney(lowest.balance)} on ${formatDate(lowest.date)}.`}>
        <line x1={padding} x2={width - padding} y1={zeroY} y2={zeroY} className="zero-line" />
        <polyline points={coordinates(baseline)} className="baseline-line" />
        <polyline points={coordinates(simulated)} className="simulated-line" />
      </svg>
      <div className="chart-axis"><span>{formatDate(baseline[0].date)}</span><span>30 days</span><span>60 days</span><span>{formatDate(baseline[90].date)}</span></div>
    </div>
  );
}

import { fmtUsd, fmtDate } from "./data-ui";

/* Server-rendered price history (USD per 1M tokens). One point per day from infkey_price_history. */
export function PriceHistory({ history }: { history: { day: string; input: number | null; output: number | null }[] }) {
  if (history.length === 0) return null;
  const first = history[0];
  const last = history[history.length - 1];
  if (history.length < 2) {
    return (
      <section className="spec-block">
        <h2 className="block-h">Price history</h2>
        <p className="src-note">
          Tracking this model&apos;s price daily since {fmtDate(first.day)}. Any change will show up here as a chart.
        </p>
      </section>
    );
  }
  const W = 640;
  const H = 180;
  const PAD = { l: 60, r: 20, t: 16, b: 28 };
  const vals = history.flatMap((h) => [h.input, h.output]).filter((v): v is number => v !== null);
  const max = Math.max(...vals, 0.0001);
  const min = Math.min(...vals.filter((v) => v > 0), max);
  const x = (i: number) => PAD.l + (i / (history.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  
  const line = (k: "input" | "output") =>
    history
      .map((h, i) => (h[k] === null ? null : `${x(i).toFixed(1)},${y(h[k] as number).toFixed(1)}`))
      .filter(Boolean)
      .join(" ");
  
  // Y-axis ticks
  const yTicks = [0, max * 0.25, max * 0.5, max * 0.75, max].map((v) => ({ v, y: y(v) }));
  
  const change = (a: number | null, b: number | null) =>
    a === null || b === null || a === 0 ? "" : ` (${b >= a ? "+" : ""}${(((b - a) / a) * 100).toFixed(0)}%)`;
  
  return (
    <section className="spec-block price-chart">
      <h2 className="block-h">Price history</h2>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Input and output price per 1M tokens over time">
        {/* Grid lines */}
        {yTicks.map(({ y: yPos }, i) => (
          <line key={i} x1={PAD.l} y1={yPos} x2={W - PAD.r} y2={yPos} className="grid" />
        ))}
        
        {/* Y-axis labels */}
        {yTicks.map(({ v, y: yPos }, i) => (
          <text key={i} x={PAD.l - 8} y={yPos + 4} className="axis" textAnchor="end">
            {fmtUsd(v, v < 1 ? 2 : 0)}
          </text>
        ))}
        
        {/* X-axis labels */}
        <text x={PAD.l} y={H - 6} className="axis" textAnchor="start">
          {fmtDate(first.day)}
        </text>
        <text x={W - PAD.r} y={H - 6} className="axis" textAnchor="end">
          {fmtDate(last.day)}
        </text>
        
        {/* Lines with hover-free tooltips via <title> */}
        <polyline points={line("output")} className="line-output">
          <title>Output price per 1M tokens</title>
        </polyline>
        <polyline points={line("input")} className="line-input">
          <title>Input price per 1M tokens</title>
        </polyline>
        
        {/* Dots at endpoints with tooltips */}
        {last.output !== null && (
          <circle cx={x(history.length - 1)} cy={y(last.output)} r="5" className="dot">
            <title>Output: {fmtUsd(last.output, 2)} on {fmtDate(last.day)}</title>
          </circle>
        )}
        {first.output !== null && (
          <circle cx={x(0)} cy={y(first.output)} r="4" className="dot" opacity="0.6">
            <title>Output: {fmtUsd(first.output, 2)} on {fmtDate(first.day)}</title>
          </circle>
        )}
      </svg>
      <div className="legend">
        <span className="out">Output (solid)</span>
        <span className="in">Input (dashed)</span>
      </div>
      <p className="src-note" style={{ marginTop: "12px" }}>
        Output {fmtUsd(first.output, 2)} → {fmtUsd(last.output, 2)}
        {change(first.output, last.output)} · Input {fmtUsd(first.input, 3)} → {fmtUsd(last.input, 3)}
        {change(first.input, last.input)} · {fmtDate(first.day)} – {fmtDate(last.day)}.
      </p>
    </section>
  );
}

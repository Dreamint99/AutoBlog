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
  const H = 160;
  const vals = history.flatMap((h) => [h.input, h.output]).filter((v): v is number => v !== null);
  const max = Math.max(...vals, 0.0001);
  const x = (i: number) => (i / (history.length - 1)) * (W - 20) + 10;
  const y = (v: number) => H - 14 - (v / max) * (H - 30);
  const line = (k: "input" | "output") =>
    history
      .map((h, i) => (h[k] === null ? null : `${x(i).toFixed(1)},${y(h[k] as number).toFixed(1)}`))
      .filter(Boolean)
      .join(" ");
  const change = (a: number | null, b: number | null) =>
    a === null || b === null || a === 0 ? "" : ` (${b >= a ? "+" : ""}${(((b - a) / a) * 100).toFixed(0)}%)`;
  return (
    <section className="spec-block">
      <h2 className="block-h">Price history</h2>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Input and output price per 1M tokens over time">
        <polyline points={line("output")} fill="none" stroke="currentColor" strokeWidth="2.5" />
        <polyline points={line("input")} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="5 4" />
      </svg>
      <p className="src-note">
        Output {fmtUsd(first.output, 2)} → {fmtUsd(last.output, 2)}
        {change(first.output, last.output)} · Input {fmtUsd(first.input, 3)} → {fmtUsd(last.input, 3)}
        {change(first.input, last.input)} · {fmtDate(first.day)} – {fmtDate(last.day)}. Solid line = output, dashed = input.
      </p>
    </section>
  );
}

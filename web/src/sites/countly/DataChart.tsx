import "./data.css";

/* Horizontal bar chart in HTML + CSS (readable at 360px, unlike a scaled-down SVG).
   Negative values grow left from the zero line. Same props and caption as before. */
export default function DataChart({ title, rows, format }: { title: string; rows: { label: string; value: number }[]; format: (n: number) => string }) {
  const min = Math.min(0, ...rows.map((r) => r.value)), max = Math.max(0, ...rows.map((r) => r.value));
  const span = max - min || 1;
  const pct = (n: number) => ((n - min) / span) * 100;
  const zero = pct(0);
  return (
    <figure className="cd-dchart">
      <div role="img" aria-label={`${title}. ${rows.map((r) => `${r.label}: ${format(r.value)}`).join("; ")}`} className="cd-dchart-box">
        <div className="cd-dchart-title" aria-hidden="true">{title}</div>
        <ol aria-hidden="true">
          {rows.map((r, i) => {
            const x = pct(r.value);
            return (
              <li key={i} className={r.value < 0 ? "neg" : i === 0 ? "lead" : ""}>
                <span className="l">{r.label}</span>
                <span className="t">
                  {min < 0 ? <em style={{ left: `${zero.toFixed(2)}%` }} /> : null}
                  <i style={{ left: `${Math.min(zero, x).toFixed(2)}%`, width: `${Math.max(0.6, Math.abs(x - zero)).toFixed(2)}%` }} />
                </span>
                <span className="v">{format(r.value)}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <figcaption>{title}. Source: World Bank. Exact values and observation years are in the table.</figcaption>
    </figure>
  );
}

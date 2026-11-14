export default function DataChart({ title, rows, format }: { title: string; rows: { label: string; value: number }[]; format: (n: number) => string }) {
  const min = Math.min(0, ...rows.map(r => r.value)), max = Math.max(0, ...rows.map(r => r.value));
  const x = (n: number) => 260 + 490 * (n - min) / (max - min || 1), zero = x(0), height = rows.length * 36 + 64;
  return <figure><svg role="img" aria-label={title} viewBox={`0 0 900 ${height}`} style={{ display: "block", width: "100%", height: "auto", background: "#fff", color: "#111827" }}>
    <title>{title}</title><desc>{rows.map(r => `${r.label}: ${format(r.value)}`).join("; ")}</desc>
    <text x="12" y="24" fontSize="18" fontWeight="700" fill="#111827">{title}</text>
    <line x1={zero} x2={zero} y1="36" y2={height - 8} stroke="#9ca3af" />
    {rows.map((r, i) => <g key={i}><text x="12" y={58 + i * 36} fontSize="14" fill="#111827">{r.label.length > 28 ? r.label.slice(0, 27) + "…" : r.label}</text><rect x={Math.min(zero, x(r.value))} y={41 + i * 36} width={Math.max(1, Math.abs(x(r.value) - zero))} height="24" fill={r.value < 0 ? "#b91c1c" : "#0369a1"} /><text x="770" y={58 + i * 36} fontSize="13" fill="#111827">{format(r.value)}</text></g>)}
  </svg><figcaption>{title}. Source: World Bank. Exact values and observation years are in the table.</figcaption></figure>;
}

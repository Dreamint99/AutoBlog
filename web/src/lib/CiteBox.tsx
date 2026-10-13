"use client";

import { useState } from "react";

// "Use this data" box under an article: a ready-made link and a citation that bloggers,
// students and journalists can paste. Natural, editorial backlinks — the white-hat way
// data sites (Statista, Our World in Data) earn links. Styled with currentColor so it
// fits every site theme.
export default function CiteBox({ url, title, site, date }: { url: string; title: string; site: string; date?: string }) {
  const [copied, setCopied] = useState("");
  const year = (date || "").slice(0, 4) || String(new Date().getFullYear());
  const html = `<a href="${url}">${title} — ${site}</a>`;
  const cite = `${site} (${year}). ${title}. Retrieved from ${url}`;
  const copy = (k: string, v: string) => {
    navigator.clipboard?.writeText(v).then(() => { setCopied(k); setTimeout(() => setCopied(""), 1800); }).catch(() => {});
  };
  const row = { display: "flex", gap: 8, alignItems: "stretch", marginTop: 8 } as const;
  const code = { flex: 1, minWidth: 0, font: "13px/1.45 ui-monospace,Consolas,monospace", padding: "8px 10px", borderRadius: 8,
    border: "1px solid rgba(127,127,127,.35)", background: "rgba(127,127,127,.08)", overflowX: "auto", whiteSpace: "nowrap" } as const;
  const btn = { flex: "0 0 auto", padding: "0 12px", borderRadius: 8, border: "1px solid rgba(127,127,127,.45)", background: "transparent",
    color: "inherit", font: "600 13px/1 inherit", cursor: "pointer" } as const;
  return (
    <aside aria-label="Cite this page" style={{ margin: "28px 0", padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(127,127,127,.3)" }}>
      <strong style={{ display: "block", fontSize: 16 }}>Use this data</strong>
      <span style={{ fontSize: 14, opacity: 0.8 }}>Free to quote with a link back to this page.</span>
      <div style={row}>
        <code style={code}>{html}</code>
        <button type="button" style={btn} onClick={() => copy("html", html)}>{copied === "html" ? "Copied" : "Copy link"}</button>
      </div>
      <div style={row}>
        <code style={code}>{cite}</code>
        <button type="button" style={btn} onClick={() => copy("cite", cite)}>{copied === "cite" ? "Copied" : "Copy citation"}</button>
      </div>
    </aside>
  );
}

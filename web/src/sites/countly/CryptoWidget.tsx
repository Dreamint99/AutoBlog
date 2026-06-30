"use client";

import { useEffect, useMemo, useState } from "react";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number;
  image: string;
};

function big(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export default function CryptoWidget() {
  const [coins, setCoins] = useState<Coin[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h"
      )
        .then((r) => r.json())
        .then((d) => { if (alive && Array.isArray(d)) setCoins(d); })
        .catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const rows = useMemo(() => {
    if (!coins) return [];
    const term = q.trim().toLowerCase();
    return term ? coins.filter((c) => c.name.toLowerCase().includes(term) || c.symbol.toLowerCase().includes(term)) : coins;
  }, [coins, q]);

  return (
    <div className="cn-tool">
      <div className="cn-tool-row">
        <div className="cn-tool-field" style={{ flex: 1 }}>
          <label>Search coin</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bitcoin, ETH, Solana…" aria-label="Search coin" />
        </div>
        <span className="cn-tool-live"><span className="cn-tick-dot" aria-hidden="true" /> LIVE · auto-refresh 60s</span>
      </div>

      {!coins ? (
        <p className="cn-tool-muted">Loading live prices…</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="cn-rich">
            <thead>
              <tr><th>#</th><th>Coin</th><th>Price</th><th>24h</th><th>Market cap</th></tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const up = (c.price_change_percentage_24h ?? 0) >= 0;
                return (
                  <tr key={c.id}>
                    <td className="cn-rich-rank">{i + 1}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        {c.image ? <img src={c.image} alt="" width={20} height={20} style={{ borderRadius: "50%" }} /> : null}
                        {c.name} <span className="cn-tool-muted">{c.symbol.toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="cn-rich-worth">${c.current_price.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                    <td className={up ? "cn-up" : "cn-down"}>{up ? "▲" : "▼"}{Math.abs(c.price_change_percentage_24h ?? 0).toFixed(1)}%</td>
                    <td>{big(c.market_cap)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

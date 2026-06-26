"use client";

import { useEffect, useState } from "react";

/* Live data ticker for the Countly homepage — client-side, real-time feel.
   Pulls from free, CORS-enabled, no-key APIs:
     - CoinGecko  : BTC/ETH/SOL price + 24h change
     - alternative.me : crypto Fear & Greed index
     - open.er-api.com : USD → BDT/INR
   Plus a live world-population counter (real base, ~2.3/sec growth estimate).
   Fails silently per-item; never blocks the page. */

type Coin = { symbol: string; current_price: number; price_change_percentage_24h: number | null };

function money(n: number) {
  return n >= 1000 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(2)}`;
}

export default function LiveTicker() {
  const [coins, setCoins] = useState<Coin[] | null>(null);
  const [fng, setFng] = useState<{ value: string; value_classification: string } | null>(null);
  const [fx, setFx] = useState<Record<string, number> | null>(null);
  const [pop, setPop] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const c = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&price_change_percentage=24h"
        ).then((r) => r.json());
        if (alive && Array.isArray(c)) setCoins(c);
      } catch {}
      try {
        const f = await fetch("https://api.alternative.me/fng/?limit=1").then((r) => r.json());
        if (alive && f?.data?.[0]) setFng(f.data[0]);
      } catch {}
      try {
        const x = await fetch("https://open.er-api.com/v6/latest/USD").then((r) => r.json());
        if (alive && x?.rates) setFx(x.rates);
      } catch {}
    }
    load();
    const id = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    // World population: real base + steady net-growth estimate (~2.3 people/sec).
    const BASE = 8_090_000_000;
    const EPOCH = Date.UTC(2025, 0, 1) / 1000;
    const RATE = 2.3;
    const tick = () => setPop(Math.floor(BASE + (Date.now() / 1000 - EPOCH) * RATE));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const item = (label: string, value: React.ReactNode, cls = "") => (
    <span className="cn-tick-item">
      <span className="cn-tick-label">{label}</span>
      <span className={`cn-tick-val ${cls}`}>{value}</span>
    </span>
  );

  const coinItem = (c: Coin) => {
    const up = (c.price_change_percentage_24h ?? 0) >= 0;
    return item(
      c.symbol.toUpperCase(),
      <>
        {money(c.current_price)}{" "}
        <span className={up ? "cn-up" : "cn-down"}>
          {up ? "▲" : "▼"}
          {Math.abs(c.price_change_percentage_24h ?? 0).toFixed(1)}%
        </span>
      </>
    );
  };

  return (
    <div className="cn-ticker" aria-label="Live data ticker">
      <span className="cn-tick-live">
        <span className="cn-tick-dot" aria-hidden="true" /> LIVE
      </span>
      <div className="cn-tick-track">
        {coins ? coins.map((c) => <span key={c.symbol}>{coinItem(c)}</span>) : item("BTC", "…")}
        {fx ? (
          <>
            {item("USD→BDT", fx.BDT ? fx.BDT.toFixed(2) : "—")}
            {item("USD→INR", fx.INR ? fx.INR.toFixed(2) : "—")}
          </>
        ) : null}
        {fng
          ? item(
              "Fear & Greed",
              <>
                {fng.value} <span className="cn-tick-muted">({fng.value_classification})</span>
              </>
            )
          : null}
        {pop ? item("🌍 World population", <span suppressHydrationWarning>{pop.toLocaleString()}</span>) : null}
      </div>
    </div>
  );
}

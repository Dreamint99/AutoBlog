"use client";

import { useEffect, useMemo, useState } from "react";

const QUICK: [string, string][] = [
  ["USD", "BDT"], ["USD", "INR"], ["USD", "PKR"], ["USD", "EUR"],
  ["GBP", "BDT"], ["EUR", "INR"], ["USD", "QAR"], ["SAR", "INR"],
];

export default function CurrencyWidget() {
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("BDT");
  const [updated, setUpdated] = useState("");

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((d) => {
        if (d?.rates) {
          setRates(d.rates);
          if (d.time_last_update_utc) setUpdated(new Date(d.time_last_update_utc).toLocaleDateString());
        }
      })
      .catch(() => {});
  }, []);

  const codes = useMemo(() => (rates ? Object.keys(rates).sort() : ["USD", "BDT", "INR", "EUR", "GBP"]), [rates]);

  const result = useMemo(() => {
    const a = parseFloat(amount);
    if (!rates || isNaN(a)) return null;
    const usd = a / (rates[from] || 1);
    return usd * (rates[to] || 1);
  }, [rates, amount, from, to]);

  const rate1 = rates ? rates[to] / (rates[from] || 1) : null;

  return (
    <div className="cn-tool">
      <div className="cn-tool-row">
        <div className="cn-tool-field">
          <label>Amount</label>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount"
          />
        </div>
        <div className="cn-tool-field">
          <label>From</label>
          <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From currency">
            {codes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button
          className="cn-tool-swap"
          type="button"
          onClick={() => { setFrom(to); setTo(from); }}
          aria-label="Swap currencies"
        >
          ⇄
        </button>
        <div className="cn-tool-field">
          <label>To</label>
          <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="To currency">
            {codes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="cn-tool-result">
        {result === null ? (
          <span className="cn-tool-muted">Loading live rates…</span>
        ) : (
          <>
            <b>
              {Number(amount || 0).toLocaleString()} {from} ={" "}
              <span className="cn-tool-out">{result.toLocaleString(undefined, { maximumFractionDigits: 2 })} {to}</span>
            </b>
            {rate1 ? <span className="cn-tool-muted">1 {from} = {rate1.toLocaleString(undefined, { maximumFractionDigits: 4 })} {to}{updated ? ` · updated ${updated}` : ""}</span> : null}
          </>
        )}
      </div>

      <div className="cn-tool-quick">
        {QUICK.map(([f, t]) => (
          <button key={`${f}-${t}`} type="button" onClick={() => { setFrom(f); setTo(t); }}>
            {f}→{t}
          </button>
        ))}
      </div>
    </div>
  );
}

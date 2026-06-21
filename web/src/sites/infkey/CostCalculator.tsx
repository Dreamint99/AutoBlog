"use client";

/* ────────────────────────────────────────────────────────────────────
   InfKey — LLM API Cost Calculator (flagship interactive widget)

   The one piece of client-side JS on the site. Everything else stays
   server-rendered. Real workload → real per-model cost, ranked
   cheapest → priciest.

   Prices come from the `infkey_models` table via props. When rendered
   with no props (e.g. on the home hero) it falls back to DEFAULT_MODELS.
   ⚠️  Re-verify every price against the provider's pricing page.
   ──────────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";

const DEFAULT_VERIFIED_ON = "June 20, 2026";

export type CalcModel = {
  id: string;
  name: string;
  vendor: string;
  inPerM: number; // USD / 1M input tokens
  outPerM: number; // USD / 1M output tokens
};

// Fallback list (used when no DB models are passed). Edit / re-verify.
const DEFAULT_MODELS: CalcModel[] = [
  { id: "gemini-1-5-flash", name: "Gemini 1.5 Flash", vendor: "Google", inPerM: 0.075, outPerM: 0.3 },
  { id: "gpt-4o-mini", name: "GPT-4o mini", vendor: "OpenAI", inPerM: 0.15, outPerM: 0.6 },
  { id: "deepseek-v3", name: "DeepSeek-V3", vendor: "DeepSeek", inPerM: 0.27, outPerM: 1.1 },
  { id: "llama-3-1-70b", name: "Llama 3.1 70B", vendor: "Host", inPerM: 0.4, outPerM: 0.4 },
  { id: "claude-3-5-haiku", name: "Claude 3.5 Haiku", vendor: "Anthropic", inPerM: 0.8, outPerM: 4.0 },
  { id: "gemini-1-5-pro", name: "Gemini 1.5 Pro", vendor: "Google", inPerM: 1.25, outPerM: 5.0 },
  { id: "gpt-4o", name: "GPT-4o", vendor: "OpenAI", inPerM: 2.5, outPerM: 10.0 },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", vendor: "Anthropic", inPerM: 3.0, outPerM: 15.0 },
];

const DAYS_PER_MONTH = 30;

function clampInt(v: string, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function usd(n: number): string {
  if (n === 0) return "$0";
  if (n < 0.01) return "$" + n.toFixed(4);
  if (n < 1) return "$" + n.toFixed(3);
  if (n < 1000) return "$" + n.toFixed(2);
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function costPerRequest(m: CalcModel, inTok: number, outTok: number): number {
  return (inTok / 1_000_000) * m.inPerM + (outTok / 1_000_000) * m.outPerM;
}

export default function CostCalculator({
  models = DEFAULT_MODELS,
  verifiedOn = DEFAULT_VERIFIED_ON,
}: {
  models?: CalcModel[];
  verifiedOn?: string;
}) {
  const list = models.length > 0 ? models : DEFAULT_MODELS;

  const [modelId, setModelId] = useState<string>(
    () => list.find((m) => m.id === "deepseek-v3")?.id ?? list[0].id,
  );
  const [inTok, setInTok] = useState<number>(1000);
  const [outTok, setOutTok] = useState<number>(500);
  const [reqPerDay, setReqPerDay] = useState<number>(5000);

  const selected = list.find((m) => m.id === modelId) ?? list[0];

  const { perReq, daily, monthly, blendedPerM, ranked, cheapest } = useMemo(() => {
    const perReq = costPerRequest(selected, inTok, outTok);
    const daily = perReq * reqPerDay;
    const monthly = daily * DAYS_PER_MONTH;
    const totalTok = inTok + outTok;
    const blendedPerM = totalTok > 0 ? (perReq / totalTok) * 1_000_000 : 0;

    const ranked = list
      .map((m) => ({ model: m, month: costPerRequest(m, inTok, outTok) * reqPerDay * DAYS_PER_MONTH }))
      .sort((a, b) => a.month - b.month);

    const cheapest = ranked[0]?.month ?? 0;
    return { perReq, daily, monthly, blendedPerM, ranked, cheapest };
  }, [selected, inTok, outTok, reqPerDay, list]);

  function tierOf(month: number): "cheap" | "mid" | "pricey" {
    if (cheapest <= 0) return "cheap";
    const ratio = month / cheapest;
    if (ratio <= 1.6) return "cheap";
    if (ratio <= 4) return "mid";
    return "pricey";
  }

  return (
    <div className="calc" id="calculator">
      <div className="calc-top">
        <span className="dot" aria-hidden="true" />
        <h3>LLM API Cost Calculator</h3>
        <span className="pill">Verified {verifiedOn}</span>
      </div>

      <div className="calc-body">
        <div className="calc-controls">
          <div className="field full">
            <label htmlFor="ik-model">
              Model <span className="hint">{selected.vendor}</span>
            </label>
            <select id="ik-model" value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {list.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — ${m.inPerM}/${m.outPerM} per 1M
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="ik-in">
              Input tokens <span className="hint">/ request</span>
            </label>
            <input
              id="ik-in"
              type="number"
              min={0}
              max={2_000_000}
              step={100}
              value={inTok}
              onChange={(e) => setInTok(clampInt(e.target.value, 0, 2_000_000))}
            />
          </div>

          <div className="field">
            <label htmlFor="ik-out">
              Output tokens <span className="hint">/ request</span>
            </label>
            <input
              id="ik-out"
              type="number"
              min={0}
              max={2_000_000}
              step={100}
              value={outTok}
              onChange={(e) => setOutTok(clampInt(e.target.value, 0, 2_000_000))}
            />
          </div>

          <div className="field full">
            <label htmlFor="ik-req">
              Requests / day <span className="hint">{reqPerDay.toLocaleString("en-US")}/day</span>
            </label>
            <input
              id="ik-req"
              type="range"
              min={0}
              max={200000}
              step={500}
              value={reqPerDay}
              onChange={(e) => setReqPerDay(clampInt(e.target.value, 0, 200000))}
              aria-label="Requests per day"
            />
          </div>
        </div>

        <div className="calc-out">
          <div className="readout primary">
            <div className="k">Est. monthly cost</div>
            <div className="v">
              {usd(monthly)} <small>/mo</small>
            </div>
          </div>
          <div className="readout">
            <div className="k">Per request</div>
            <div className="v">{usd(perReq)}</div>
          </div>
          <div className="readout">
            <div className="k">Blended / 1M</div>
            <div className="v">{usd(blendedPerM)}</div>
          </div>
        </div>

        <div className="rank" role="table" aria-label="Cost ranking across models">
          <div className="rank-head" role="row">
            <span role="columnheader">Model</span>
            <span role="columnheader" style={{ textAlign: "right" }}>
              Monthly
            </span>
            <span role="columnheader" style={{ justifySelf: "end" }}>
              Tier
            </span>
          </div>
          {ranked.map(({ model, month }) => {
            const tier = tierOf(month);
            return (
              <div className={`rank-row${model.id === selected.id ? " active" : ""}`} role="row" key={model.id}>
                <span className="name" role="cell">
                  <b>{model.name}</b>
                  <span className="vendor">{model.vendor}</span>
                </span>
                <span className="cost" role="cell">
                  {usd(month)}
                </span>
                <span className={`tier ${tier}`} role="cell">
                  {tier === "cheap" ? "Best" : tier === "mid" ? "Mid" : "High"}
                </span>
              </div>
            );
          })}
        </div>

        <p className="calc-note">
          <b>How it works:</b> cost = (input ÷ 1M × input price) + (output ÷ 1M × output price), ×
          requests/day × 30. Prices are USD per 1M tokens, last checked {verifiedOn}.{" "}
          <b>Verify against each provider&apos;s pricing page before relying on it</b> — AI prices
          change fast, and this excludes taxes, caching discounts and failed-generation retries.
        </p>
      </div>
    </div>
  );
}

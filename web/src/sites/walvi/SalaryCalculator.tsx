"use client";

/* ────────────────────────────────────────────────────────────────────
   VisaPoint — Europe Salary & Savings Calculator (flagship interactive widget)

   The headline tool: a real gross wage + a country (for living-cost and
   tax defaults) → net pay, realistic monthly savings, yearly savings and an
   approximate BDT figure. Accommodation toggle reflects the single biggest
   savings lever for imported workers (employer-provided housing).

   Country cost/tax defaults come from `countriesLite()` via props. All
   figures are INDICATIVE — re-verify against a real offer.
   ──────────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import type { CountryLite } from "@/lib/walvi";

const HOURS_PER_MONTH = 173;
const WEEKS_PER_MONTH = 4.33;

function clampNum(v: string, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function eur(n: number): string {
  return "€" + Math.round(n).toLocaleString("en-US");
}

export default function SalaryCalculator({
  countries,
  verifiedOn,
  eurToBdt = 128,
}: {
  countries: CountryLite[];
  verifiedOn?: string;
  eurToBdt?: number;
}) {
  const [countryId, setCountryId] = useState<string>(
    () => countries.find((c) => c.id === "poland")?.id ?? countries[0]?.id ?? "",
  );
  const [gross, setGross] = useState<number>(1900);
  const [housed, setHoused] = useState<boolean>(true);
  const [otHours, setOtHours] = useState<number>(0);

  const country = countries.find((c) => c.id === countryId) ?? countries[0];

  const r = useMemo(() => {
    if (!country) {
      return { otPay: 0, totalGross: 0, net: 0, rent: 0, food: 0, other: 0, costs: 0, savings: 0, yearly: 0, bdt: 0 };
    }
    const hourlyBase = gross / HOURS_PER_MONTH;
    const otPay = otHours * WEEKS_PER_MONTH * hourlyBase * 1.5;
    const totalGross = gross + otPay;
    const net = totalGross * country.netRatio;
    const rent = housed ? 0 : country.accommodationEUR;
    const food = country.foodEUR;
    const other = country.otherEUR;
    const costs = rent + food + other;
    const savings = Math.max(0, net - costs);
    return { otPay, totalGross, net, rent, food, other, costs, savings, yearly: savings * 12, bdt: savings * eurToBdt };
  }, [country, gross, housed, otHours, eurToBdt]);

  if (!country) return null;

  return (
    <div className="calc" id="calculator">
      <div className="calc-top">
        <span className="dot" aria-hidden="true" />
        <h3>Europe Salary &amp; Savings Calculator</h3>
        {verifiedOn ? <span className="pill">Reviewed {verifiedOn}</span> : null}
      </div>

      <div className="calc-body">
        <div className="calc-controls">
          <div className="field full">
            <label htmlFor="wv-country">
              Country <span className="hint">sets tax &amp; living-cost defaults</span>
            </label>
            <select id="wv-country" value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flag} {c.name} — net ≈ {Math.round(c.netRatio * 100)}% of gross
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="wv-gross">
              Monthly gross <span className="hint">EUR</span>
            </label>
            <input
              id="wv-gross"
              type="number"
              min={0}
              max={20000}
              step={50}
              value={gross}
              onChange={(e) => setGross(clampNum(e.target.value, 0, 20000))}
            />
          </div>

          <div className="field">
            <label htmlFor="wv-ot">
              Overtime <span className="hint">hours / week</span>
            </label>
            <input
              id="wv-ot"
              type="number"
              min={0}
              max={40}
              step={1}
              value={otHours}
              onChange={(e) => setOtHours(clampNum(e.target.value, 0, 40))}
            />
          </div>

          <label className="field check full" htmlFor="wv-housed">
            <input
              id="wv-housed"
              type="checkbox"
              checked={housed}
              onChange={(e) => setHoused(e.target.checked)}
            />
            Employer provides accommodation (common for imported workers)
          </label>
        </div>

        <div className="calc-out">
          <div className="readout primary">
            <div className="k">Est. monthly savings</div>
            <div className="v">
              {eur(r.savings)} <small>/mo</small>
            </div>
          </div>
          <div className="readout">
            <div className="k">Net pay</div>
            <div className="v">{eur(r.net)}</div>
          </div>
          <div className="readout">
            <div className="k">Yearly savings</div>
            <div className="v">{eur(r.yearly)}</div>
          </div>
        </div>

        <div className="breakdown">
          <div className="brow">
            <span className="bl">Net pay {r.otPay > 0 ? "(incl. overtime)" : "after tax"}</span>
            <span className="bv">{eur(r.net)}</span>
          </div>
          <div className="brow minus">
            <span className="bl">Accommodation {housed ? "(employer-paid)" : ""}</span>
            <span className="bv">{housed ? "€0" : "−" + eur(r.rent)}</span>
          </div>
          <div className="brow minus">
            <span className="bl">Food</span>
            <span className="bv">−{eur(r.food)}</span>
          </div>
          <div className="brow minus">
            <span className="bl">Transport &amp; misc</span>
            <span className="bv">−{eur(r.other)}</span>
          </div>
          <div className="brow total">
            <span className="bl">Monthly savings</span>
            <span className="bv">{eur(r.savings)}</span>
          </div>
        </div>

        <p className="calc-note">
          <b>≈ ৳{Math.round(r.bdt).toLocaleString("en-US")} / month</b> at ~{eurToBdt} BDT per EUR (rate
          changes daily). <b>How it works:</b> net = (gross + overtime) × the country&apos;s typical
          take-home rate; savings = net − accommodation − food − transport. Figures are{" "}
          <b>indicative estimates</b>, exclude personal tax circumstances and employer-specific terms,
          and must be confirmed against a real offer.
        </p>
      </div>
    </div>
  );
}

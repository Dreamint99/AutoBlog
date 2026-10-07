"use client";

/* ────────────────────────────────────────────────────────────────────
   VisaPoint — Country Comparison Calculator

   Pick an occupation and two countries → side-by-side gross, net, living
   cost and realistic (employer-housed) savings, with a clear "saves more"
   verdict. Estimates are precomputed server-side and passed in, so the
   numbers match the country/job pages exactly.
   ──────────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import type { CountryLite, JobLite, EstimateLite } from "@/lib/walvi";

function eur(n: number): string {
  return "€" + Math.round(n).toLocaleString("en-US");
}

export default function CompareCalculator({
  countries,
  jobs,
  estimates,
}: {
  countries: CountryLite[];
  jobs: JobLite[];
  estimates: EstimateLite[];
}) {
  const [jobId, setJobId] = useState<string>(() => jobs[0]?.id ?? "");
  const [aId, setAId] = useState<string>(() => countries.find((c) => c.id === "poland")?.id ?? countries[0]?.id ?? "");
  const [bId, setBId] = useState<string>(() => countries.find((c) => c.id === "croatia")?.id ?? countries[1]?.id ?? "");

  const lookup = useMemo(() => {
    const m = new Map<string, EstimateLite>();
    for (const e of estimates) m.set(`${e.countryId}:${e.jobId}`, e);
    return m;
  }, [estimates]);

  const cById = useMemo(() => new Map(countries.map((c) => [c.id, c])), [countries]);

  function side(countryId: string) {
    const c = cById.get(countryId);
    const e = lookup.get(`${countryId}:${jobId}`);
    if (!c || !e) return null;
    const living = c.foodEUR + c.otherEUR;
    return { c, gross: e.grossEUR, net: e.netEUR, living, savings: e.savingsHousedEUR };
  }

  const A = side(aId);
  const B = side(bId);
  const winner = A && B ? (A.savings === B.savings ? "tie" : A.savings > B.savings ? "a" : "b") : null;
  const jobName = jobs.find((j) => j.id === jobId)?.name ?? "";

  return (
    <div className="calc">
      <div className="calc-top">
        <span className="dot" aria-hidden="true" />
        <h3>Country Comparison</h3>
        <span className="pill">Housed savings</span>
      </div>

      <div className="calc-body">
        <div className="calc-controls">
          <div className="field full">
            <label htmlFor="wv-cmp-job">Occupation</label>
            <select id="wv-cmp-job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.icon} {j.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="wv-cmp-a">Country A</label>
            <select id="wv-cmp-a" value={aId} onChange={(e) => setAId(e.target.value)}>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="wv-cmp-b">Country B</label>
            <select id="wv-cmp-b" value={bId} onChange={(e) => setBId(e.target.value)}>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {winner && winner !== "tie" ? (
          <div className="win-banner">
            For a {jobName}, {(winner === "a" ? A : B)!.c.flag} {(winner === "a" ? A : B)!.c.name} saves
            more — about {eur((winner === "a" ? A : B)!.savings - (winner === "a" ? B : A)!.savings)}/month
            extra with employer housing.
          </div>
        ) : winner === "tie" ? (
          <div className="win-banner">Both countries save about the same for a {jobName}.</div>
        ) : null}

        <div className="vs-grid">
          {A ? (
            <div className={`vs-col${winner === "a" ? " win" : ""}`}>
              <div className="vflag" aria-hidden="true">
                {A.c.flag}
              </div>
              <div className="vname">{A.c.name}</div>
              <div className="vbig">
                {eur(A.savings)} <small>/mo saved</small>
              </div>
              <div className="vrow">
                <span>Gross</span>
                <span>{eur(A.gross)}</span>
              </div>
              <div className="vrow">
                <span>Net</span>
                <span>{eur(A.net)}</span>
              </div>
              <div className="vrow">
                <span>Living cost</span>
                <span>{eur(A.living)}</span>
              </div>
            </div>
          ) : null}

          <div className="vs-mid">VS</div>

          {B ? (
            <div className={`vs-col${winner === "b" ? " win" : ""}`}>
              <div className="vflag" aria-hidden="true">
                {B.c.flag}
              </div>
              <div className="vname">{B.c.name}</div>
              <div className="vbig">
                {eur(B.savings)} <small>/mo saved</small>
              </div>
              <div className="vrow">
                <span>Gross</span>
                <span>{eur(B.gross)}</span>
              </div>
              <div className="vrow">
                <span>Net</span>
                <span>{eur(B.net)}</span>
              </div>
              <div className="vrow">
                <span>Living cost</span>
                <span>{eur(B.living)}</span>
              </div>
            </div>
          ) : null}
        </div>

        <p className="calc-note">
          <b>Savings shown assume employer-provided accommodation</b> (the common arrangement for
          imported workers). Living cost = food + transport &amp; misc only. All figures are indicative
          estimates — a real offer&apos;s pay, deductions and housing terms decide actual savings.
        </p>
      </div>
    </div>
  );
}

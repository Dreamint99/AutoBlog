import Link from "next/link";
import type { Site } from "@/lib/types";
import { HubPage, Crumbs, PageHead, BigStat, StatRow, DataTable, Faq, SourceLine, Related, Callout, SectionHead } from "./ui";
import { computeGratuity, exampleSlug, type GratuityRule, type Reason } from "./gratuity";
import { GULF_CURRENCIES } from "./config";
import { fmt, money, int } from "./format";

/* Gratuity calculator page.
 *
 * Works with JavaScript switched off: the form is a GET form and the server
 * renders the answer from the query string. If the country's law has not been
 * verified against an official source, the page shows no number at all.
 */

export type GratuityPageProps = {
  site: Site;
  country: string;
  countryName: string;
  currency: string;
  rule: GratuityRule;
  input: { monthlyWage: number; years: number; reason: Reason } | null;
  /** Present on the pre-computed example pages. */
  example?: { wage: number; years: number };
};

const REASONS: { key: Reason; label: string; blurb: string }[] = [
  { key: "resignation", label: "I resigned", blurb: "you ended the contract" },
  { key: "termination", label: "Employer terminated", blurb: "or the contract ended normally" },
];

export default function GratuityPage({ site, country, countryName, currency, rule, input, example }: GratuityPageProps) {
  const b = `/s/${site.id}`;
  const wage = input?.monthlyWage ?? 5000;
  const years = input?.years ?? 5;
  const reason = input?.reason ?? "resignation";
  const result = rule.confirmed ? computeGratuity(rule, { monthlyWage: wage, years, reason }) : null;

  const examples = [1, 3, 5, 7, 10, 15].map((y) => ({ y, r: rule.confirmed ? computeGratuity(rule, { monthlyWage: wage, years: y, reason }) : null }));

  return (
    <HubPage site={site} active="tools">
      <Crumbs site={site} items={[{ label: "Calculators", href: `${b}/calculators` }, { label: "Gratuity" }, { label: countryName }]} />
      <PageHead
        kicker={`${countryName} · end-of-service benefit`}
        title={
          example ? (
            <>
              Gratuity for {currency} {int(example.wage)} basic after {example.years} years in {countryName}
            </>
          ) : (
            <>
              Gratuity calculator — {countryName} end-of-service pay
            </>
          )
        }
        dek={
          rule.confirmed ? (
            <>
              {rule.plain_english} Calculated on {rule.wage_base === "basic" ? "the basic wage" : "the full wage (basic + regular allowances)"}, under{" "}
              {rule.article || "the labour law"}.
            </>
          ) : (
            <>We could not verify {countryName}&apos;s current gratuity formula against an official source, so this page will not guess. The official portal is linked below.</>
          )
        }
      />

      {rule.confirmed ? (
        <form className="gh-form" method="get" action={`${b}/gratuity/${country}`}>
          <div>
            <label htmlFor="wage">Monthly {rule.wage_base === "basic" ? "basic " : ""}wage ({currency})</label>
            <input id="wage" name="wage" type="number" inputMode="decimal" min="0" step="50" defaultValue={wage} />
          </div>
          <div>
            <label htmlFor="years">Years of service</label>
            <input id="years" name="years" type="number" inputMode="decimal" min="0" step="0.5" defaultValue={years} />
          </div>
          <div>
            <label htmlFor="reason">How the job ended</label>
            <select id="reason" name="reason" defaultValue={reason}>
              {REASONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label} — {r.blurb}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Calculate my gratuity</button>
          <p className="gh-hint">
            The answer appears on this page after you press the button — no data leaves your browser, and the calculation runs on the server.
          </p>
        </form>
      ) : null}

      {result && result.eligible ? (
        <div className="gh-answer">
          <span>End-of-service gratuity</span>
          <b>
            {currency} {fmt(result.amount, 2)}
          </b>
          <p>
            {fmt(result.days, 2)} days of wage × {currency} {fmt(result.dailyWage, 2)} per day
            {result.factor !== 1 ? `, reduced to ${Math.round(result.factor * 100)}% because you resigned` : ""}
            {result.capped ? `, then capped at ${result.capMonths} months' wage (${currency} ${fmt(result.capAmount!, 2)})` : ""}.
          </p>
        </div>
      ) : result ? (
        <Callout tone="warn" title={`No gratuity is due at ${fmt(years, 1)} years`}>
          <p style={{ margin: 0 }}>
            {rule.min_service_years > 0
              ? `${countryName} requires at least ${rule.min_service_years} year${rule.min_service_years === 1 ? "" : "s"} of continuous service before any end-of-service benefit accrues.`
              : "The inputs did not produce an entitlement — check the wage and years."}
            {reason === "resignation" && rule.resignation_factors.length > 1
              ? " A resignation below the first threshold can pay nothing even where a termination would pay."
              : ""}
          </p>
        </Callout>
      ) : null}

      {rule.confirmed ? (
        <>
          <SectionHead title="How this number is worked out" dek="The same arithmetic the page just ran, step by step." />
          <DataTable
            head={["Step", "Value"]}
            rows={[
              ["Wage used", `${currency} ${fmt(wage, 2)} per month (${rule.wage_base === "basic" ? "basic" : "basic + regular allowances"})`],
              ["Daily wage", `${currency} ${fmt(result?.dailyWage ?? wage / 30, 2)} = monthly ÷ ${rule.daily_divisor}`],
              ["Days earned per year", rule.tiers.map((t) => `${t.upToYears ? `first ${t.upToYears} years` : "thereafter"}: ${t.daysPerYear} days`).join(" · ")],
              ["Months' wage cap", rule.cap_months ? `${rule.cap_months} months` : "none in the law"],
              ["Resignation reduction", rule.resignation_factors.length > 1 ? rule.resignation_factors.map((r) => `${r.minYears}+ yrs: ${Math.round(r.factor * 100)}%`).join(" · ") : "none — same on resignation"],
            ]}
            caption={`${countryName} rules as coded on this page`}
          />

          <SectionHead title={`What you get after different lengths of service`} dek={`On a ${currency} ${int(wage)} ${rule.wage_base === "basic" ? "basic " : ""}wage, as a ${reason === "resignation" ? "resignation" : "termination"}.`} />
          <DataTable
            head={["Years", "Days earned", `${currency} payable`]}
            rows={examples.map(({ y, r }) => [
              <Link key={y} href={`${b}/gratuity/${country}/${exampleSlug(wage, currency, y)}`}>
                {y} years
              </Link>,
              r ? fmt(r.days, 2) : "—",
              r ? <b key={`a${y}`}>{fmt(r.amount, 2)}</b> : "—",
            ])}
            caption={`${countryName} gratuity by length of service`}
            foot="Each row links to its own page with the full breakdown."
          />
        </>
      ) : (
        <Callout tone="warn" title="Why there is no calculation here">
          <p style={{ margin: 0 }}>
            Publishing a gratuity formula we could not confirm would be worse than publishing nothing: workers make financial decisions on
            these numbers. {countryName}&apos;s labour ministry or official portal is the authoritative source — and an employer&apos;s HR
            department or the labour office can compute the settlement.
          </p>
        </Callout>
      )}

      <SectionHead title="The rule in plain words" />
      <p className="gh-dek">
        {rule.confirmed
          ? rule.plain_english
          : `${countryName}'s end-of-service formula has not been verified for this page yet.`}{" "}
        {rule.notes ? <span style={{ color: "var(--faint)" }}>{rule.notes}</span> : null}
      </p>

      {rule.confirmed ? (
        <Faq
          items={[
            {
              q: `Is gratuity calculated on basic salary or total salary in ${countryName}?`,
              a:
                rule.wage_base === "basic"
                  ? `On the basic wage only — allowances such as housing and transport are excluded. That is why a ${currency} ${int(wage)} basic wage and a ${currency} ${int(wage)} total package can produce very different settlements.`
                  : `On the full wage, including the regular allowances you receive — not the basic alone. Use the monthly figure your payslip shows for wage plus regular allowances.`,
            },
            {
              q: "Does resigning reduce my gratuity?",
              a:
                rule.resignation_factors.length > 1
                  ? `In ${countryName}, yes — the share you receive depends on how long you served: ${rule.resignation_factors.map((r) => `${r.minYears}+ years: ${Math.round(r.factor * 100)}%`).join(", ")}. A termination pays 100%.`
                  : `In ${countryName}, no — the same formula applies whether you resign or the employer terminates the contract.`,
            },
            {
              q: "Does a fixed-term contract change the amount?",
              a: `The end-of-service formula applies to both limited and unlimited contracts in ${countryName}; what changes with a fixed-term contract is the notice and the early-termination compensation, not the gratuity rate.`,
            },
            {
              q: "Is gratuity paid on unused leave too?",
              a: `Unused annual leave is a separate entitlement and is paid out at the end of service in addition to gratuity. This calculator does not include it.`,
            },
            {
              q: "What if my service is part of a year?",
              a: `Partial years count proportionally. At ${fmt(years, 1)} years you have earned ${result ? fmt(result.days, 2) : "—"} days of wage.`,
            },
          ]}
        />
      ) : null}

      {rule.confirmed ? <SourceLine source={rule.article || `${countryName} Labour Law`} url={rule.source_url || "https://www.ilo.org"} updated="2026-11-14" note={<>Article numbers and figures are transcribed from the linked official text. Laws change — confirm with the labour ministry before relying on a settlement figure.</>} /> : null}

      <Callout tone="law" title="Not legal advice">
        <p style={{ margin: 0 }}>
          This calculator applies the statutory formula. Disputes often turn on what counts as wage, unpaid leave or an unlawful termination —
          for those, the labour office in {countryName} decides. Keep your contract and payslips.
        </p>
      </Callout>

      <Related
        title="Other countries"
        links={GULF_CURRENCIES.filter((g) => g.country !== country).map((g) => ({ label: `${g.short} gratuity`, href: `${b}/gratuity/${g.country}` }))}
      />
      <Related
        title="Other calculators"
        links={[
          { label: "Overtime pay", href: `${b}/overtime/${country}` },
          { label: "Annual leave", href: `${b}/annual-leave/${country}` },
          { label: "Notice period", href: `${b}/notice-period/${country}` },
          { label: "All calculators", href: `${b}/calculators` },
        ]}
      />
    </HubPage>
  );
}

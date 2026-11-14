import Link from "next/link";
import type { Site } from "@/lib/types";
import { HubPage, Crumbs, PageHead, StatRow, BigStat, DataTable, Faq, SourceLine, Related, Callout, SectionHead } from "./ui";
import { hourlyWage, overtimePay, tierDays, dailyWage, daysPay, type OvertimeRule, type LeaveRule, type NoticeRule } from "./leave";
import { GULF_CURRENCIES } from "./config";
import { fmt } from "./format";

/* One page component for the three simpler statutory calculators. The law is a
 * data record; the page shows the arithmetic for the reader's own numbers, then
 * the rule, the article and the source. */

export type CalcKind = "overtime" | "annual-leave" | "notice-period";

export type RuleCalcProps = {
  site: Site;
  kind: CalcKind;
  country: string;
  countryName: string;
  currency: string;
  rule: OvertimeRule | LeaveRule | NoticeRule | undefined;
  input: { wage: number; hours: number; years: number; days: number };
};

const META: Record<CalcKind, { title: string; verb: string; dek: string; path: string }> = {
  overtime: {
    title: "Overtime pay calculator",
    verb: "overtime",
    dek: "What an extra hour is worth: the hourly rate the labour law assumes, the statutory uplift, and the total for the hours you worked.",
    path: "overtime",
  },
  "annual-leave": {
    title: "Annual leave and leave pay calculator",
    verb: "leave",
    dek: "How many days of annual leave you have earned and what each day is worth if it is paid out.",
    path: "annual-leave",
  },
  "notice-period": {
    title: "Notice period calculator",
    verb: "notice",
    dek: "How much notice the law requires, and what pay in lieu of notice comes to on your wage.",
    path: "notice-period",
  },
};

export default function RuleCalcPage({ site, kind, country, countryName, currency, rule, input }: RuleCalcProps) {
  const b = `/s/${site.id}`;
  const m = META[kind];
  const confirmed = Boolean(rule?.confirmed);

  return (
    <HubPage site={site} active="tools">
      <Crumbs site={site} items={[{ label: "Calculators", href: `${b}/calculators` }, { label: m.title.replace(" calculator", "") }, { label: countryName }]} />
      <PageHead
        kicker={`${countryName} · ${m.title}`}
        title={`${m.title} — ${countryName}`}
        dek={confirmed ? m.dek : `We could not verify ${countryName}'s ${m.verb} rule against an official source, so this page will not guess at a number.`}
      />

      {confirmed ? (
        <form className="gh-form" method="get" action={`${b}/${m.path}/${country}`}>
          <div>
            <label htmlFor="wage">Monthly wage ({currency})</label>
            <input id="wage" name="wage" type="number" inputMode="decimal" min="0" step="50" defaultValue={input.wage} />
          </div>
          {kind === "overtime" ? (
            <div>
              <label htmlFor="hours">Overtime hours</label>
              <input id="hours" name="hours" type="number" inputMode="decimal" min="0" step="0.5" defaultValue={input.hours} />
            </div>
          ) : (
            <div>
              <label htmlFor="years">Years of service</label>
              <input id="years" name="years" type="number" inputMode="decimal" min="0" step="0.5" defaultValue={input.years} />
            </div>
          )}
          {kind === "annual-leave" ? (
            <div>
              <label htmlFor="days">Days to pay out (leave blank for the full entitlement)</label>
              <input id="days" name="days" type="number" inputMode="decimal" min="0" step="0.5" defaultValue={input.days} />
            </div>
          ) : null}
          <button type="submit">Calculate</button>
          <p className="gh-hint">Server-rendered: works with JavaScript off, and nothing you type is stored.</p>
        </form>
      ) : null}

      {confirmed && kind === "overtime" && rule ? (
        <OvertimeAnswer rule={rule as OvertimeRule} wage={input.wage} hours={input.hours} currency={currency} />
      ) : null}
      {confirmed && kind === "annual-leave" && rule ? (
        <LeaveAnswer rule={rule as LeaveRule} wage={input.wage} years={input.years} days={input.days} currency={currency} />
      ) : null}
      {confirmed && kind === "notice-period" && rule ? (
        <NoticeAnswer rule={rule as NoticeRule} wage={input.wage} years={input.years} currency={currency} />
      ) : null}

      {!confirmed ? (
        <Callout tone="warn" title="Why there is no calculation here">
          <p style={{ margin: 0 }}>
            Workers plan around these figures, so a number we could not verify against {countryName}&apos;s labour ministry would be worse than no
            number. The official portal linked from this country&apos;s gratuity page is the authoritative source.
          </p>
        </Callout>
      ) : null}

      {confirmed && rule ? (
        <>
          <SectionHead title="The rule this page applies" />
          <p className="gh-dek">
            {kind === "overtime"
              ? `Overtime is paid at the normal hourly wage plus ${(rule as OvertimeRule).uplift_percent ?? 0}%. The hourly wage is the monthly wage divided by ${(rule as OvertimeRule).hourly_divisor ?? 240} hours.`
              : kind === "annual-leave"
                ? `Annual leave accrues by length of service: ${(rule as LeaveRule).tiers.map((t) => `${t.minServiceYears}+ years → ${t.days} days`).join(", ")}. A day of leave is worth one thirtieth of the monthly wage.`
                : `Notice is ${(rule as NoticeRule).tiers.map((t) => `${t.minServiceYears}+ years → ${t.days} days`).join(", ")}. Pay in lieu is ${(rule as NoticeRule).payment_in_lieu ? "allowed by the law" : "not addressed by the law"}.`}
            {" "}
            <span style={{ color: "var(--faint)" }}>{rule.article}. {rule.notes}</span>
          </p>
          <SourceLine source={rule.article || `${countryName} Labour Law`} url={rule.source_url || "https://www.ilo.org"} updated="2026-11-14" note={<>Article and figures transcribed from the linked official text.</>} />
        </>
      ) : null}

      <Faq
        items={[
          {
            q: kind === "overtime" ? `How is overtime paid in ${countryName}?` : kind === "annual-leave" ? `How much annual leave do I get in ${countryName}?` : `What notice do I owe in ${countryName}?`,
            a: confirmed
              ? `${rule!.article}. ${kind === "overtime" ? `Normal-day overtime is paid at the hourly rate plus ${(rule as OvertimeRule).uplift_percent ?? 0}%.` : kind === "annual-leave" ? `Entitlement: ${(rule as LeaveRule).tiers.map((t) => `${t.days} days after ${t.minServiceYears} years`).join(", ")}.` : `Notice: ${(rule as NoticeRule).tiers.map((t) => `${t.days} days after ${t.minServiceYears} years`).join(", ")}.`}`
              : `The ${countryName} rule has not been verified on this page yet; the official portal is the authority.`,
          },
          {
            q: "Do weekends and public holidays count differently?",
            a: "Yes in most Gulf states — rest-day and public-holiday work usually carries a higher uplift than a normal weekday, and some laws give a compensatory day off instead of cash. The rule field on this page lists the normal-day rate; read the article for the holiday rate.",
          },
          {
            q: "Is this based on basic salary or total salary?",
            a: "It depends on the country and on what your contract calls 'wage' — each country page labels the basis its labour law uses. Use the monthly figure your payslip shows for that basis.",
          },
        ]}
      />

      <Related
        title="Other calculators"
        links={[
          { label: "Gratuity", href: `${b}/gratuity/${country}` },
          ...(kind !== "overtime" ? [{ label: "Overtime", href: `${b}/overtime/${country}` }] : []),
          ...(kind !== "annual-leave" ? [{ label: "Annual leave", href: `${b}/annual-leave/${country}` }] : []),
          ...(kind !== "notice-period" ? [{ label: "Notice period", href: `${b}/notice-period/${country}` }] : []),
          { label: "All calculators", href: `${b}/calculators` },
        ]}
      />
      <Related
        title="Other countries"
        links={GULF_CURRENCIES.filter((g) => g.country !== country).map((g) => ({ label: `${g.short} ${m.verb}`, href: `${b}/${m.path}/${g.country}` }))}
      />
    </HubPage>
  );
}

function OvertimeAnswer({ rule, wage, hours, currency }: { rule: OvertimeRule; wage: number; hours: number; currency: string }) {
  const hourly = hourlyWage(wage, rule.hourly_divisor);
  const pay = overtimePay(wage, hours, rule.uplift_percent, rule.hourly_divisor);
  return (
    <>
      <div className="gh-answer">
        <span>Overtime pay</span>
        <b>
          {currency} {fmt(pay, 2)}
        </b>
        <p>
          {fmt(hours, 1)} hours × {currency} {fmt(hourly, 2)}/hour × {(1 + (rule.uplift_percent ?? 0) / 100).toFixed(2)} ={" "}
          {currency} {fmt(pay, 2)}
        </p>
      </div>
      <StatRow>
        <BigStat label="Hourly wage" value={fmt(hourly, 2)} unit={currency} tone="navy" sub={`monthly ÷ ${rule.hourly_divisor ?? 240}`} />
        <BigStat label="Uplift" value={`+${rule.uplift_percent ?? 0}%`} tone="teal" sub="normal-day overtime" />
        <BigStat label="Per overtime hour" value={fmt(hourly * (1 + (rule.uplift_percent ?? 0) / 100), 2)} unit={currency} tone="gold" sub="what one extra hour pays" />
        <BigStat label="Hours entered" value={fmt(hours, 1)} tone="navy" sub="this calculation" />
      </StatRow>
    </>
  );
}

function LeaveAnswer({ rule, wage, years, days, currency }: { rule: LeaveRule; wage: number; years: number; days: number; currency: string }) {
  const entitlement = tierDays(rule.tiers, years);
  const perDay = dailyWage(wage);
  const payout = daysPay(wage, Math.min(days || entitlement || 0, 400));
  return (
    <>
      <div className="gh-answer">
        <span>{days ? `Pay for ${fmt(days, 1)} days of leave` : "Annual leave entitlement"}</span>
        <b>{days ? `${currency} ${fmt(payout, 2)}` : `${entitlement ?? "—"} days`}</b>
        <p>
          {entitlement != null ? `${entitlement} days a year at ${years} years of service. ` : ""}A day of leave is worth {currency} {fmt(perDay, 2)} (monthly ÷ 30); {fmt(days || entitlement || 0, 1)} days = {currency} {fmt(payout, 2)}.
        </p>
      </div>
      <StatRow>
        <BigStat label="Entitlement" value={`${entitlement ?? "—"}`} unit="days" tone="teal" sub={`after ${fmt(years, 1)} years`} />
        <BigStat label="Value per day" value={fmt(perDay, 2)} unit={currency} tone="navy" sub="monthly ÷ 30" />
        <BigStat label="Days paid" value={fmt(days || entitlement || 0, 1)} tone="navy" sub="this calculation" />
        <BigStat label="Payout" value={fmt(payout, 2)} unit={currency} tone="gold" sub="if encashed" />
      </StatRow>
    </>
  );
}

function NoticeAnswer({ rule, wage, years, currency }: { rule: NoticeRule; wage: number; years: number; currency: string }) {
  const days = tierDays(rule.tiers, years);
  const pay = daysPay(wage, days ?? 0);
  return (
    <>
      <div className="gh-answer">
        <span>Notice required</span>
        <b>{days == null ? "—" : `${days} days`}</b>
        <p>
          {days == null
            ? "No notice tier matches this length of service."
            : `At ${fmt(years, 1)} years of service the statutory notice is ${days} days. Pay in lieu, if the law allows it, is ${currency} ${fmt(pay, 2)} (${days} × ${currency} ${fmt(dailyWage(wage), 2)}).`}
        </p>
      </div>
      <StatRow>
        <BigStat label="Notice" value={days == null ? "—" : `${days}`} unit="days" tone="teal" sub={`after ${fmt(years, 1)} years`} />
        <BigStat label="Daily wage" value={fmt(dailyWage(wage), 2)} unit={currency} tone="navy" sub="monthly ÷ 30" />
        <BigStat label="Pay in lieu" value={fmt(pay, 2)} unit={currency} tone="gold" sub={rule.payment_in_lieu ? "allowed by law" : "law silent"} />
        <BigStat label="Garden leave" value="—" tone="navy" sub="check your contract" />
      </StatRow>
      <DataTable
        head={["Service", "Notice"]}
        rows={rule.tiers.map((t) => [`${t.minServiceYears}+ years`, `${t.days} days`])}
        caption="Notice by length of service"
      />
    </>
  );
}

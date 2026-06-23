import Link from "next/link";
import type { Site } from "@/lib/types";
import { type Country, type Job, type SalaryEstimate, eur } from "@/lib/walvi";

/* Shared presentational pieces for Walvi data-product pages (server components). */

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function PageHead({
  kicker,
  title,
  dek,
}: {
  kicker: string;
  title: string;
  dek?: string;
}) {
  return (
    <header className="page-head">
      <div className="article-cat">{kicker}</div>
      <h1 className="page-title">{title}</h1>
      {dek ? <p className="page-dek">{dek}</p> : null}
    </header>
  );
}

export function PageBanner({
  flag,
  kicker,
  title,
  dek,
  chips,
}: {
  flag?: string;
  kicker: string;
  title: string;
  dek?: string;
  chips?: string[];
}) {
  return (
    <header className="page-banner">
      <div className="pb-top">
        {flag ? (
          <span className="pb-flag" aria-hidden="true">
            {flag}
          </span>
        ) : null}
        <div>
          <div className="pb-kicker">{kicker}</div>
          <h1 className="pb-title">{title}</h1>
        </div>
      </div>
      {dek ? <p className="pb-dek">{dek}</p> : null}
      {chips && chips.length > 0 ? (
        <div className="pb-chips">
          {chips.map((c) => (
            <span className="pb-chip" key={c}>
              {c}
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
}

export function DataBand({ verified }: { verified: string }) {
  return (
    <div className="data-band">
      <span className="vb-tag">Estimates last reviewed</span>
      <span className="vb-date">{fmtDate(verified)}</span>
      <span className="vb-note">
        Indicative monthly figures in EUR · confirm pay &amp; visa rules with the official source.
      </span>
    </div>
  );
}

export function Crumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={it.name} style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
          {it.href ? <Link href={it.href}>{it.name}</Link> : <span className="here">{it.name}</span>}
          {i < items.length - 1 ? (
            <span className="sep" aria-hidden="true">
              /
            </span>
          ) : null}
        </span>
      ))}
    </nav>
  );
}

/** Country profile: one row per occupation. */
export function SalaryByJobTable({ site, rows }: { site: Site; rows: SalaryEstimate[] }) {
  const b = `/s/${site.id}`;
  return (
    <div className="dtable-wrap">
      <table className="dtable">
        <thead>
          <tr>
            <th>Occupation</th>
            <th className="num">Gross /mo</th>
            <th className="num">Net /mo</th>
            <th className="num">Savings (housed)</th>
            <th className="num">Savings (self-paid)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.job.id}>
              <td>
                <Link className="m-name" href={`${b}/jobs/${r.job.slug}`}>
                  <b>
                    <span className="rowflag" aria-hidden="true">
                      {r.job.icon}
                    </span>
                    {r.job.name}
                  </b>
                  <span className="m-vendor">{r.job.skillLevel} · demand {r.job.demand}</span>
                </Link>
              </td>
              <td className="num gross">{eur(r.grossEUR)}</td>
              <td className="num">{eur(r.netEUR)}</td>
              <td className="num save">{eur(r.savingsHousedEUR)}</td>
              <td className="num">{eur(r.savingsSelfEUR)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Job profile: one row per country. */
export function SalaryByCountryTable({ site, rows }: { site: Site; rows: SalaryEstimate[] }) {
  const b = `/s/${site.id}`;
  return (
    <div className="dtable-wrap">
      <table className="dtable">
        <thead>
          <tr>
            <th>Country</th>
            <th className="num">Gross /mo</th>
            <th className="num">Net /mo</th>
            <th className="num">Living cost</th>
            <th className="num">Savings (housed)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.country.id}>
              <td>
                <Link className="m-name" href={`${b}/countries/${r.country.slug}`}>
                  <b>
                    <span className="rowflag" aria-hidden="true">
                      {r.country.flag}
                    </span>
                    {r.country.name}
                  </b>
                  <span className="m-vendor">{r.country.inEU ? "EU · Schengen" : "Non-EU"}</span>
                </Link>
              </td>
              <td className="num gross">{eur(r.grossEUR)}</td>
              <td className="num">{eur(r.netEUR)}</td>
              <td className="num">{eur(r.livingEUR)}</td>
              <td className="num save">{eur(r.savingsHousedEUR)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FactGrid({ country }: { country: Country }) {
  const facts: ReadonlyArray<[string, string]> = [
    ["Currency", country.currency],
    ["EU / Schengen", country.inEU ? "Yes" : "No (non-EU)"],
    ["Main language", country.language],
    ["Permit type", country.permitType],
    ["Visa processing", `${country.visaWeeks[0]}–${country.visaWeeks[1]} weeks (typical)`],
    ["IELTS required", country.ieltsRequired ? "Often" : "Usually not"],
    ["Rent (shared)", `${eur(country.accommodationEUR)} /mo`],
    ["Food + transport", `${eur(country.foodEUR + country.otherEUR)} /mo`],
  ];
  return (
    <div className="facts">
      {facts.map(([k, v]) => (
        <div className="fact" key={k}>
          <div className="fk">{k}</div>
          <div className="fv">{v}</div>
        </div>
      ))}
    </div>
  );
}

export function CountryCard({ site, country, headline }: { site: Site; country: Country; headline: string }) {
  return (
    <Link className="tile" href={`/s/${site.id}/countries/${country.slug}`}>
      <div className="tile-top">
        <span className="tile-flag" aria-hidden="true">
          {country.flag}
        </span>
        <div>
          <div className="tile-name">{country.name}</div>
          <div className="tile-meta">{country.inEU ? "EU · Schengen" : "Non-EU"}</div>
        </div>
      </div>
      <p className="tile-blurb">{country.blurb}</p>
      <div className="tile-stat">
        <span className="lab">From</span>
        <b>{headline}</b>
      </div>
    </Link>
  );
}

export function JobCard({ site, job, headline }: { site: Site; job: Job; headline: string }) {
  return (
    <Link className="tile" href={`/s/${site.id}/jobs/${job.slug}`}>
      <div className="tile-top">
        <span className="tile-ico" aria-hidden="true">
          {job.icon}
        </span>
        <div>
          <div className="tile-name">{job.name}</div>
          <div className="tile-meta">
            {job.skillLevel} · <span className="demand-high">{job.demand} demand</span>
          </div>
        </div>
      </div>
      <p className="tile-blurb">{job.summary}</p>
      <div className="tile-stat">
        <span className="lab">Top savings</span>
        <b>{headline}</b>
      </div>
    </Link>
  );
}

export function Disclaimer() {
  return (
    <p className="disclaimer">
      <b>Indicative estimates, not a job offer.</b> Salary, cost and savings figures are modelled from
      each occupation&apos;s rough EU average and a per-country wage index, and exclude employer-specific
      terms, exchange-rate swings and personal tax. Visa rules are summarised for general guidance.
      Always confirm pay and immigration rules with the official source or embassy, and never pay a fee
      for a job offer you have not verified.
    </p>
  );
}

export function SourceNote({ country }: { country: Country }) {
  return (
    <p className="prose" style={{ fontSize: "0.92rem" }}>
      Official reference for {country.name}:{" "}
      <a className="source-link" href={country.officialSource} target="_blank" rel="noopener noreferrer">
        {new URL(country.officialSource).hostname.replace(/^www\./, "")} ↗
      </a>
    </p>
  );
}

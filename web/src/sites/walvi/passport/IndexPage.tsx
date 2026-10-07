import Link from "next/link";
import type { Site } from "@/lib/types";
import type { PassportRow } from "@/lib/passports";
import { fmtUpdated } from "@/lib/passports";
import { Masthead, Footer } from "../Chrome";
import { fontVars } from "../fonts";
import WorldMap from "../WorldMap";
import { CountUp } from "../Animated";
import PassportTable from "./PassportTable";

const SOUTH_ASIA = ["BD", "IN", "PK", "NP", "LK", "BT", "MV", "AF"];

/** Score → colour on a 6-step navy/teal ramp. */
export function scoreColor(score: number, max: number): string {
  const ramp = ["#f1e3c4", "#cfe6e2", "#8fcac2", "#3e9f97", "#14706b", "#0d2b4e"];
  return ramp[Math.min(ramp.length - 1, Math.floor((score / (max + 1)) * ramp.length))];
}

export const PI_FAQ = [
  {
    q: "What is the most powerful passport in the world?",
    a: (top: PassportRow) =>
      `In the VisaPoint Passport Index the ${top.name} passport ranks #1, giving visa-free, visa-on-arrival or eTA access to ${top.score} destinations.`,
  },
  {
    q: "How is the passport ranking calculated?",
    a: () =>
      "Each passport scores one point for every destination its holders can enter visa-free, with a visa on arrival or with an electronic travel authorisation (eTA). e-Visas and full visas do not add to the score. Passports with the same score share a rank.",
  },
  {
    q: "How strong is the Bangladesh passport?",
    a: (_top: PassportRow, bd?: PassportRow) =>
      bd
        ? `The Bangladesh passport ranks #${bd.rank} with ${bd.score} destinations: ${bd.free} visa-free, ${bd.voa} visa on arrival and ${bd.eta} eTA. ${bd.evisa} more offer an e-Visa.`
        : "See the Bangladesh passport page for its current rank and destinations.",
  },
  {
    q: "How often is the index updated?",
    a: () =>
      "The ranking is rebuilt automatically from publicly available visa-policy data every week. Entry rules change often — always confirm with the destination's embassy or official portal before you travel.",
  },
];

export default function PassportIndexPage({ site, rows, updatedAt }: { site: Site; rows: PassportRow[]; updatedAt: string }) {
  const b = `/s/${site.id}`;
  const top = rows.slice(0, 3);
  const max = rows[0]?.score || 1;
  const bd = rows.find((r) => r.iso2 === "BD");
  const sa = SOUTH_ASIA.map((i) => rows.find((r) => r.iso2 === i)).filter((r): r is PassportRow => !!r);
  const colors: Record<string, string> = {};
  const labels: Record<string, string> = {};
  for (const r of rows) {
    if (!r.numeric) continue;
    colors[r.numeric] = scoreColor(r.score, max);
    labels[r.numeric] = `#${r.rank} · ${r.score} destinations`;
  }

  return (
    <div className={fontVars}>
      <Masthead site={site} />
      <main>
        <section className="vp-pi-hero">
          <div className="vp-wrap">
            <nav className="vp-crumbs" aria-label="Breadcrumb">
              <Link href={b}>Home</Link>
              <span aria-hidden="true">›</span>
              <span>Passport Index</span>
            </nav>
            <span className="vp-eyebrow light">VisaPoint Passport Index {new Date(updatedAt || Date.now()).getFullYear()}</span>
            <h1>The world&apos;s passports, ranked by where they can take you.</h1>
            <p className="vp-lede light">
              {rows.length} passports scored on visa-free, visa-on-arrival and eTA access to {rows.length} destinations —
              rebuilt automatically every week. Updated {fmtUpdated(updatedAt)}.
            </p>
            <div className="vp-pi-stats">
              <div>
                <b>
                  <CountUp to={rows.length} />
                </b>
                <span>passports ranked</span>
              </div>
              <div>
                <b>
                  <CountUp to={max} />
                </b>
                <span>top score ({rows[0]?.name})</span>
              </div>
              {bd ? (
                <div>
                  <b>
                    #<CountUp to={bd.rank} />
                  </b>
                  <span>Bangladesh · {bd.score} destinations</span>
                </div>
              ) : null}
            </div>
            <div className="vp-hero-actions">
              <Link href={`${b}/visa-checker`} className="vp-btn vp-btn-primary">
                Check visa requirements
              </Link>
              {bd ? (
                <Link href={`${b}/passport/${bd.slug}`} className="vp-btn vp-btn-ghost">
                  Bangladesh passport
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="vp-sec">
          <div className="vp-wrap">
            <h2 className="vp-h2">Most powerful passports</h2>
            <ol className="vp-podium">
              {top.map((r, i) => (
                <li key={r.iso2} className={`p${i + 1}`}>
                  <Link href={`${b}/passport/${r.slug}`}>
                    <span className="vp-podium-rank">#{r.rank}</span>
                    <img className="vp-flag" src={`https://flagcdn.com/w160/${r.iso2.toLowerCase()}.png`} alt="" width={96} height={64} />
                    <b>{r.name}</b>
                    <span className="vp-podium-score">
                      <CountUp to={r.score} /> destinations
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="vp-sec vp-sec-alt">
          <div className="vp-wrap">
            <h2 className="vp-h2">Passport power around the world</h2>
            <p className="vp-sub">Darker = more destinations without a prior visa. Hover a country for its rank.</p>
            <WorldMap colors={colors} labels={labels} ariaLabel="World map of passport mobility scores" />
            <div className="vp-map-legend">
              <span>Fewer destinations</span>
              <i style={{ background: "linear-gradient(90deg,#f1e3c4,#cfe6e2,#8fcac2,#3e9f97,#14706b,#0d2b4e)" }} />
              <span>More destinations</span>
            </div>
          </div>
        </section>

        {sa.length ? (
          <section className="vp-sec">
            <div className="vp-wrap">
              <h2 className="vp-h2">South Asian passports</h2>
              <div className="vp-sa">
                {sa.map((r) => (
                  <Link key={r.iso2} href={`${b}/passport/${r.slug}`} className="vp-sa-card">
                    <img className="vp-flag" src={`https://flagcdn.com/w80/${r.iso2.toLowerCase()}.png`} alt="" width={42} height={28} />
                    <span>
                      <b>{r.name}</b>
                      <small>
                        Rank #{r.rank} · {r.score} destinations
                      </small>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="vp-sec vp-sec-alt" id="ranking">
          <div className="vp-wrap">
            <h2 className="vp-h2">Full passport ranking</h2>
            <PassportTable siteId={site.id} rows={rows} />
          </div>
        </section>

        <section className="vp-sec">
          <div className="vp-wrap vp-split">
            <div>
              <h2 className="vp-h2">Frequently asked questions</h2>
              <div className="vp-faq">
                {PI_FAQ.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{rows[0] ? f.a(rows[0], bd) : ""}</p>
                  </details>
                ))}
              </div>
            </div>
            <aside className="vp-panel" id="method">
              <h3 className="vp-panel-h">Methodology &amp; sources</h3>
              <p className="vp-panel-sub">
                Compiled by VisaPoint from publicly available online visa-policy sources and rebuilt weekly. Score = visa-free
                + visa on arrival + eTA destinations; equal scores share a rank.
              </p>
              <p className="vp-panel-sub">
                Entry rules change at short notice. Always confirm with the destination&apos;s embassy or official portal before
                travelling.
              </p>
              <p className="vp-credit">
                Underlying dataset: passport-index-dataset (I. Ilyankou), MIT License.
              </p>
            </aside>
          </div>
        </section>
      </main>
      <Footer site={site} />
    </div>
  );
}

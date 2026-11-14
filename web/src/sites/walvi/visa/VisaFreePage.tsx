import Link from "next/link";
import type { Site } from "@/lib/types";
import type { VisaCountry, DestinationByCategory, VisaRequirement, PassportRanking } from "@/lib/visa";
import { REQ_LABELS, REQ_SHORT, REQ_COLORS } from "@/lib/visa";
import { Masthead, Footer } from "../Chrome";
import { fontVars } from "../fonts";
import { CountUp } from "../Animated";

const CATEGORIES: VisaRequirement[] = ["visa_free", "visa_on_arrival", "eta", "e_visa", "visa_required", "no_admission"];

function CategorySection({
  category,
  destinations,
  siteId,
}: {
  category: VisaRequirement;
  destinations: DestinationByCategory[];
  siteId: string;
}) {
  if (!destinations.length) return null;
  const color = REQ_COLORS[category];
  const label = REQ_LABELS[category];
  const isAccessible = ["visa_free", "visa_on_arrival", "eta"].includes(category);

  return (
    <section className="vp-visa-category" id={category}>
      <header className="vp-visa-cat-head" style={{ borderLeftColor: color }}>
        <h2>{label}</h2>
        <span className="vp-count" style={{ background: color }}>
          {destinations.length}
        </span>
      </header>
      <div className="vp-visa-grid">
        {destinations.map((d) => (
          <Link
            key={d.destination}
            href={`/s/${siteId}/visa/${d.slug}`}
            className={`vp-visa-card${isAccessible ? " accessible" : ""}`}
          >
            <img
              className="vp-flag"
              src={`https://flagcdn.com/w80/${d.destination.toLowerCase()}.png`}
              alt=""
              width={40}
              height={27}
              loading="lazy"
            />
            <div>
              <span className="vp-visa-name">{d.name}</span>
              {d.days && <span className="vp-visa-days">{d.days} days</span>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function VisaFreeCountriesPage({
  site,
  country,
  grouped,
  score,
  rank,
  totalPassports,
  dataDate,
  neighbours,
}: {
  site: Site;
  country: VisaCountry;
  grouped: Record<VisaRequirement, DestinationByCategory[]>;
  score: number;
  rank: number | undefined;
  totalPassports: number;
  dataDate: string;
  neighbours: PassportRanking[];
}) {
  const b = `/s/${site.id}`;
  const totalDest = Object.values(grouped).flat().length;

  return (
    <div className={fontVars}>
      <Masthead site={site} />
      <main>
        <section className="vp-visa-hero">
          <div className="vp-wrap">
            <nav className="vp-crumbs" aria-label="Breadcrumb">
              <Link href={b}>Home</Link>
              <span aria-hidden="true">›</span>
              <Link href={`${b}/visa-checker`}>Visa Checker</Link>
              <span aria-hidden="true">›</span>
              <span>{country.name}</span>
            </nav>
            <div className="vp-visa-head">
              <img
                className="vp-flag vp-visa-flag"
                src={`https://flagcdn.com/w160/${country.iso2.toLowerCase()}.png`}
                alt={`${country.name} flag`}
                width={120}
                height={80}
              />
              <div>
                <span className="vp-eyebrow light">Visa-free countries {new Date().getFullYear()}</span>
                <h1>{country.name} passport</h1>
                <p className="vp-lede light">
                  Holders of a {country.name} passport can enter <b>{score}</b> destinations without a prior visa:{" "}
                  {grouped.visa_free.length} visa-free, {grouped.visa_on_arrival.length} visa on arrival,{" "}
                  {grouped.eta.length} eTA. {grouped.e_visa.length} more offer an e-Visa.
                </p>
              </div>
            </div>
            <div className="vp-pi-stats">
              {rank && (
                <div>
                  <b>
                    #<CountUp to={rank} />
                  </b>
                  <span>of {totalPassports} passports</span>
                </div>
              )}
              <div>
                <b>
                  <CountUp to={score} />
                </b>
                <span>mobility score</span>
              </div>
              <div>
                <b>
                  <CountUp to={totalDest} />
                </b>
                <span>destinations</span>
              </div>
            </div>
          </div>
        </section>

        <section className="vp-visa-main">
          <div className="vp-wrap vp-visa-layout">
            <div className="vp-visa-content">
              <nav className="vp-visa-toc">
                <span>Jump to:</span>
                {CATEGORIES.filter((c) => grouped[c].length > 0).map((c) => (
                  <a key={c} href={`#${c}`} style={{ color: REQ_COLORS[c] }}>
                    {REQ_SHORT[c]} ({grouped[c].length})
                  </a>
                ))}
              </nav>

              {CATEGORIES.map((c) => (
                <CategorySection key={c} category={c} destinations={grouped[c]} siteId={site.id} />
              ))}

              <div className="vp-alert small">
                <div className="vp-alert-head">
                  <span aria-hidden="true">!</span>
                  <h3>Requirements change — check before you travel</h3>
                </div>
                <p>
                  Entry rules change at short notice and depend on passport type, purpose and recent travel. Always
                  confirm with the destination country's embassy or official e-visa portal before booking. Data updated{" "}
                  {dataDate}.
                </p>
              </div>
            </div>

            <aside className="vp-visa-aside">
              <div className="vp-panel">
                <h3 className="vp-panel-h">Score breakdown</h3>
                <div className="vp-visa-bar">
                  {CATEGORIES.filter((c) => grouped[c].length > 0).map((c) => (
                    <div
                      key={c}
                      className="vp-visa-bar-seg"
                      style={{
                        width: `${(grouped[c].length / totalDest) * 100}%`,
                        background: REQ_COLORS[c],
                      }}
                      title={`${REQ_LABELS[c]}: ${grouped[c].length}`}
                    />
                  ))}
                </div>
                <ul className="vp-visa-legend">
                  {CATEGORIES.filter((c) => grouped[c].length > 0).map((c) => (
                    <li key={c}>
                      <span className="vp-dot" style={{ background: REQ_COLORS[c] }} />
                      {REQ_LABELS[c]}: {grouped[c].length}
                    </li>
                  ))}
                </ul>
              </div>

              {neighbours.length > 0 && (
                <div className="vp-panel">
                  <h3 className="vp-panel-h">Similar passports</h3>
                  <ul className="vp-mini-list">
                    {neighbours.map((n) => (
                      <li key={n.passport}>
                        <Link href={`${b}/visa-free-countries/${n.slug}`}>
                          <img
                            src={`https://flagcdn.com/w40/${n.passport.toLowerCase()}.png`}
                            alt=""
                            width={24}
                            height={16}
                            loading="lazy"
                          />
                          {n.name}
                          <span className="vp-score">#{n.rank} · {n.score}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link className="vp-more" href={`${b}/passport-ranking`}>
                    Full passport ranking →
                  </Link>
                </div>
              )}

              <div className="vp-panel" id="method">
                <h3 className="vp-panel-h">Source &amp; methodology</h3>
                <p className="vp-panel-sub">
                  Compiled by VisaPoint from publicly available visa-policy data and refreshed weekly. Score = visa-free
                  + visa on arrival + eTA destinations.
                </p>
                <p className="vp-credit">
                  Underlying dataset:{" "}
                  <a href="https://github.com/imorte/passport-index-data" target="_blank" rel="noopener">
                    passport-index-data
                  </a>{" "}
                  (MIT License).
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer site={site} />
    </div>
  );
}

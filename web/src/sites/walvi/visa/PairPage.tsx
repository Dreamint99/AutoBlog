import Link from "next/link";
import type { Site } from "@/lib/types";
import type { VisaCountry, VisaPair } from "@/lib/visa";
import { REQ_LABELS, REQ_COLORS } from "@/lib/visa";
import { Masthead, Footer } from "../Chrome";
import { fontVars } from "../fonts";
import { VC } from "../visacheck/data";

export default function VisaPairPage({
  site,
  passport,
  destination,
  pair,
  dataDate,
}: {
  site: Site;
  passport: VisaCountry;
  destination: VisaCountry;
  pair: VisaPair;
  dataDate: string;
}) {
  const b = `/s/${site.id}`;
  const reqLabel = REQ_LABELS[pair.requirement];
  const reqColor = REQ_COLORS[pair.requirement];
  const isAccessible = ["visa_free", "visa_on_arrival", "eta"].includes(pair.requirement);

  // Check if we have a visa check portal for this destination
  const vcEntry = VC.find((v) => v.iso2.toUpperCase() === destination.iso2.toUpperCase());

  return (
    <div className={fontVars}>
      <Masthead site={site} />
      <main>
        <section className="vp-visa-hero vp-visa-pair-hero">
          <div className="vp-wrap">
            <nav className="vp-crumbs" aria-label="Breadcrumb">
              <Link href={b}>Home</Link>
              <span aria-hidden="true">›</span>
              <Link href={`${b}/visa-checker`}>Visa Checker</Link>
              <span aria-hidden="true">›</span>
              <span>
                {passport.name} to {destination.name}
              </span>
            </nav>

            <div className="vp-pair-flags">
              <div className="vp-pair-from">
                <img
                  src={`https://flagcdn.com/w160/${passport.iso2.toLowerCase()}.png`}
                  alt={`${passport.name} flag`}
                  width={100}
                  height={67}
                />
                <span>{passport.name}</span>
              </div>
              <span className="vp-pair-arrow">→</span>
              <div className="vp-pair-to">
                <img
                  src={`https://flagcdn.com/w160/${destination.iso2.toLowerCase()}.png`}
                  alt={`${destination.name} flag`}
                  width={100}
                  height={67}
                />
                <span>{destination.name}</span>
              </div>
            </div>

            <h1>
              {passport.name} to {destination.name}: Visa Requirements
            </h1>

            <div className="vp-pair-result" style={{ borderColor: reqColor, background: `${reqColor}15` }}>
              <span className="vp-result-badge" style={{ background: reqColor }}>
                {reqLabel}
              </span>
              <p className="vp-result-text">
                {isAccessible ? (
                  <>
                    <strong>{passport.name}</strong> passport holders can enter{" "}
                    <strong>{destination.name}</strong> without a prior visa.
                    {pair.days && (
                      <>
                        {" "}
                        Stay allowed: <strong>{pair.days} days</strong>.
                      </>
                    )}
                  </>
                ) : pair.requirement === "e_visa" ? (
                  <>
                    <strong>{passport.name}</strong> passport holders need an <strong>e-Visa</strong> for{" "}
                    <strong>{destination.name}</strong>.
                    {pair.days && (
                      <>
                        {" "}
                        Duration: <strong>{pair.days} days</strong>.
                      </>
                    )}
                  </>
                ) : pair.requirement === "no_admission" ? (
                  <>
                    <strong>{passport.name}</strong> passport holders cannot currently enter{" "}
                    <strong>{destination.name}</strong>. Check with the embassy for exceptions.
                  </>
                ) : (
                  <>
                    <strong>{passport.name}</strong> passport holders need a <strong>visa</strong> for{" "}
                    <strong>{destination.name}</strong>. Apply at the embassy or consulate.
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="vp-visa-main vp-pair-main">
          <div className="vp-wrap vp-visa-layout">
            <div className="vp-visa-content">
              <div className="vp-pair-details">
                <h2>Requirement details</h2>
                <dl className="vp-details-list">
                  <div>
                    <dt>Passport</dt>
                    <dd>
                      <Link href={`${b}/visa-free-countries/${passport.slug}`}>{passport.name}</Link>
                    </dd>
                  </div>
                  <div>
                    <dt>Destination</dt>
                    <dd>{destination.name}</dd>
                  </div>
                  <div>
                    <dt>Requirement</dt>
                    <dd style={{ color: reqColor }}>{reqLabel}</dd>
                  </div>
                  {pair.days && (
                    <div>
                      <dt>Allowed stay</dt>
                      <dd>{pair.days} days</dd>
                    </div>
                  )}
                  <div>
                    <dt>Data updated</dt>
                    <dd>{dataDate}</dd>
                  </div>
                </dl>
              </div>

              {vcEntry && (
                <div className="vp-pair-portal">
                  <h2>Check visa status online</h2>
                  <p>
                    If you have applied for a {destination.name} visa, you can check its status on the official
                    government portal:
                  </p>
                  <p className="vp-portal-name">{vcEntry.portal}</p>
                  <div className="vp-pair-actions">
                    <a
                      className="vp-btn vp-btn-primary"
                      href={vcEntry.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      Check on official site ↗
                    </a>
                    <Link className="vp-btn vp-btn-outline" href={`${b}/visa-check/${vcEntry.slug}`}>
                      Step-by-step guide
                    </Link>
                  </div>
                </div>
              )}

              <div className="vp-alert">
                <div className="vp-alert-head">
                  <span aria-hidden="true">!</span>
                  <h3>Requirements change — confirm before travel</h3>
                </div>
                <p>
                  Entry rules change at short notice and depend on passport type, purpose of visit and recent travel
                  history. The information above is for general guidance only. Always confirm requirements with the{" "}
                  {destination.name} embassy or official visa portal before booking travel or applying for a visa.
                </p>
              </div>
            </div>

            <aside className="vp-visa-aside">
              <div className="vp-panel">
                <h3 className="vp-panel-h">More for {passport.name}</h3>
                <ul className="vp-link-list">
                  <li>
                    <Link href={`${b}/visa-free-countries/${passport.slug}`}>
                      All visa-free countries for {passport.name}
                    </Link>
                  </li>
                  <li>
                    <Link href={`${b}/passport-ranking`}>Passport power ranking</Link>
                  </li>
                </ul>
              </div>

              <div className="vp-panel">
                <h3 className="vp-panel-h">Popular destinations</h3>
                <ul className="vp-link-list">
                  {["AE", "SA", "GB", "US", "CA", "AU", "SG", "MY"]
                    .filter((d) => d !== destination.iso2 && d !== passport.iso2)
                    .slice(0, 5)
                    .map((d) => {
                      const name =
                        {
                          AE: "UAE",
                          SA: "Saudi Arabia",
                          GB: "United Kingdom",
                          US: "United States",
                          CA: "Canada",
                          AU: "Australia",
                          SG: "Singapore",
                          MY: "Malaysia",
                        }[d] || d;
                      const slug =
                        {
                          AE: "united-arab-emirates",
                          SA: "saudi-arabia",
                          GB: "united-kingdom",
                          US: "united-states",
                          CA: "canada",
                          AU: "australia",
                          SG: "singapore",
                          MY: "malaysia",
                        }[d] || d.toLowerCase();
                      return (
                        <li key={d}>
                          <Link href={`${b}/visa/${passport.slug}-to-${slug}`}>
                            {passport.name} to {name}
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </div>

              <div className="vp-panel" id="source">
                <h3 className="vp-panel-h">Source</h3>
                <p className="vp-panel-sub">
                  Data from{" "}
                  <a href="https://github.com/imorte/passport-index-data" target="_blank" rel="noopener">
                    passport-index-data
                  </a>{" "}
                  (MIT License). Updated {dataDate}.
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

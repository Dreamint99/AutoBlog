import Link from "next/link";
import type { Site } from "@/lib/types";
import type { PassportFull, PassportRow, Dest, Req } from "@/lib/passports";
import { reqOf, REQ_LABEL, fmtUpdated } from "@/lib/passports";
import { COUNTRIES } from "@/lib/walvi";
import { Masthead, Footer } from "../Chrome";
import { fontVars } from "../fonts";
import WorldMap from "../WorldMap";
import { CountUp } from "../Animated";

export const REQ_COLOR: Record<Req, string> = {
  F: "#1f9d55",
  A: "#3fb8a8",
  T: "#8fd3a6",
  E: "#e9a23b",
  V: "#c85a54",
  X: "#5b1f1f",
  S: "#0d2b4e",
};

const GROUPS: Req[] = ["F", "A", "T", "E", "V", "X"];

export function groupDestinations(p: PassportFull, dest: Dest[]) {
  const out: Record<Req, Array<Dest & { days: number | null }>> = { F: [], A: [], T: [], E: [], V: [], X: [], S: [] };
  p.codes.forEach((c, i) => {
    const d = dest[i];
    if (!d) return;
    const { req, days } = reqOf(c);
    out[req].push({ ...d, days });
  });
  for (const k of GROUPS) out[k].sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export default function PassportPage({
  site,
  p,
  dest,
  updatedAt,
  neighbours,
  total,
}: {
  site: Site;
  p: PassportFull;
  dest: Dest[];
  updatedAt: string;
  neighbours: PassportRow[];
  total: number;
}) {
  const b = `/s/${site.id}`;
  const groups = groupDestinations(p, dest);
  const colors: Record<string, string> = {};
  const labels: Record<string, string> = {};
  p.codes.forEach((c, i) => {
    const d = dest[i];
    if (!d?.numeric) return;
    const { req, days } = reqOf(c);
    colors[d.numeric] = REQ_COLOR[req];
    labels[d.numeric] = days ? `${REQ_LABEL[req]} · ${days} days` : REQ_LABEL[req];
  });
  const totalDest = dest.length - 1;
  const seg = (n: number) => `${(n / totalDest) * 100}%`;
  const euCodes = new Set(COUNTRIES.map((c) => c.name.toLowerCase()));
  const europeOpen = groups.F.concat(groups.A, groups.T).filter((d) => euCodes.has(d.name.toLowerCase()));

  return (
    <div className={fontVars}>
      <Masthead site={site} />
      <main>
        <section className="vp-pi-hero">
          <div className="vp-wrap">
            <nav className="vp-crumbs" aria-label="Breadcrumb">
              <Link href={b}>Home</Link>
              <span aria-hidden="true">›</span>
              <Link href={`${b}/passport-index`}>Passport Index</Link>
              <span aria-hidden="true">›</span>
              <span>{p.name}</span>
            </nav>
            <div className="vp-pp-head">
              <img className="vp-flag vp-pp-flag" src={`https://flagcdn.com/w160/${p.iso2.toLowerCase()}.png`} alt={`${p.name} flag`} width={120} height={80} />
              <div>
                <span className="vp-eyebrow light">Passport ranking {new Date(updatedAt || Date.now()).getFullYear()}</span>
                <h1>{p.name} passport</h1>
                <p className="vp-lede light">
                  Holders of a {p.name} passport can enter <b>{p.score}</b> destinations without a prior visa — {p.free} visa-free,{" "}
                  {p.voa} with a visa on arrival and {p.eta} with an eTA. {p.evisa} more offer an e-Visa.
                </p>
              </div>
            </div>
            <div className="vp-pi-stats">
              <div>
                <b>
                  #<CountUp to={p.rank} />
                </b>
                <span>of {total} passports</span>
              </div>
              <div>
                <b>
                  <CountUp to={p.score} />
                </b>
                <span>mobility score</span>
              </div>
              <div>
                <b>
                  <CountUp to={p.free} />
                </b>
                <span>visa-free</span>
              </div>
              <div>
                <b>
                  <CountUp to={p.required} />
                </b>
                <span>visa required</span>
              </div>
            </div>
            <div className="vp-pp-stack" aria-label="Share of destinations by requirement">
              {GROUPS.map((g) =>
                groups[g].length ? (
                  <i key={g} style={{ width: seg(groups[g].length), background: REQ_COLOR[g] }} title={`${REQ_LABEL[g]}: ${groups[g].length}`} />
                ) : null,
              )}
            </div>
            <div className="vp-pp-keys">
              {GROUPS.map((g) => (
                <span key={g}>
                  <i style={{ background: REQ_COLOR[g] }} /> {REQ_LABEL[g]} <b>{groups[g].length}</b>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="vp-sec vp-sec-alt">
          <div className="vp-wrap">
            <h2 className="vp-h2">Where the {p.name} passport can go</h2>
            <WorldMap colors={colors} labels={labels} highlight={p.numeric || undefined} ariaLabel={`Visa requirements map for ${p.name} passport holders`} />
          </div>
        </section>

        <section className="vp-sec">
          <div className="vp-wrap vp-split">
            <div>
              {GROUPS.filter((g) => groups[g].length).map((g) => (
                <section key={g} className="vp-pp-group">
                  <h2 className="vp-pp-gh">
                    <i style={{ background: REQ_COLOR[g] }} />
                    {REQ_LABEL[g]} <span>({groups[g].length})</span>
                  </h2>
                  <ul className="vp-pp-list">
                    {groups[g].map((d) => (
                      <li key={d.iso2}>
                        <Link href={`${b}/visa-checker?from=${p.iso2.toLowerCase()}&to=${d.iso2.toLowerCase()}`}>
                          <img className="vp-flag" src={`https://flagcdn.com/w40/${d.iso2.toLowerCase()}.png`} alt="" width={22} height={15} loading="lazy" />
                          {d.name}
                          {d.days ? <small>{d.days} days</small> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <aside>
              {europeOpen.length ? (
                <div className="vp-panel">
                  <h3 className="vp-panel-h">Europe without a prior visa</h3>
                  <p className="vp-panel-sub">Tourist entry only — working always needs a work permit.</p>
                  <ul className="vp-links">
                    {europeOpen.map((d) => (
                      <li key={d.iso2}>{d.name}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="vp-panel">
                  <h3 className="vp-panel-h">Working in Europe</h3>
                  <p className="vp-panel-sub">
                    {p.name} passport holders need a visa for Europe. To work there you need an employer-sponsored work permit —
                    see the country register for each route.
                  </p>
                  <Link className="vp-btn vp-btn-primary vp-btn-block" href={`${b}/countries`}>
                    Work-permit routes by country
                  </Link>
                </div>
              )}
              <div className="vp-panel">
                <h3 className="vp-panel-h">Nearby in the ranking</h3>
                <ul className="vp-links">
                  {neighbours.map((n) => (
                    <li key={n.iso2}>
                      <Link href={`${b}/passport/${n.slug}`}>
                        #{n.rank} {n.name} — {n.score}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link className="vp-more" href={`${b}/passport-index`}>
                  Full passport ranking →
                </Link>
              </div>
              <div className="vp-alert small">
                <div className="vp-alert-head">
                  <span aria-hidden="true">!</span>
                  <h2>Check before you travel</h2>
                </div>
                <p>
                  Rules change at short notice and depend on passport type and purpose. Confirm with the destination embassy.
                  Data updated {fmtUpdated(updatedAt)}.
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

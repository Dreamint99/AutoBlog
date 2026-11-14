import Link from "next/link";
import type { Site } from "@/lib/types";
import type { PassportRanking } from "@/lib/visa";
import { Masthead, Footer } from "../Chrome";
import { fontVars } from "../fonts";
import { CountUp } from "../Animated";

const SOUTH_ASIA = ["BD", "IN", "PK", "NP", "LK", "BT", "MV", "AF"];

export const RANKING_FAQ = [
  {
    q: "What is the most powerful passport in the world?",
    a: (top: PassportRanking) =>
      `In the VisaPoint Passport Power Ranking, the ${top.name} passport ranks #1, giving visa-free, visa-on-arrival or eTA access to ${top.score} destinations.`,
  },
  {
    q: "How is the passport power ranking calculated?",
    a: () =>
      "Each passport scores one point for every destination its holders can enter visa-free, with a visa on arrival or with an electronic travel authorisation (eTA). e-Visas and full visas do not add to the score. Passports with the same score share a rank.",
  },
  {
    q: "How strong is the Bangladesh passport?",
    a: (_top: PassportRanking, bd?: PassportRanking) =>
      bd
        ? `The Bangladesh passport ranks #${bd.rank} with ${bd.score} destinations: ${bd.visa_free} visa-free, ${bd.voa} visa on arrival and ${bd.eta} eTA. ${bd.evisa} more offer an e-Visa.`
        : "See the Bangladesh passport page for its current rank and destinations.",
  },
  {
    q: "How often is the ranking updated?",
    a: () =>
      "The ranking is rebuilt automatically from publicly available visa-policy data every week. Entry rules change often — always confirm with the destination's embassy or official portal before you travel.",
  },
];

function scoreColor(score: number, max: number): string {
  const ramp = ["#f1e3c4", "#cfe6e2", "#8fcac2", "#3e9f97", "#14706b", "#0d2b4e"];
  return ramp[Math.min(ramp.length - 1, Math.floor((score / (max + 1)) * ramp.length))];
}

export default function PassportRankingPage({
  site,
  ranking,
  dataDate,
}: {
  site: Site;
  ranking: PassportRanking[];
  dataDate: string;
}) {
  const b = `/s/${site.id}`;
  const top = ranking.slice(0, 3);
  const max = ranking[0]?.score || 1;
  const bd = ranking.find((r) => r.passport === "BD");
  const sa = SOUTH_ASIA.map((i) => ranking.find((r) => r.passport === i)).filter((r): r is PassportRanking => !!r);

  return (
    <div className={fontVars}>
      <Masthead site={site} />
      <main>
        <section className="vp-pi-hero">
          <div className="vp-wrap">
            <nav className="vp-crumbs" aria-label="Breadcrumb">
              <Link href={b}>Home</Link>
              <span aria-hidden="true">›</span>
              <span>Passport Ranking</span>
            </nav>
            <span className="vp-eyebrow light">Passport Power Ranking {new Date().getFullYear()}</span>
            <h1>The world&apos;s passports, ranked by travel freedom.</h1>
            <p className="vp-lede light">
              {ranking.length} passports scored on visa-free, visa-on-arrival and eTA access —
              rebuilt automatically every week. Updated {dataDate}.
            </p>
            <div className="vp-pi-stats">
              <div>
                <b>
                  <CountUp to={ranking.length} />
                </b>
                <span>passports ranked</span>
              </div>
              <div>
                <b>
                  <CountUp to={max} />
                </b>
                <span>max score</span>
              </div>
              <div>
                <b>
                  <CountUp to={ranking.filter((r) => r.score >= 100).length} />
                </b>
                <span>score 100+</span>
              </div>
            </div>
          </div>
        </section>

        <section className="vp-pi-main">
          <div className="vp-wrap vp-pi-layout">
            <div className="vp-pi-content">
              {/* Top 3 Podium */}
              <div className="vp-pi-podium">
                {top.map((r, i) => (
                  <Link key={r.passport} href={`${b}/visa-free-countries/${r.slug}`} className={`vp-podium-item rank-${i + 1}`}>
                    <span className="vp-podium-rank">#{r.rank}</span>
                    <img
                      src={`https://flagcdn.com/w160/${r.passport.toLowerCase()}.png`}
                      alt=""
                      width={80}
                      height={53}
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                    <span className="vp-podium-name">{r.name}</span>
                    <span className="vp-podium-score">{r.score} destinations</span>
                  </Link>
                ))}
              </div>

              {/* Full Table */}
              <table className="vp-pi-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Passport</th>
                    <th>Score</th>
                    <th className="hide-mobile">Visa-free</th>
                    <th className="hide-mobile">VOA</th>
                    <th className="hide-mobile">eTA</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r) => (
                    <tr key={r.passport}>
                      <td className="vp-rank">{r.rank}</td>
                      <td>
                        <Link href={`${b}/visa-free-countries/${r.slug}`} className="vp-pp-link">
                          <img
                            src={`https://flagcdn.com/w40/${r.passport.toLowerCase()}.png`}
                            alt=""
                            width={24}
                            height={16}
                            loading="lazy"
                          />
                          {r.name}
                        </Link>
                      </td>
                      <td>
                        <span className="vp-score-bar" style={{ background: scoreColor(r.score, max), width: `${(r.score / max) * 100}%` }}>
                          {r.score}
                        </span>
                      </td>
                      <td className="hide-mobile">{r.visa_free}</td>
                      <td className="hide-mobile">{r.voa}</td>
                      <td className="hide-mobile">{r.eta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="vp-pi-aside">
              {sa.length > 0 && (
                <div className="vp-panel">
                  <h3 className="vp-panel-h">South Asia</h3>
                  <ul className="vp-mini-list">
                    {sa.map((r) => (
                      <li key={r.passport}>
                        <Link href={`${b}/visa-free-countries/${r.slug}`}>
                          <img
                            src={`https://flagcdn.com/w40/${r.passport.toLowerCase()}.png`}
                            alt=""
                            width={24}
                            height={16}
                            loading="lazy"
                          />
                          {r.name}
                          <span className="vp-score">#{r.rank} · {r.score}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="vp-panel">
                <h3 className="vp-panel-h">Embed this ranking</h3>
                <p className="vp-panel-sub">
                  Copy this code to embed the passport power chart on your website.
                </p>
                <pre className="vp-embed-code">{`<iframe src="https://visapoint.net/embed/passport-ranking" title="Passport Power Ranking" width="100%" height="500" loading="lazy" style="border:0"></iframe>`}</pre>
              </div>

              <div className="vp-panel" id="faq">
                <h3 className="vp-panel-h">Questions</h3>
                <div className="vp-faq">
                  {RANKING_FAQ.map((f) => (
                    <details key={f.q}>
                      <summary>{f.q}</summary>
                      <p>{f.a(ranking[0], bd)}</p>
                    </details>
                  ))}
                </div>
              </div>

              <div className="vp-panel" id="method">
                <h3 className="vp-panel-h">Methodology &amp; sources</h3>
                <p className="vp-panel-sub">
                  Compiled by VisaPoint from publicly available visa-policy data and rebuilt weekly.
                  Score = visa-free + visa on arrival + eTA destinations; equal scores share a rank.
                </p>
                <p className="vp-panel-sub">
                  Entry rules change at short notice. Always confirm with the destination&apos;s embassy
                  or official portal before travelling.
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

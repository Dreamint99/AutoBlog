import Link from "next/link";
import type { Site, Article } from "@/lib/types";
import { Shell, Card } from "./Chrome";
import type { NmComp } from "./comps";
import { ago } from "./comps";
import { RegionFixtures } from "./LiveScores";
import { SAFF_FINALS, SAFF_TEAMS, SAFF_FAQ, saffTitles, flag } from "./saff";

/* FIFA-tournament-style hub for the SAFF Championship: hero with key numbers,
   honours, every final, member nations, live South Asia fixtures, the latest
   guides and an FAQ (mirrored in FAQPage JSON-LD by the route). */

const CODE: Record<string, string> = Object.fromEntries(SAFF_TEAMS.map((t) => [t.name, t.code]));
CODE.Afghanistan = "af";
CODE.Kuwait = "kw";

function Flag({ team, w = 40 }: { team: string; w?: number }) {
  const c = CODE[team];
  return c ? <img className="nm-flag" src={flag(c, w <= 40 ? 40 : 80)} alt={`${team} flag`} width={w} height={Math.round(w * 0.66)} loading="lazy" /> : null;
}

export default function SaffHub({ site, comp, articles }: { site: Site; comp: NmComp; articles: Article[] }) {
  const s = `/s/${site.id}`;
  const titles = saffTitles();
  const latest = SAFF_FINALS[0];
  const [lead, ...rest] = articles;
  const maxT = titles[0]?.titles || 1;

  return (
    <Shell site={site}>
      <section className="nm-saff-hero">
        <div className="nm-wrap">
          <nav className="nm-crumbs nm-saff-crumbs" aria-label="Breadcrumb">
            <Link href={s}>Home</Link>
            <span>/</span>
            <Link href={`${s}/topic/football`}>Football</Link>
            <span>/</span>
            <span>SAFF Championship</span>
          </nav>
          <span className="nm-saff-eyebrow">South Asian Football Federation · Since 1993</span>
          <h1>
            SAFF <em>Championship</em>
          </h1>
          <p>
            Fixtures, results, every final, the winners list and how to watch South Asia&apos;s national-team championship —
            Bangladesh, India, Nepal, Maldives, Pakistan, Sri Lanka and Bhutan.
          </p>
          <div className="nm-saff-stats">
            <div>
              <b>{SAFF_FINALS.length}</b>
              <span>Editions</span>
            </div>
            <div>
              <b>{SAFF_TEAMS.length}</b>
              <span>Member nations</span>
            </div>
            <div>
              <b>{titles[0]?.titles}</b>
              <span>Titles · {titles[0]?.team}</span>
            </div>
            <div>
              <b>{latest.year}</b>
              <span>Last champion · {latest.champion}</span>
            </div>
          </div>
          <nav className="nm-saff-tabs" aria-label="On this page">
            <a href="#champions">Champions</a>
            <a href="#finals">All finals</a>
            <a href="#teams">Teams</a>
            <a href="#fixtures">Fixtures</a>
            <a href="#guides">Guides</a>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
      </section>

      <div className="nm-wrap nm-saff-grid">
        <div className="nm-saff-main">
          {/* Reigning champion */}
          <section className="nm-saff-champ" id="champions">
            <div className="nm-saff-champ-card">
              <span className="nm-saff-label">Reigning champions</span>
              <div className="nm-saff-champ-row">
                <Flag team={latest.champion} w={80} />
                <div>
                  <h2>{latest.champion}</h2>
                  <p>
                    Beat {latest.runnerUp} {latest.score} in the {latest.year} final in {latest.venue}.
                  </p>
                </div>
              </div>
            </div>
            <div className="nm-saff-honours">
              <h2 className="nm-saff-h">Roll of honour</h2>
              <ol>
                {titles.map((t) => (
                  <li key={t.team}>
                    <Flag team={t.team} />
                    <span className="nm-saff-team">{t.team}</span>
                    <span className="nm-saff-bar">
                      <i style={{ width: `${(t.titles / maxT) * 100}%` }} />
                    </span>
                    <b>{t.titles}</b>
                    <small>{t.years.join(", ")}</small>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Every final */}
          <section id="finals" className="nm-saff-sec">
            <h2 className="nm-saff-h">SAFF Championship winners list — every final</h2>
            <div className="nm-saff-table">
              <table>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Champion</th>
                    <th>Score</th>
                    <th>Runner-up</th>
                    <th>Host</th>
                  </tr>
                </thead>
                <tbody>
                  {SAFF_FINALS.map((f) => (
                    <tr key={f.year}>
                      <td><b>{f.year}</b></td>
                      <td className="win">
                        <Flag team={f.champion} w={24} /> {f.champion}
                      </td>
                      <td className="sc">{f.score}</td>
                      <td>
                        <Flag team={f.runnerUp} w={24} /> {f.runnerUp}
                      </td>
                      <td className="host">{f.venue}, {f.host}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Member nations */}
          <section id="teams" className="nm-saff-sec">
            <h2 className="nm-saff-h">The teams</h2>
            <div className="nm-saff-teams">
              {SAFF_TEAMS.map((t) => {
                const won = titles.find((x) => x.team === t.name);
                return (
                  <div className="nm-saff-teamcard" key={t.code}>
                    <img src={flag(t.code, 160)} alt={`${t.name} flag`} width={96} height={64} loading="lazy" />
                    <h3>{t.name}</h3>
                    <span>{t.nickname}</span>
                    <small>{won ? `${won.titles} title${won.titles > 1 ? "s" : ""}` : "Chasing a first title"} · {t.fed}</small>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Guides */}
          <section id="guides" className="nm-saff-sec">
            <div className="nm-rowhead">
              <h2>
                <span className="nm-rowchip" style={{ background: comp.color }}>SAFF</span>
                Latest SAFF guides
              </h2>
              <span className="nm-time">{articles.length} guides</span>
            </div>
            {lead ? (
              <>
                <Link href={`${s}/${lead.slug}`} className="nm-saff-lead">
                  {lead.image_url ? <img src={lead.image_url} alt="" /> : <span className="nm-thumb-ph" />}
                  <span className="nm-hero-shade" />
                  <span className="nm-saff-lead-copy">
                    <span className="nm-hero-kicker" style={{ background: comp.color }}>SAFF Championship</span>
                    <b>{lead.title}</b>
                    <small>{ago(lead.created_at)} · {lead.reading_time} min read</small>
                  </span>
                </Link>
                <div className="nm-grid3">
                  {rest.slice(0, 9).map((a) => (
                    <Card site={site} article={a} dek key={a.id} />
                  ))}
                </div>
              </>
            ) : (
              <div className="nm-empty">
                <h2>SAFF guides are on the way</h2>
              </div>
            )}
          </section>

          {/* FAQ */}
          <section id="faq" className="nm-saff-sec">
            <h2 className="nm-saff-h">SAFF Championship FAQ</h2>
            <div className="nm-saff-faq">
              {SAFF_FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside className="nm-rail2" id="fixtures">
          <RegionFixtures teams={SAFF_TEAMS.map((t) => t.name)} title="South Asia — live & upcoming" />
          <section className="nm-box">
            <h3 className="nm-box-h">Quick facts</h3>
            <dl className="nm-saff-facts">
              <dt>Organiser</dt>
              <dd>South Asian Football Federation (SAFF)</dd>
              <dt>First edition</dt>
              <dd>1993, Lahore (as the SAARC Gold Cup)</dd>
              <dt>Most titles</dt>
              <dd>{titles[0]?.team} ({titles[0]?.titles})</dd>
              <dt>Top scorer (all-time)</dt>
              <dd>Sunil Chhetri, India</dd>
              <dt>Bangladesh&apos;s title</dt>
              <dd>2003, Dhaka</dd>
            </dl>
          </section>
          <section className="nm-box">
            <h3 className="nm-box-h">Live scores</h3>
            <p className="nm-saff-note">Every match from the Premier League to the AFC qualifiers, updated every 30 seconds.</p>
            <Link href={`${s}/scores`} className="nm-btn">Open live scores →</Link>
          </section>
        </aside>
      </div>
    </Shell>
  );
}

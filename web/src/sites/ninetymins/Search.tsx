import Link from "next/link";
import type { Article, Site } from "@/lib/types";
import { Shell, Card } from "./Chrome";
import { NM_LEAGUES, leagueToSlug } from "./live";
import { sitePrefix } from "@/lib/public-path";

/* /search on ninetymins: competitions whose name matches + stories (noindex page). */
export default function Search({ site, q, results }: { site: Site; q: string; results: Article[] }) {
  const s = sitePrefix(site.id);
  const ql = q.toLowerCase();
  const comps = ql.length >= 2 ? Object.entries(NM_LEAGUES).filter(([, v]) => v.label.toLowerCase().includes(ql)).slice(0, 8) : [];
  return (
    <Shell site={site}>
      <div className="nm-wrap nv-pagehead">
        <h1>{q ? `Results for “${q}”` : "Search"}</h1>
        <p>{q ? `${results.length + comps.length} result${results.length + comps.length === 1 ? "" : "s"}` : "Teams, competitions and stories."}</p>
      </div>
      <div className="nm-wrap nv-search">
        <form action={`${s}/search`} role="search" className="nv-searchbox">
          <input name="q" type="search" defaultValue={q} placeholder="e.g. Premier League, Arsenal, SAFF" aria-label="Search" autoFocus={!q} />
          <button type="submit">Search</button>
        </form>
        {comps.length ? (
          <ul className="nv-tiles nv-tiles-sm">
            {comps.map(([k, v]) => (
              <li key={k}>
                <Link href={k === "cricket" ? `${s}/cricket` : `${s}/league/${leagueToSlug(k)}`}>
                  <b>{v.label}</b>
                  <small>Scores &amp; table</small>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {results.length ? (
          <div className="nv-grid4">
            {results.map((a) => (
              <Card site={site} article={a} key={a.id} />
            ))}
          </div>
        ) : q && !comps.length ? (
          <p className="nv-empty">Nothing found. Try a competition or team name.</p>
        ) : null}
      </div>
    </Shell>
  );
}

import "./theme.css";
import { fontVars } from "./fonts";
import type { Article, Site } from "@/lib/types";
import { CnHeader, SiteFooter, StatCard, IconSearch, IconCompass } from "./Home";

export default function Search({
  site,
  q,
  results,
}: {
  site: Site;
  q: string;
  results: Article[];
}) {
  return (
    <div className={`cn-root ${fontVars}`}>
      <CnHeader site={site} />

      <section className="cn-section">
        <div className="cn-wrap">
          <div className="cn-sec-head">
            <div>
              <span className="cn-sec-kicker">Search</span>
              <h1>{q ? `Results for “${q}”` : "Search the data"}</h1>
              {q ? <p>{results.length} report(s) found.</p> : <p>Find a statistic, company, country or ranking.</p>}
            </div>
          </div>

          <form className="cn-search cn-search-page" action={`/s/${site.id}/search`} method="get" role="search">
            <IconSearch />
            <input
              className="cn-search-input"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search a statistic, company or country…"
              aria-label="Search"
            />
            <button className="cn-search-btn" type="submit">
              Search
            </button>
          </form>

          {q && results.length === 0 ? (
            <div className="cn-emptywrap">
              <span className="cn-empty-ico">
                <IconCompass />
              </span>
              <h3>No results for “{q}”</h3>
              <p>Try a broader term — a country, company, “richest”, “Top 10”, crypto or a topic.</p>
            </div>
          ) : (
            <div className="cn-grid">
              {results.map((a, i) => (
                <StatCard key={a.id} siteId={site.id} article={a} index={i + 1} />
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}

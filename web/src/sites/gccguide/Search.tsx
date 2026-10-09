import Link from "next/link";
import type { Article, Site } from "@/lib/types";
import { GcShell } from "./Chrome";
import { countryOf, topicOf, flag } from "./data";

export default function Search({ site, q, results }: { site: Site; q: string; results: Article[] }) {
  const b = `/s/${site.id}`;
  return (
    <GcShell site={site} active="search">
      <div className="gc-wrap">
        <section className="gc-sec">
          <div className="gc-head">
            <h2>{q ? `Results for “${q}”` : "Search GCCGuide"}</h2>
            <p>{q ? `${results.length} guide(s) found.` : "Visas, driving, jobs, laws and more across the GCC."}</p>
          </div>
          <form className="gc-hsearch" action={`${b}/search`} role="search" style={{ margin: "0 0 24px", maxWidth: 720 }}>
            <span aria-hidden="true">⌕</span>
            <input name="q" type="search" defaultValue={q} placeholder="e.g. Qatar visa status" aria-label="Search" />
            <button type="submit">Search</button>
          </form>
          {results.length ? (
            <ul className="gc-list">
              {results.map((a) => {
                const c = countryOf(a);
                return (
                  <li key={a.id}>
                    <Link href={`${b}/${a.slug}`}>
                      <b>
                        {c ? <img src={flag(c.iso, 40)} alt="" width={18} height={12} style={{ marginRight: 8, verticalAlign: "middle", borderRadius: 2 }} /> : null}
                        {a.title}
                      </b>
                      <span>{topicOf(a).icon}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : q ? (
            <p className="gc-empty">No guide yet for this — new GCC guides publish every day. Try a country page from the bar above.</p>
          ) : null}
        </section>
      </div>
    </GcShell>
  );
}

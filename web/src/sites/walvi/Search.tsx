import Link from "next/link";
import type { Article, Site } from "@/lib/types";
import { WalviShell } from "./Chrome";

/* VisaPoint search results (header search box). */
export default function Search({ site, q, results }: { site: Site; q: string; results: Article[] }) {
  const b = `/s/${site.id}`;
  return (
    <WalviShell site={site}>
      <section className="vp-sec">
        <div className="vp-wrap">
          <h1 className="vp-h2">{q ? `Results for “${q}”` : "Search VisaPoint"}</h1>
          <form className="vp-hsearch" action={`${b}/search`} role="search" style={{ display: "flex", maxWidth: 560, marginBottom: 24 }}>
            <input name="q" type="search" defaultValue={q} placeholder="Search visas, countries, jobs…" aria-label="Search VisaPoint" />
            <button type="submit" aria-label="Search">
              ⌕
            </button>
          </form>
          {results.length ? (
            <ul className="vp-guides">
              {results.map((a) => (
                <li className="vp-guide" key={a.id} style={{ gridTemplateColumns: "1fr" }}>
                  <div>
                    <h3>
                      <Link href={`${b}/${a.slug}`}>{a.title}</Link>
                    </h3>
                    {a.excerpt ? <p>{a.excerpt}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : q ? (
            <p className="vp-sub">
              No guide matches yet. Try the <Link href={`${b}/visa-checker`}>visa checker</Link>, the{" "}
              <Link href={`${b}/passport-index`}>Passport Index</Link> or the <Link href={`${b}/countries`}>country register</Link>.
            </p>
          ) : null}
        </div>
      </section>
    </WalviShell>
  );
}

import Link from "next/link";
import type { Site } from "@/lib/types";
import { HL_SPORTS, cleanTitle, duration, hlPath, type Highlight } from "./highlights";
import { ago } from "./comps";
import { publicPath } from "@/lib/public-path";

export function HlCard({ site, h }: { site: Site; h: Highlight }) {
  return (
    <article className="hl-card">
      <Link href={publicPath(site.id, hlPath(h))} className="hl-thumb" aria-label={cleanTitle(h.title)}>
        <img src={h.thumb.replace("maxresdefault", "mqdefault")} alt="" loading="lazy" decoding="async" />
        <span className="hl-dur">{duration(h.dur)}</span>
      </Link>
      <div className="hl-body">
        <span className="hl-sport">{h.sport}</span>
        <h3>
          <Link href={publicPath(site.id, hlPath(h))}>{cleanTitle(h.title)}</Link>
        </h3>
        <span className="hl-meta">
          {h.channel} · {ago(h.date)}
        </span>
      </div>
    </article>
  );
}

export function HlGrid({ site, items }: { site: Site; items: Highlight[] }) {
  return (
    <div className="hl-grid">
      {items.map((h) => (
        <HlCard key={h.id} site={site} h={h} />
      ))}
    </div>
  );
}

/** /highlights and /highlights/<sport> share this body. */
export default function HighlightsList({ site, sport, items, page, pages, total }: { site: Site; sport: string; items: Highlight[]; page: number; pages: number; total: number }) {
  const label = HL_SPORTS.find(([k]) => k === sport)?.[1] || "All";
  const base = publicPath(site.id, `/highlights${sport ? `/${sport}` : ""}`);
  return (
    <div className="lv-page">
      <div className="nm-wrap">
        <div className="lv-top">
          <h1>
            {sport ? `${label} highlights` : "Highlights"} <span>· official videos · {total.toLocaleString("en")}</span>
          </h1>
        </div>
        <p className="hl-lede">
          Goals, wickets, dunks and match recaps from the official channels of leagues, boards and broadcasters — added automatically within minutes of upload. Tap to play here.
        </p>
        <nav className="lv-sports" aria-label="Sport">
          {HL_SPORTS.map(([k, l]) => (
            <Link key={k || "all"} href={publicPath(site.id, `/highlights${k ? `/${k}` : ""}`)} className={k === sport ? "on" : ""}>
              {l}
            </Link>
          ))}
        </nav>
        {items.length ? <HlGrid site={site} items={items} /> : <p className="hl-lede">No videos yet — check back soon.</p>}
        {pages > 1 ? (
          <nav className="hl-pages" aria-label="Pages">
            {page > 1 ? <Link href={page === 2 ? base : `${base}?page=${page - 1}`} rel="prev">← Newer</Link> : <span />}
            <span>
              Page {page} of {pages}
            </span>
            {page < pages ? <Link href={`${base}?page=${page + 1}`} rel="next">Older →</Link> : <span />}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

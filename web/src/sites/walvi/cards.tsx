import Link from "next/link";
import type { Article, Site } from "@/lib/types";
import { countryOf, topicOf, fmtDate, flagUrl } from "./guide-meta";
import { publicPath } from "@/lib/public-path";

/* Uniform guide cards with drawn "art" instead of feature photos: the stored
   feature images are AI renders, title cards or dead links, so every card gets a
   calm tinted panel with the destination flag (or a topic glyph). Six tints,
   picked from the slug so neighbouring cards differ. */

const TINTS = ["t1", "t2", "t3", "t4", "t5", "t6"] as const;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const GLYPH: Record<string, string> = {
  Salaries: "M4 7h16v10H4zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM7 12h.01M17 12h.01",
  "Cost of living": "M4 11l8-6 8 6v8H4zM10 19v-5h4v5",
  "Scam alert": "M12 3l9 16H3zM12 10v4M12 17h.01",
  "Work permit": "M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4",
  Jobs: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
  Guide: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0c2.5 2.5 2.5 15.5 0 18m0-18c-2.5 2.5-2.5 15.5 0 18M3 12h18",
};

export function CardArt({ a, big = false }: { a: Article; big?: boolean }) {
  const c = countryOf(a);
  const topic = topicOf(a);
  const tint = TINTS[hash(a.slug) % TINTS.length];
  const flag = flagUrl(c?.flag, 160);
  return (
    <div className={`vx-art ${tint}${big ? " big" : ""}`} aria-hidden="true">
      <svg className="vx-art-grid" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="250" cy="90" r="120" />
          <ellipse cx="250" cy="90" rx="52" ry="120" />
          <path d="M130 90h240M140 40h220M140 140h220" />
        </g>
      </svg>
      {flag ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="vx-art-flag" src={flag} alt="" width={96} height={64} loading="lazy" />
      ) : (
        <svg className="vx-art-ic" viewBox="0 0 24 24">
          <path d={GLYPH[topic] || GLYPH.Guide} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {c ? <span className="vx-art-tag">{c.name}</span> : null}
    </div>
  );
}

export function GuideCard({ site, a, headingLevel = 3 }: { site: Site; a: Article; headingLevel?: 2 | 3 }) {
  const c = countryOf(a);
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="vx-card">
      <Link href={publicPath(site.id, `/${a.slug}`)} className="vx-card-link" tabIndex={-1} aria-hidden="true">
        <CardArt a={a} />
      </Link>
      <div className="vx-card-body">
        <span className="vx-kicker">
          {topicOf(a)}
          {c ? ` · ${c.name}` : ""}
        </span>
        <H>
          <Link href={publicPath(site.id, `/${a.slug}`)}>{a.title}</Link>
        </H>
        <span className="vx-meta">
          {fmtDate(a.created_at)}
          {a.reading_time ? ` · ${a.reading_time} min read` : ""}
        </span>
      </div>
    </article>
  );
}

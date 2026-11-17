import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { defaultOgImages } from "@/lib/og";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import Insights from "@/sites/ninetymins/Insights";
import { getH2H, parsePair, pairSlug, type FormGame, type H2H } from "@/sites/ninetymins/h2h";
import { publicPath } from "@/lib/public-path";
import { teamLogo } from "@/sites/ninetymins/media";
import { Crest } from "@/sites/ninetymins/TeamBadges";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; pair: string }> };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const kick = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
const pts = (g: FormGame[]) => g.reduce((s, x) => s + (x.result === "W" ? 3 : x.result === "D" ? 1 : 0), 0);

function leader(h: H2H): string {
  const { a, b, draw } = h.record, n = a + b + draw;
  if (!n) return "";
  if (a === b) return `${h.a.name} and ${h.b.name} are level: ${a} wins each${draw ? ` and ${draw} draw${draw > 1 ? "s" : ""}` : ""} in the last ${n} recorded meetings.`;
  const [w, wn, l, ln] = a > b ? [h.a.name, a, h.b.name, b] : [h.b.name, b, h.a.name, a];
  return `${w} lead the recent head-to-head ${wn}–${ln}${draw ? ` with ${draw} draw${draw > 1 ? "s" : ""}` : ""} over ${l} (last ${n} recorded meetings).`;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { site: sid, pair } = await params;
  const site = getSite(sid);
  if (!site || site.id !== "ninetymins") return {};
  const h = await getH2H(pair);
  if (!h) return { robots: { index: false } };
  const what = h.sport === "football" && h.next ? "Head to Head, Prediction & Stats" : "Head to Head, Record & Stats";
  const title = `${h.a.name} vs ${h.b.name}: ${what}${h.next ? ` — ${day(h.next.starts)}` : ""} | ${site.name}`;
  const description = `${h.a.name} vs ${h.b.name} head to head: ${h.summary || leader(h) || "past meetings, recent form"}${h.next ? ` Next: ${day(h.next.starts)}, ${h.next.ev.leagueName}.` : ""} Form guide, results and where to watch.`;
  return {
    title,
    description: description.slice(0, 300),
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/h2h/${h.slug}` },
    robots: h.indexable ? undefined : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title, description, url: `/h2h/${h.slug}` },
  };
}

function Form({ name, games }: { name: string; games: FormGame[] }) {
  return (
    <section className="mx-box">
      <h2 className="mx-h">{name} form</h2>
      {games.length ? (
        <>
          <div className="h2-chips" aria-label={`Last ${games.length}: ${games.map((g) => g.result || "–").join(" ")}`}>
            {games.map((g, i) => (
              <span key={i} className={`h2-chip r-${(g.result || "x").toLowerCase()}`}>{g.result || "–"}</span>
            ))}
          </div>
          <ul className="h2-form">
            {games.map((g, i) => (
              <li key={i}>
                <time dateTime={g.date}>{day(g.date)}</time>
                <span>{g.at === "away" ? "at " : "vs "}{g.path ? <Link href={g.path}>{g.opp}</Link> : g.opp}</span>
                <b>{g.score}</b>
              </li>
            ))}
          </ul>
          <p className="mx-note">{pts(games)} points from the last {games.length} (3 for a win, 1 for a draw).</p>
        </>
      ) : (
        <p>No recent results on record.</p>
      )}
    </section>
  );
}

export default async function Page({ params }: P) {
  const { site: sid, pair } = await params;
  const site = getSite(sid);
  if (!site || site.id !== "ninetymins") notFound();
  const p = parsePair(pair);
  if (p && pair !== pairSlug(p[0], p[1])) permanentRedirect(`/h2h/${pairSlug(p[0], p[1])}`);
  const h = await getH2H(pair);
  if (!h) notFound();
  const base = siteBaseUrl(site);
  const url = `${base}/h2h/${h.slug}`;
  const n = h.next, l = h.last;
  const insightsLeague = n ? n.key.split(":")[1] : "";
  const nat = (slug: string) => { const f = h.fixtures[0]; return f ? (f.home_slug === slug ? f.ev.home.national : f.ev.away.national) : false; };
  const [logoA, logoB] = await Promise.all([teamLogo(h.a.slug, h.a.name, nat(h.a.slug), "small"), teamLogo(h.b.slug, h.b.name, nat(h.b.slug), "small")]);
  const logoOf = (slug: string) => (slug === h.a.slug ? logoA : slug === h.b.slug ? logoB : "");

  const faq = [
    n ? { q: `When is the next ${h.a.name} vs ${h.b.name} match?`, a: `${n.ev.home.name} vs ${n.ev.away.name} is on ${kick(n.starts)} in the ${n.ev.leagueName}${n.ev.venue ? ` at ${n.ev.venue}` : ""}.` } : null,
    h.meetings.length ? { q: `Who has won more ${h.a.name} vs ${h.b.name} matches?`, a: h.summary ? `${h.summary} (source: ESPN). ${leader(h)}` : leader(h) } : null,
    l ? { q: `What was the result the last time ${h.a.name} played ${h.b.name}?`, a: `${l.ev.home.name} ${l.ev.home.score}–${l.ev.away.score} ${l.ev.away.name} on ${day(l.starts)} (${l.ev.leagueName}).` } : null,
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <Shell site={site}>
      <JsonLd
        data={[
          breadcrumbSchema([{ name: site.name, url: `${base}/` }, { name: "Head to head", url: `${base}/h2h/${h.slug}` }, { name: `${h.a.name} vs ${h.b.name}`, url }]),
          ...(n ? [{
            "@context": "https://schema.org", "@type": "SportsEvent", name: `${n.ev.home.name} vs ${n.ev.away.name}`, startDate: n.starts, url: `${base}${n.path}`,
            eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            sport: h.sport === "football" ? "Soccer" : h.sport, superEvent: { "@type": "SportsEvent", name: n.ev.leagueName },
            homeTeam: { "@type": "SportsTeam", name: n.ev.home.name, url: `${base}/team/${n.home_slug}`, ...(logoOf(n.home_slug) ? { logo: logoOf(n.home_slug) } : {}) },
            awayTeam: { "@type": "SportsTeam", name: n.ev.away.name, url: `${base}/team/${n.away_slug}`, ...(logoOf(n.away_slug) ? { logo: logoOf(n.away_slug) } : {}) },
            ...(n.ev.venue ? { location: { "@type": "Place", name: n.ev.venue } } : {}),
          }] : []),
          ...(faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
        ]}
      />
      <div className="lv-page">
        <div className="nm-wrap">
          <nav className="nm-crumbs" aria-label="Breadcrumb">
            <Link href={publicPath(site.id, `/team/${h.a.slug}`)}>{h.a.name}</Link> <span>/</span> <Link href={publicPath(site.id, `/team/${h.b.slug}`)}>{h.b.name}</Link>
          </nav>
          <h1 className="hl-title">
            {h.a.name} vs {h.b.name}: head to head
          </h1>
          <section className="h2-hero" style={{ ["--h" as string]: h.a.color || "#0a7a35", ["--a" as string]: h.b.color || "#b8430a" }}>
            <div className="h2-side">
              <Link href={publicPath(site.id, `/team/${h.a.slug}`)} aria-label={`${h.a.name} team page`}><Crest url={logoA} name={h.a.name} size={56} color={h.a.color} eager /></Link>
              <b>{h.record.a}</b>
              <span>{h.a.name} wins</span>
            </div>
            <div className="h2-side h2-mid">
              <b>{h.record.draw}</b>
              <span>draws</span>
            </div>
            <div className="h2-side">
              <Link href={publicPath(site.id, `/team/${h.b.slug}`)} aria-label={`${h.b.name} team page`}><Crest url={logoB} name={h.b.name} size={56} color={h.b.color} eager /></Link>
              <b>{h.record.b}</b>
              <span>{h.b.name} wins</span>
            </div>
          </section>
          <p className="hl-lede">
            {h.summary ? <>{h.summary} (ESPN). </> : null}
            {leader(h) || `No finished meeting between ${h.a.name} and ${h.b.name} is on record yet — recent form is below.`}
          </p>
        </div>
        <div className="nm-wrap mx-wrap">
          {n ? (
            <section className="mx-box mx-wide">
              <h2 className="mx-h">{n.state === "in" ? "Live now" : "Next match"}</h2>
              <Link href={n.path} className="hl-score">
                <span>{n.ev.home.name}</span>
                <b>{n.state === "in" ? `${n.ev.home.score} – ${n.ev.away.score}` : "vs"}</b>
                <span>{n.ev.away.name}</span>
              </Link>
              <p>
                {n.ev.leagueName} · <time dateTime={n.starts}>{kick(n.starts)}</time>
                {n.ev.venue ? ` · ${n.ev.venue}` : ""}. <Link href={n.path}>Match centre, line-ups and where to watch →</Link>
              </p>
            </section>
          ) : null}
          {n && h.sport === "football" && n.state === "pre" ? (
            <Insights url={`https://api.ninetymins.com/v1/insights/football/${insightsLeague}/${n.ev.id}`} initial={null} />
          ) : null}
          <Form name={h.a.name} games={h.formA} />
          <Form name={h.b.name} games={h.formB} />
          {h.meetings.length ? (
            <section className="mx-box mx-wide">
              <h2 className="mx-h">Past meetings</h2>
              <table className="mx-table">
                <thead>
                  <tr><th>Date</th><th>Match</th><th>Score</th></tr>
                </thead>
                <tbody>
                  {h.meetings.map((m, i) => (
                    <tr key={i}>
                      <td>{day(m.date)}</td>
                      <td>{m.path ? <Link href={m.path}>{m.home} vs {m.away}</Link> : `${m.home} vs ${m.away}`}{m.comp ? <small className="h2-comp"> · {m.comp}</small> : null}</td>
                      <td><b>{m.hs}–{m.as}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
          {faq.length ? (
            <section className="mx-box mx-wide">
              <h2 className="mx-h">Quick answers</h2>
              {faq.map((f) => (
                <div key={f.q} className="h2-faq">
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </section>
          ) : null}
          <p className="mx-note mx-wide">
            Data: ESPN and NinetyMins match records. Win probability is a model estimate from recent form, not a tip.{" "}
            <Link href={publicPath(site.id, `/team/${h.a.slug}`)}>{h.a.name} fixtures</Link> · <Link href={publicPath(site.id, `/team/${h.b.slug}`)}>{h.b.name} fixtures</Link>
          </p>
        </div>
      </div>
    </Shell>
  );
}

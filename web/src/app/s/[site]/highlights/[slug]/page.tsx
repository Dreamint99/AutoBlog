import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { defaultOgImages } from "@/lib/og";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Shell } from "@/sites/ninetymins/Chrome";
import HighlightsList, { HlGrid } from "@/sites/ninetymins/HighlightsList";
import { YouTube } from "@/sites/ninetymins/Video";
import { fixtures } from "@/sites/ninetymins/engine";
import { publicPath } from "@/lib/public-path";
import {
  HL_SPORTS, cleanTitle, countHighlights, duration, getHighlight, hlPath, hlSlug, idFromSlug, isoDuration, listHighlights, relatedHighlights,
} from "@/sites/ninetymins/highlights";

export const dynamic = "force-dynamic";
const PER = 48;

type P = { params: Promise<{ site: string; slug: string }>; searchParams: Promise<{ page?: string }> };
const sportOf = (slug: string) => HL_SPORTS.find(([k]) => k && k === slug)?.[0] || null;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const { site: id, slug } = await params;
  const site = getSite(id);
  if (!site || site.id !== "ninetymins") return {};
  const base = new URL(siteBaseUrl(site));
  const sport = sportOf(slug);
  if (sport) {
    const label = HL_SPORTS.find(([k]) => k === sport)![1];
    const page = Math.max(1, Number((await searchParams).page) || 1);
    const title = `${label} Highlights Today — Official Videos & Match Recaps | ${site.name}`;
    const description = `Latest ${label.toLowerCase()} highlights from official channels: every goal, key moment and full recap, added minutes after upload.`;
    return { title: page > 1 ? `${title} — page ${page}` : title, description, metadataBase: base, alternates: { canonical: `/highlights/${sport}${page > 1 ? `?page=${page}` : ""}` }, openGraph: { images: defaultOgImages(), title, description, url: `/highlights/${sport}` } };
  }
  const h = await getHighlight(idFromSlug(slug));
  if (!h) return { title: `Highlights | ${site.name}`, robots: { index: false } };
  const t = cleanTitle(h.title);
  const title = `${t.length > 70 ? t.slice(0, 68) + "…" : t} — Video | ${site.name}`;
  const description = `Watch the official ${h.sport} highlights: ${t}. From ${h.channel}, ${fmtDate(h.date)} · ${duration(h.dur)}.`;
  return {
    title,
    description,
    metadataBase: base,
    alternates: { canonical: hlPath(h) },
    openGraph: { title: t, description, type: "video.other", url: hlPath(h), images: [{ url: h.thumb, width: 1280, height: 720 }], videos: [{ url: `https://www.youtube.com/embed/${h.id}` }] },
    twitter: { card: "player", title: t, description, images: [h.thumb] },
  };
}

export default async function Page({ params, searchParams }: P) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  if (!site || site.id !== "ninetymins") notFound();
  const base = siteBaseUrl(site);

  const sport = sportOf(slug);
  if (sport) {
    const label = HL_SPORTS.find(([k]) => k === sport)![1];
    const page = Math.max(1, Number((await searchParams).page) || 1);
    const [items, total] = await Promise.all([listHighlights(sport, PER, (page - 1) * PER), countHighlights(sport)]);
    return (
      <Shell site={site}>
        <JsonLd data={breadcrumbSchema([{ name: site.name, url: `${base}/` }, { name: "Highlights", url: `${base}/highlights` }, { name: `${label} highlights`, url: `${base}/highlights/${sport}` }])} />
        <HighlightsList site={site} sport={sport} items={items} page={page} pages={Math.max(1, Math.ceil(total / PER))} total={total} />
      </Shell>
    );
  }

  const h = await getHighlight(idFromSlug(slug));
  if (!h) notFound();
  if (slug !== hlSlug(h)) permanentRedirect(hlPath(h));

  const fx = h.match ? (await fixtures("key=?", [`${h.match.sport}:${h.match.league}:${h.match.id}`], 1))[0] || null : null;
  const related = await relatedHighlights(h, 8);
  const t = cleanTitle(h.title);
  const e = fx?.ev;
  const url = `${base}${hlPath(h)}`;

  const video = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: t,
    description: `Official ${h.sport} highlights published by ${h.channel}.`,
    thumbnailUrl: [h.thumb, `https://i.ytimg.com/vi/${h.id}/hqdefault.jpg`],
    uploadDate: h.date,
    duration: isoDuration(h.dur),
    embedUrl: `https://www.youtube.com/embed/${h.id}`,
    url,
    ...(h.blocked.length || h.allowed.length ? { regionsAllowed: h.allowed.length ? h.allowed.join(",") : undefined } : {}),
    author: { "@type": "Organization", name: h.channel },
  };

  return (
    <Shell site={site}>
      <JsonLd data={[video, breadcrumbSchema([{ name: site.name, url: `${base}/` }, { name: "Highlights", url: `${base}/highlights` }, { name: t, url }])]} />
      <div className="lv-page">
        <div className="nm-wrap hl-watch">
          <nav className="nm-crumbs" aria-label="Breadcrumb">
            <Link href={publicPath(site.id, "/highlights")}>Highlights</Link> <span>/</span>{" "}
            <Link href={publicPath(site.id, `/highlights/${HL_SPORTS.some(([k]) => k === h.sport) ? h.sport : ""}`)}>{h.sport}</Link>
          </nav>
          <h1 className="hl-title">{t}</h1>
          <YouTube id={h.id} title={t} thumb={h.thumb} />
          <p className="hl-facts">
            <b>{h.channel}</b> · {fmtDate(h.date)} · {duration(h.dur)}
            {h.blocked.length ? <> · not available in {h.blocked.length > 6 ? `${h.blocked.length} countries` : h.blocked.join(", ")}</> : null}
            {h.allowed.length ? <> · available in {h.allowed.length > 6 ? `${h.allowed.length} countries` : h.allowed.join(", ")} only</> : null}
          </p>
          {e && fx ? (
            <section className="hl-match">
              <span className="hl-sport">{e.leagueName}</span>
              <Link href={publicPath(site.id, fx.path)} className="hl-score">
                <span>{e.home.name}</span>
                <b>{e.state === "pre" ? "vs" : `${e.home.score} – ${e.away.score}`}</b>
                <span>{e.away.name}</span>
              </Link>
              <p>
                {e.state === "post" ? `Full time${e.detail ? ` (${e.detail})` : ""}.` : e.state === "in" ? "Live now." : `Kick-off ${fmtDate(e.date)}.`}{" "}
                <Link href={publicPath(site.id, fx.path)}>Match centre: line-ups, stats and timeline →</Link>
              </p>
              <p className="hl-links">
                <Link href={publicPath(site.id, `/team/${fx.home_slug}`)}>{e.home.name} fixtures</Link> · <Link href={publicPath(site.id, `/team/${fx.away_slug}`)}>{e.away.name} fixtures</Link> · <Link href={publicPath(site.id, `/league/${fx.league}`)}>{e.leagueName}</Link>
              </p>
            </section>
          ) : null}
          <p className="hl-note">Played from the official {h.channel} YouTube channel. NinetyMins only shows official uploads.</p>
          {related.length ? (
            <>
              <h2 className="hl-h2">More {h.sport} highlights</h2>
              <HlGrid site={site} items={related} />
            </>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}

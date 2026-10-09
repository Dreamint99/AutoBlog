import Link from "next/link";
import type { Article, Site } from "@/lib/types";
import { GcShell } from "./Chrome";
import { TOPICS, topicOf, flag, type Country } from "./data";
import { CityPulse } from "./Widgets";

export default function CountryPage({ site, c, articles }: { site: Site; c: Country; articles: Article[] }) {
  const b = `/s/${site.id}`;
  return (
    <GcShell site={site} active="countries">
      <section className="gc-chero" style={{ ["--ca" as string]: c.accent }}>
        <div className="gc-wrap gc-chero-in">
          <nav className="gc-crumbs" aria-label="Breadcrumb">
            <Link href={b}>Home</Link>
            <span>›</span>
            <span>{c.name}</span>
          </nav>
          <div className="gc-chero-title">
            <img src={flag(c.iso, 160)} alt="" width={84} height={56} />
            <div>
              <h1>{c.name} guide</h1>
              <p>{c.tagline} — visas, jobs, driving, laws, money and things to do.</p>
            </div>
          </div>
          <div className="gc-facts">
            {[
              ["Capital", c.capital],
              ["Currency", `${c.code}${c.pegged ? ` · ${c.perUsd}/US$` : ""}`],
              ["Time", c.utc],
              ["Weekend", c.weekend],
              ["Emergency", c.emergency],
              ["Calling code", c.calling],
              ["Driving", c.drive],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="gc-wrap">
        <section className="gc-sec gc-cgrid">
          <div>
            <div className="gc-card">
              <div className="gc-card-h">
                <span>🏛️</span>
                <b>Official portals</b>
              </div>
              <ul className="gc-portals">
                {c.portals.map((p) => (
                  <li key={p.url}>
                    <a href={p.url} target="_blank" rel="noopener nofollow">
                      {p.label}
                      <small>{p.url.replace(/^https?:\/\//, "")}</small>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="gc-note">Always apply and pay only on official portals. GCCGuide is independent and never charges for visas.</p>
            </div>
          </div>
          <CityPulse initial={c.slug} />
        </section>
        {TOPICS.map((t) => {
          const list = articles.filter((a) => topicOf(a).key === t.key);
          return (
            <section className="gc-sec" key={t.key} id={t.key}>
              <div className="gc-head row">
                <h2>
                  {t.icon} {t.label}
                </h2>
                <p>{t.blurb}</p>
              </div>
              {list.length ? (
                <ul className="gc-list">
                  {list.slice(0, 8).map((a) => (
                    <li key={a.id}>
                      <Link href={`${b}/${a.slug}`}>
                        <b>{a.title}</b>
                        <span>{a.reading_time} min</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="gc-empty">
                  {c.name} {t.label.toLowerCase()} guides are being written — new ones publish every day.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </GcShell>
  );
}

import Link from "next/link";
import type { SiteHomeProps } from "@/lib/types";
import { GcShell, GuideCard, Icon } from "./Chrome";
import { COUNTRIES, TOPICS, topicOf, flag } from "./data";
import { getFxSnapshot, crossRate, getGold } from "@/lib/gcc";
import { buildFuelView } from "./hub/fuel";
import { GRAMS_PER_OZ } from "./hub/config";
import { fmt, dateLong } from "./hub/format";
import { sitePrefix } from "@/lib/public-path";

/* GCCGuide home (v2): answer-first. Hero with search + today's key numbers,
   the six country hubs, live-data tools, latest guides as uniform cards and a
   compact "by topic" link block. No client widgets on the home page. */

const GULF = ["QAR", "AED", "SAR"] as const;
const HOME = ["BDT", "INR", "PKR"] as const;

const TOOLS: { icon: string; title: string; text: string; path: string }[] = [
  { icon: "rates", title: "Exchange rates", text: "Gulf currencies to INR, PKR, BDT, PHP", path: "rates" },
  { icon: "report", title: "Remittance report", text: "Monthly rate review, 6 × 11 corridors", path: "reports/remittance" },
  { icon: "gold", title: "Gold rate today", text: "24K–18K per gram, 14 cities", path: "gold-rate" },
  { icon: "fuel", title: "Petrol prices", text: "Official monthly prices", path: "fuel-price" },
  { icon: "calc", title: "Gratuity calculators", text: "End-of-service, overtime, leave", path: "calculators" },
  { icon: "prayer", title: "Prayer times", text: "385 cities, monthly tables", path: "prayer-times" },
  { icon: "embassy", title: "Embassies", text: "76 missions, phones & sites", path: "embassy" },
  { icon: "visa", title: "Visa fees", text: "Official fee tables", path: "visa-fees" },
];

export default async function Home({ site, articles }: SiteHomeProps) {
  const b = sitePrefix(site.id);
  const real = articles.filter((a) => !a.is_mock);
  const [snap, gold] = await Promise.all([getFxSnapshot(), getGold()]);
  const aed = snap.byCode.AED?.rate ?? 3.6725;
  const g24 = (gold.usdPerOz / GRAMS_PER_OZ) * aed;
  const fuel = buildFuelView("uae");
  const p95 = fuel?.rows.find((r) => /95/.test(r.grade)) ?? fuel?.rows[0];
  const p91 = fuel?.rows.find((r) => /91/.test(r.grade));
  const updated = snap.updated.slice(0, 10);

  return (
    <GcShell site={site} active="home">
      <section className="gv-hero">
        <div className="gv-wrap gv-hero-in">
          <div className="gv-hero-copy">
            <span className="gv-eyebrow">Qatar · UAE · Saudi Arabia · Kuwait · Oman · Bahrain</span>
            <h1>Everything GCC, in one place.</h1>
            <p className="gv-lede">Visas, jobs, driving and daily rates for Gulf expats — sourced, dated and linked to official portals.</p>
            <form className="gv-hsearch" action={`${b}/search`} role="search">
              <Icon name="search" size={20} />
              <input name="q" type="search" placeholder="Search visas, jobs, driving…" aria-label="Search" />
              <button type="submit">Search</button>
            </form>
            <div className="gv-quick">
              {COUNTRIES.map((c) => (
                <Link key={c.slug} href={`${b}/country/${c.slug}`}>
                  <img src={flag(c.iso, 40)} alt="" width={20} height={14} />
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="gv-live" aria-label="Today in the Gulf">
            <div className="gv-live-h">
              <b>Today’s rates</b>
              <span>
                <i className="gv-dot" aria-hidden="true" /> {dateLong(updated)}
              </span>
            </div>
            <table className="gv-fx">
              <thead>
                <tr>
                  <th scope="col">1 unit</th>
                  {HOME.map((h) => (
                    <th scope="col" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GULF.map((g) => (
                  <tr key={g}>
                    <th scope="row">{g}</th>
                    {HOME.map((h) => {
                      const r = crossRate(snap, g, h);
                      return (
                        <td key={h}>
                          <Link href={`${b}/rates/${g.toLowerCase()}-to-${h.toLowerCase()}`}>{r == null ? "—" : fmt(r, 2)}</Link>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="gv-live-tiles">
              <Link href={`${b}/gold-rate/dubai`}>
                <span className="k">Gold 24K · Dubai</span>
                <span className="v">
                  {fmt(g24, 2)} <small>AED/g</small>
                </span>
                <span className="s">22K {fmt(g24 * 0.916, 2)}</span>
              </Link>
              <Link href={`${b}/fuel-price/uae`}>
                <span className="k">{p95 ? `Petrol ${p95.grade_key}` : "Petrol"} · UAE</span>
                <span className="v">
                  {p95 ? fmt(p95.price, 2) : "—"} <small>{p95?.currency ?? "AED"}/L</small>
                </span>
                <span className="s">{p91 ? `Petrol 91 ${fmt(p91.price, 2)} · ${fuel?.monthLabel ?? ""}` : fuel?.monthLabel ?? ""}</span>
              </Link>
            </div>
            <Link href={`${b}/rates`} className="gv-live-more">
              All rates <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>

      <div className="gv-wrap">
        <section className="gv-sec" id="countries">
          <div className="gv-sechead">
            <h2>Country guides</h2>
          </div>
          <div className="gv-countries">
            {COUNTRIES.map((c) => (
              <Link key={c.slug} href={`${b}/country/${c.slug}`} className="gv-country">
                <img src={flag(c.iso, 160)} alt="" width={48} height={32} />
                <span>
                  <b>{c.name}</b>
                  <small>{c.tagline}</small>
                </span>
                <em>{c.code}</em>
              </Link>
            ))}
          </div>
        </section>

        <section className="gv-sec" id="tools">
          <div className="gv-sechead">
            <h2>Rates & tools</h2>
            <span>Updated daily, every figure sourced</span>
          </div>
          <div className="gv-tools">
            {TOOLS.map((t) => (
              <Link key={t.path} href={`${b}/${t.path}`} className="gv-tool">
                <span className="gv-tool-ic">
                  <Icon name={t.icon} size={22} />
                </span>
                <b>{t.title}</b>
                <small>{t.text}</small>
              </Link>
            ))}
          </div>
        </section>

        {real.length ? (
          <section className="gv-sec" id="latest">
            <div className="gv-sechead">
              <h2>Latest guides</h2>
              <Link href={`${b}/archive`}>
                All guides <Icon name="arrow" size={16} />
              </Link>
            </div>
            <div className="gv-cards">
              {real.slice(0, 8).map((a) => (
                <GuideCard site={site} a={a} key={a.id} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="gv-sec" id="topics">
          <div className="gv-sechead">
            <h2>Browse by topic</h2>
          </div>
          <div className="gv-topics">
            {TOPICS.map((t) => {
              const list = real.filter((a) => topicOf(a).key === t.key).slice(0, 4);
              return (
                <div className="gv-topic" key={t.key}>
                  <Link href={`${b}/search?q=${encodeURIComponent(t.label.split(" ")[0])}`} className="gv-topic-h">
                    {t.label} <Icon name="arrow" size={16} />
                  </Link>
                  {list.length ? (
                    <ul>
                      {list.map((a) => (
                        <li key={a.id}>
                          <Link href={`${b}/${a.slug}`}>{a.title}</Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t.blurb}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </GcShell>
  );
}

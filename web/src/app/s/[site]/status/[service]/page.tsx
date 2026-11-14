import "@/sites/infkey/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getStatuses, getStatusDaily, statusWord } from "@/lib/aidata";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead } from "@/sites/infkey/data-ui";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { infMeta } from "@/sites/infkey/meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string; service: string }> }): Promise<Metadata> {
  const p = await params;
  const site = getSite(p.site);
  const s = (await getStatuses()).find((x) => x.service === p.service);
  if (!site || site.id !== "infkey" || !s) return {};
  return infMeta(site, `Is ${s.name} down right now? Live status & outages`, `${s.name} status right now: ${statusWord(s.indicator).toLowerCase()}. Live component status, current incidents and outage history, checked every 5 minutes.`, `/status/${s.service}`);
}

export default async function ServiceStatusPage({ params }: { params: Promise<{ site: string; service: string }> }) {
  const p = await params;
  const site = getSite(p.site);
  if (!site || site.id !== "infkey") notFound();
  const all = await getStatuses();
  const s = all.find((x) => x.service === p.service);
  if (!s) notFound();
  const daily = await getStatusDaily(s.service);
  const checks = daily.reduce((a, d) => a + d.checks, 0);
  const bad = daily.reduce((a, d) => a + d.bad, 0);
  const uptime = checks ? (100 * (1 - bad / checks)).toFixed(2) : null;
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const down = s.indicator !== "none";
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: base }, { name: "AI status", url: `${base}/status` }, { name: s.name, url: `${base}/status/${s.service}` }])} />
      <InfShell site={site}>
        <PageHead kicker="Live status" title={`Is ${s.name} down?`} dek={`${down ? "Yes — there is a reported problem right now." : "No — no known problems right now."} ${s.description}. Last checked ${new Date(s.checked_at).toUTCString()}.`} />
        <div className="price-cards">
          <div className="pcard">
            <div className="k">Status now</div>
            <div className="v">{statusWord(s.indicator)}</div>
          </div>
          <div className="pcard">
            <div className="k">Active incidents</div>
            <div className="v">{s.incidents.length}</div>
          </div>
          <div className="pcard">
            <div className="k">Uptime (tracked days)</div>
            <div className="v">{uptime ? `${uptime}%` : "—"}</div>
          </div>
        </div>
        {s.incidents.length ? (
          <section className="spec-block">
            <h2 className="block-h">Current incidents</h2>
            <ul>
              {s.incidents.map((i) => (
                <li key={i.u}>
                  <a href={i.u} target="_blank" rel="noopener noreferrer nofollow">
                    {i.n}
                  </a>{" "}
                  — {i.s}, impact {i.i}, since {new Date(i.at).toUTCString()}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section className="spec-block">
          <h2 className="block-h">Components</h2>
          <div className="itable-wrap">
            <table className="itable">
              <tbody>
                {s.components.map((c) => (
                  <tr key={c.n}>
                    <td>{c.n}</td>
                    <td>{c.s.replace(/_/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <p className="src-note">
          Source:{" "}
          <a href={s.page_url} target="_blank" rel="noopener noreferrer nofollow">
            official {s.name} status page
          </a>
          . Problems on your side (network, browser, account) won&apos;t show here. <Link href={`${b}/status`}>All AI tools status</Link>
        </p>
      </InfShell>
    </>
  );
}

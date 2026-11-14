import "@/sites/infkey/theme.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { getStatuses, statusWord } from "@/lib/aidata";
import { siteBaseUrl } from "@/lib/sites.config";
import { InfShell } from "@/sites/infkey/Chrome";
import { PageHead, fmtDate } from "@/sites/infkey/data-ui";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { infMeta } from "@/sites/infkey/meta";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const site = getSite((await params).site);
  if (!site || site.id !== "infkey") return {};
  return infMeta(site, "Is ChatGPT down? Live status of ChatGPT, Claude, Cursor & more", "Live status of ChatGPT, OpenAI API, Claude, Cursor, Perplexity, Mistral, ElevenLabs and other AI tools, checked every 5 minutes from their official status pages.", "/status");
}

const dot = (ind: string) => (ind === "none" ? "🟢" : ind === "minor" || ind === "maintenance" ? "🟡" : "🔴");

export default async function StatusPage({ params }: { params: Promise<{ site: string }> }) {
  const site = getSite((await params).site);
  if (!site || site.id !== "infkey") notFound();
  const list = await getStatuses();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const latest = list.reduce((a, s) => (s.checked_at > a ? s.checked_at : a), "");
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: site.name, url: base }, { name: "AI status", url: `${base}/status` }])} />
      <InfShell site={site}>
        <PageHead kicker="Live status" title="Is it down? AI tools status right now" dek={`Checked every 5 minutes from each service's official status page. Last check: ${latest ? new Date(latest).toUTCString() : "—"}.`} />
        <div className="itable-wrap">
          <table className="itable">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status now</th>
                <th>Active incidents</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.service}>
                  <td>
                    <Link className="m-name" href={`${b}/status/${s.service}`}>
                      <b>Is {s.name} down?</b>
                    </Link>
                  </td>
                  <td>
                    {dot(s.indicator)} {statusWord(s.indicator)}
                  </td>
                  <td>{s.incidents.length ? s.incidents.map((i) => i.n).join(" · ") : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="src-note">Source: each provider&apos;s public status page. InfKey is not affiliated with these companies. Updated {latest ? fmtDate(latest) : ""}.</p>
      </InfShell>
    </>
  );
}

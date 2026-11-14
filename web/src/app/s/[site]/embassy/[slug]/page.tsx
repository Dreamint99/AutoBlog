import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { findMission, missionSlug, missionsFrom, missionsIn, gulfLabel, mapLink } from "@/sites/gccguide/hub/embassy";
import { gate } from "@/sites/gccguide/hub/gate";
import { HubPage, Crumbs, PageHead, DataTable, Faq, SourceLine, Related, Callout, SectionHead } from "@/sites/gccguide/hub/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const m = findMission(slug);
  if (!site || site.id !== "gccguide" || !m) return {};
  const host = gulfLabel(m.gulf);
  return {
    title: `${m.name} — address, phone and opening hours`,
    description: `${m.name} in ${m.city}, ${host}: ${m.address || "address on the official site"}${m.phone ? ` · ${m.phone}` : ""}. Verified from the mission's official page on ${m.checked}.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/embassy/${missionSlug(m)}` },
    robots: gate.embassy(m.verified) ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: m.name, description: `Contact details for ${m.name}, ${m.city}.`, type: "website", url: `/embassy/${missionSlug(m)}` },
  };
}

export default async function Page({ params }: Props) {
  const { site: id, slug } = await params;
  const site = getSite(id);
  const m = findMission(slug);
  if (!site || site.id !== "gccguide" || !m) notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const map = mapLink(m);
  const kind = m.type === "embassy" ? "Embassy" : m.type === "consulate-general" ? "Consulate General" : "Consulate";

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: site.name, url: base },
          { name: "Embassies", url: `${base}/embassy` },
          { name: `${m.source_country} in ${gulfLabel(m.gulf)}`, url: `${base}/embassy/${missionSlug(m)}` },
        ])}
      />
      <HubPage site={site} active="countries">
        <Crumbs site={site} items={[{ label: "Embassies", href: `${b}/embassy` }, { label: `${m.source_country} — ${gulfLabel(m.gulf)}` }]} />
        <PageHead
          kicker={`${kind} · ${m.city}, ${gulfLabel(m.gulf)}`}
          title={m.name}
          dek={`Contact details for the ${m.source_country} ${kind.toLowerCase()} in ${m.city}, read from ${m.source_url ? "the mission's official page" : "official sources"} and checked on ${m.checked}.`}
        />

        <DataTable
          head={["Detail", "Value"]}
          rows={[
            ["Address", m.address || <em key="a">Not published on the official page</em>],
            ["Phone", m.phone ? <a key="p" href={`tel:${m.phone.replace(/\s/g, "")}`}>{m.phone}</a> : <em key="p">Not published</em>],
            ["Email", m.email ? <a key="e" href={`mailto:${m.email}`}>{m.email}</a> : <em key="e">Not published</em>],
            ["Opening hours", m.hours || <em key="h">Not published — check the official site</em>],
            ["City", m.city],
            ["Host country", gulfLabel(m.gulf)],
          ]}
          caption={`${m.name} — contact details`}
          foot={<>Fields the mission does not publish are shown as empty rather than copied from a directory.</>}
        />

        <div className="gh-grid cols3">
          {m.website ? (
            <a className="gh-card" href={m.website} target="_blank" rel="noopener nofollow">
              <b>Official website</b>
              <span>{m.website.replace(/^https?:\/\//, "").slice(0, 28)}</span>
            </a>
          ) : null}
          {map ? (
            <a className="gh-card" href={map} target="_blank" rel="noopener nofollow">
              <b>Open in Maps</b>
              <span>Google Maps ↗</span>
            </a>
          ) : null}
          {m.phone ? (
            <a className="gh-card" href={`tel:${m.phone.replace(/\s/g, "")}`}>
              <b>Call</b>
              <span>{m.phone}</span>
            </a>
          ) : null}
        </div>

        <Callout tone="warn" title="Confirm before you travel to the mission">
          <p style={{ margin: 0 }}>
            Embassies move, change phone numbers and switch to appointment-only systems. The details above were correct when the official page was read on{" "}
            {m.checked}. Check that page — linked in the source line below — before making a trip, and book online where the mission requires it.
          </p>
        </Callout>

        <Faq
          items={[
            {
              q: `Where is the ${m.source_country} ${kind.toLowerCase()} in ${m.city}?`,
              a: m.address ? `${m.address}. ${m.hours ? `It is open ${m.hours}.` : ""}` : `The address is not published on the mission's official page, so it is not repeated here. The official website linked on this page has the current address.`,
            },
            {
              q: `How do I contact the ${m.source_country} mission in ${gulfLabel(m.gulf)}?`,
              a: [m.phone ? `Phone ${m.phone}.` : "No public phone number is published.", m.email ? `Email ${m.email}.` : "", m.website ? `The official site is ${m.website}.` : ""].filter(Boolean).join(" "),
            },
            {
              q: "Do I need an appointment for consular services?",
              a: "Most Gulf missions require one and publish the booking system on their own website. Use the official website link rather than turning up — several missions no longer accept walk-ins for passports and attestations.",
            },
          ]}
        />

        <SectionHead title={`Other ${m.source_country} missions in the Gulf`} />
        <div className="gh-grid cols3">
          {missionsFrom(m.source_country)
            .filter((x) => missionSlug(x) !== missionSlug(m))
            .map((x) => (
              <Link key={missionSlug(x)} className="gh-card" href={`${b}/embassy/${missionSlug(x)}`}>
                <b>{x.city}</b>
                <span>{gulfLabel(x.gulf)}</span>
              </Link>
            ))}
        </div>

        <Related
          title={`Other missions in ${gulfLabel(m.gulf)}`}
          links={missionsIn(m.gulf)
            .filter((x) => missionSlug(x) !== missionSlug(m))
            .slice(0, 10)
            .map((x) => ({ label: `${x.source_country} — ${x.city}`, href: `${b}/embassy/${missionSlug(x)}` }))}
        />

        <SourceLine source={m.source_url || "Official mission page"} url={m.source_url || base} updated={m.checked} note={<>Read on {m.checked}. Unpublished fields are left empty, never estimated.</>} />
      </HubPage>
    </>
  );
}

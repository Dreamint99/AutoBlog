import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { JsonLd, breadcrumbSchema } from "@/lib/seo";
import { defaultOgImages } from "@/lib/og";
import { visaItems, visaCountries, countryName } from "@/sites/gccguide/hub/directory";
import { GULF_CURRENCIES, INDEX } from "@/sites/gccguide/hub/config";
import { HubPage, Crumbs, PageHead, DataTable, Faq, SectionHead, SourceLine, Related, Callout } from "@/sites/gccguide/hub/ui";
import { fmt } from "@/sites/gccguide/hub/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string; country: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: id, country } = await params;
  const site = getSite(id);
  const g = GULF_CURRENCIES.find((c) => c.country === country);
  if (!site || site.id !== "gccguide" || !g) return {};
  const items = visaItems(country);
  const withFee = items.filter((i) => i.fee != null).length;
  return {
    title: `Visa, residence permit and ID fees in ${g.short} — official ${new Date().getUTCFullYear()}`,
    description: `${withFee} of ${items.length} ${g.short} visa and residence fees verified from official portals, with the steps, the basis of each fee and the page it came from.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/visa-fees/${country}` },
    robots: INDEX.visaFees ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: `Visa and residence fees in ${g.short}`, description: "Official fees, steps and source links.", type: "website", url: `/visa-fees/${country}` },
  };
}

export default async function Page({ params }: Props) {
  const { site: id, country } = await params;
  const site = getSite(id);
  const g = GULF_CURRENCIES.find((c) => c.country === country);
  if (!site || site.id !== "gccguide" || !g) notFound();
  const b = `/s/${site.id}`;
  const base = siteBaseUrl(site);
  const items = visaItems(country);
  if (!items.length) notFound();

  const faq = [
    {
      q: `How much does a residence permit cost in ${g.short}?`,
      a:
        items.find((i) => i.fee != null && i.category === "residence")?.fee != null
          ? `${items.find((i) => i.fee != null && i.category === "residence")!.item} is ${items.find((i) => i.fee != null && i.category === "residence")!.currency} ${fmt(items.find((i) => i.fee != null && i.category === "residence")!.fee, 0)} — ${items.find((i) => i.fee != null && i.category === "residence")!.basis}. The full table with the official source is above.`
          : `The official ${g.short} portal does not publish a single figure for this — it depends on the permit duration and the applicant. The table marks the fee as unverified and links the portal rather than quoting a number from a visa agency.`,
    },
    {
      q: "Do these fees include medical tests, insurance and typing?",
      a: "No. Government fee schedules usually cover the permit, the ID card and the service charge only. Medical fitness tests, health insurance and typing centre charges are separate and vary by emirate, city and provider.",
    },
    {
      q: "Who pays — the employer or the worker?",
      a: `Under ${g.short} labour law the employer normally bears the cost of the work permit and residence sponsorship for a sponsored worker. Some employers deduct ID or service fees; the law and the employment contract decide, and the official portal named on each row is the authority.`,
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Visa fees", url: `${base}/visa-fees` },
            { name: g.short, url: `${base}/visa-fees/${country}` },
          ]),
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
        ]}
      />
      <HubPage site={site} active="countries">
        <Crumbs site={site} items={[{ label: "Visa & residence fees", href: `${b}/visa-fees` }, { label: g.short }]} />
        <PageHead
          kicker={`${items.filter((i) => i.fee != null).length} verified fees · checked ${items[0].checked}`}
          title={`Visa, residence and ID fees in ${g.short}`}
          dek="What the government charges, taken from the official portal — not from a visa agency. Fees that depend on duration or applicant are explained rather than averaged."
        />

        <DataTable
          head={["Item", "Fee", "Basis", "Source"]}
          rows={items.map((i) => [
            <div key={i.item}>
              <b>{i.item}</b>
              <div style={{ color: "var(--faint)", fontSize: 12 }}>{i.category}</div>
            </div>,
            i.fee == null ? <em key="f">Not published</em> : <b key="f">{i.currency} {fmt(i.fee, 0)}</b>,
            i.basis || "—",
            i.source_url ? (
              <a key="s" href={i.source_url} target="_blank" rel="noopener nofollow">
                Official ↗
              </a>
            ) : (
              "—"
            ),
          ])}
          caption={`${g.short} — official fees`}
          foot={<>Excludes medical tests, insurance and typing. Each row links the portal it was read from.</>}
        />

        {items.some((i) => i.steps.length) ? (
          <>
            <SectionHead title="How the process runs" dek="The steps as the official portal describes them." />
            <ol className="gh-steps">
              {items
                .filter((i) => i.steps.length)
                .slice(0, 1)
                .flatMap((i) => i.steps)
                .map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
            </ol>
          </>
        ) : null}

        {items.some((i) => i.fee == null) ? (
          <Callout tone="warn" title="What we could not verify">
            <p style={{ margin: 0 }}>
              {items.filter((i) => i.fee == null).map((i) => i.item).join(" · ")} — the official portal does not publish a standalone figure (the fee
              is only charged inside an e-service flow, or the schedule page is unreachable). Rather than quote a visa-agency number we show the
              portal and say so.
            </p>
          </Callout>
        ) : null}

        <Faq items={faq} />

        <Related
          title="Other Gulf states"
          links={GULF_CURRENCIES.filter((x) => x.country !== country).map((x) => ({ label: x.short, href: `${b}/visa-fees/${x.country}` }))}
        />

        <SourceLine source="Official government portals" url={items[0].source_url || base} updated={items[0].checked} note={<>Read from the linked portal on the date shown. Fees change by decree — confirm before paying.</>} />
      </HubPage>
    </>
  );
}

void visaCountries;

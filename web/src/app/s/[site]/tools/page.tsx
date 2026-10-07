import "@/sites/walvi/theme.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { WalviShell } from "@/sites/walvi/Chrome";
import { PageBanner, Crumbs, Disclaimer } from "@/sites/walvi/data-ui";
import SalaryCalculator from "@/sites/walvi/SalaryCalculator";
import CompareCalculator from "@/sites/walvi/CompareCalculator";
import { countriesLite, jobsLite, estimatesLite, DATA_VERIFIED } from "@/lib/walvi";
import { JsonLd, webAppSchema, breadcrumbSchema } from "@/lib/seo";

const COMING: ReadonlyArray<{ ico: string; h: string; p: string }> = [
  { ico: "⏱️", h: "Overtime salary calculator", p: "Hourly base, overtime multiplier and weekly hours → real monthly take-home." },
  { ico: "🛂", h: "Work-permit eligibility checker", p: "Answer a few questions to see which country routes you likely qualify for." },
  { ico: "📋", h: "Visa document checklist", p: "Generate a per-country document list to prepare before you apply." },
  { ico: "💱", h: "Salary to BDT / QAR converter", p: "Convert any European salary to BDT or QAR at an editable rate." },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>;
}): Promise<Metadata> {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") return {};
  return {
    title: "Europe salary, savings & country-comparison calculators | VisaPoint",
    description:
      "Free tools: calculate net pay and monthly savings on a European salary, and compare two countries for the same job. The math is shown.",
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: "/tools" },
    openGraph: {
      title: "Europe salary & savings calculators | VisaPoint",
      description: "Calculate net pay, monthly savings and compare countries for the same job.",
      type: "website",
      url: "/tools",
    },
  };
}

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site || site.id !== "walvi") notFound();
  const base = siteBaseUrl(site);
  const verifiedLabel = new Date(DATA_VERIFIED).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <>
      <JsonLd
        data={[
          webAppSchema({
            name: "VisaPoint Europe Salary & Savings Calculator",
            url: `${base}/tools`,
            description:
              "Interactive calculators for European net pay, monthly savings and country-vs-country comparison for the same job.",
          }),
          breadcrumbSchema([
            { name: site.name, url: base },
            { name: "Tools", url: `${base}/tools` },
          ]),
        ]}
      />
      <WalviShell site={site}>
        <Crumbs items={[{ name: site.name, href: `/s/${site.id}` }, { name: "Tools" }]} />
        <PageBanner
          flag="🧮"
          kicker="Free tools · no sign-up"
          title="Salary & savings calculators"
          dek="Put in a real wage and get a real take-home and a realistic monthly saving — then compare two countries for the same job. Every tool shows the formula behind the number."
          chips={["2 live tools", "EUR · indicative", "Math shown", "More shipping next"]}
        />

        <div className="section-head">
          <h2>1 · Net pay &amp; monthly savings</h2>
          <span className="rule" />
          <span className="count">estimator</span>
        </div>
        <p className="lead">
          Enter a monthly gross wage and pick a country; the accommodation toggle reflects
          employer-provided housing — the single biggest savings lever for imported workers.
        </p>
        <SalaryCalculator countries={countriesLite()} verifiedOn={verifiedLabel} />

        <div className="section-head">
          <h2>2 · Compare two countries</h2>
          <span className="rule" />
          <span className="count">same job</span>
        </div>
        <p className="lead">
          Pick an occupation and two countries for a side-by-side on gross, net, living cost and the
          realistic monthly saving with employer housing — with a clear &ldquo;saves more&rdquo; verdict.
        </p>
        <CompareCalculator countries={countriesLite()} jobs={jobsLite()} estimates={estimatesLite()} />

        <Disclaimer />

        <div className="section-head">
          <h2>More tools</h2>
          <span className="rule" />
          <span className="count">shipping next</span>
        </div>
        <div className="coverage">
          {COMING.map((c) => (
            <div className="cov is-soon" key={c.h}>
              <div className="ico" aria-hidden="true">
                {c.ico}
              </div>
              <h3>{c.h}</h3>
              <p>{c.p}</p>
              <span className="soon-pill">Coming soon</span>
            </div>
          ))}
        </div>
      </WalviShell>
    </>
  );
}

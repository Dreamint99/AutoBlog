import Link from "next/link";
import type { Site } from "@/lib/types";
import { HubPage, Crumbs, PageHead, DataTable, Faq, SectionHead, Callout, Related } from "./ui";
import { GULF_CURRENCIES } from "./config";
import { allRules } from "./rules";
import { computeGratuity } from "./gratuity";
import { fmt } from "./format";

/* /calculators for gccguide. The route file also serves infkey's AI-cost
 * calculators, so this component is mounted from there for site === gccguide. */

const TOOLS = [
  { slug: "gratuity", label: "End-of-service gratuity", blurb: "What you are owed when the job ends" },
  { slug: "overtime", label: "Overtime pay", blurb: "Extra hours, rest days and public holidays" },
  { slug: "annual-leave", label: "Annual leave & leave pay", blurb: "Days per year and what a day is worth" },
  { slug: "notice-period", label: "Notice period", blurb: "How much notice, and pay in lieu" },
];

export const gccCalculatorsMeta = {
  title: "Gulf workers' money calculators — gratuity, overtime, leave, notice",
  description:
    "Six Gulf states, four statutory calculations: end-of-service gratuity, overtime, annual leave and notice period — each with the article it comes from, a worked example and an official source link.",
};

export default function CalculatorsHub({ site }: { site: Site }) {
  const b = `/s/${site.id}`;

  const rows = GULF_CURRENCIES.map((g) => {
    const rule = allRules().find((r) => r.country === g.country)?.gratuity;
    const r = rule?.confirmed ? computeGratuity(rule, { monthlyWage: 5000, years: 5, reason: "termination" }) : null;
    return { g, rule, r };
  });

  const faq = [
    {
      q: "Are these calculators free?",
      a: "Yes, and they work without JavaScript: the form submits to the page and the server does the arithmetic. Nothing you type is stored.",
    },
    {
      q: "Where do the formulas come from?",
      a: "Each country's labour law, transcribed with its article number and an official source link printed under the calculation. Where a formula could not be verified from an official source, the calculator refuses to give a number instead of guessing.",
    },
    {
      q: "Do these apply to free-zone or domestic workers?",
      a: "They apply the private-sector labour law of each country. Free-zone employment (DIFC, ADGM, QFC) and domestic work have their own rules in several states, and the country page says so where it matters. Check the governing law named in your contract.",
    },
  ];

  return (
    <HubPage site={site} active="tools">
      <Crumbs site={site} items={[{ label: "Calculators" }]} />
      <PageHead
        kicker="Six countries · four statutory calculations"
        title="Gulf workers' money calculators"
        dek="What your contract is actually worth: end-of-service gratuity, overtime, annual leave and notice. Each one shows the article, the arithmetic and an official source — not a black box."
      />

      <SectionHead title="Gratuity on a 5,000 wage after 5 years" dek="The same scenario in all six countries, in local currency." />
      <DataTable
        head={["Country", "Currency", "Days earned", "Gratuity", "Rule"]}
        rows={rows.map(({ g, r }) => [
          <Link key={g.country} href={`${b}/gratuity/${g.country}`}>
            <b>{g.short}</b>
          </Link>,
          g.code,
          r ? fmt(r.days, 2) : "—",
          r ? <b key={`a${g.country}`}>{fmt(r.amount, 2)}</b> : <span key={`a${g.country}`}>not verified</span>,
          r ? "verified" : "pending",
        ])}
        caption="End-of-service gratuity on a 5,000 monthly wage, 5 years, terminated by the employer"
        foot={<>Each figure is the statutory formula, not a typical settlement. Open a country to change the wage, the years and the reason.</>}
      />

      <SectionHead title="Pick a country" />
      <div className="gh-grid cols3">
        {GULF_CURRENCIES.map((g) => (
          <Link key={g.country} className="gh-card" href={`${b}/gratuity/${g.country}`}>
            <b>{g.short}</b>
            <span>Gratuity →</span>
          </Link>
        ))}
      </div>

      <SectionHead title="All four calculators" />
      <DataTable
        head={["Calculator", ...GULF_CURRENCIES.map((g) => g.code)]}
        rows={TOOLS.map((t) => [
          <b key={t.slug}>{t.label}</b>,
          ...GULF_CURRENCIES.map((g) => (
            <Link key={`${t.slug}-${g.code}`} href={`${b}/${t.slug}/${g.country}`}>
              {g.code}
            </Link>
          )),
        ])}
        foot="Each cell opens that country's calculator. The gratuity tool is live first; the other three are being verified country by country."
      />

      <Callout tone="law" title="Why the article number matters">
        <p style={{ margin: 0 }}>
          Gulf labour law changes often — the UAE replaced its law in 2022 and Oman hers in 2023. A calculator that does not say which article
          it implements is a calculator you cannot check. Every result here names its article and links the official text.
        </p>
      </Callout>

      <Faq items={faq} />

      <Related
        title="Elsewhere on GCCGuide"
        links={[
          { label: "Today's exchange rates", href: `${b}/rates` },
          { label: "Gold rate in the Gulf", href: `${b}/gold-rate` },
          { label: "Fuel prices", href: `${b}/fuel-price` },
        ]}
      />
    </HubPage>
  );
}

/* Walvi — Europe Work, Salary & Visa Intelligence
   ────────────────────────────────────────────────────────────────────────
   Static, version-controlled dataset powering the structured data-product
   pages (countries, jobs, tools). Plain module (no secrets, no server-only)
   so server pages AND the client calculators can import it.

   ⚠️  HONESTY CONTRACT (this is the site's promise to readers):
   The salary, cost-of-living and savings figures here are INDICATIVE
   ESTIMATES — modelled from each occupation's rough EU monthly average and a
   per-country wage index. They are NOT official quotes for any specific job
   offer. Every country links an official government / EU source to verify
   against and carries the `DATA_VERIFIED` date. Visa rules and pay change
   fast; always confirm with the official source or the embassy before acting.
   When you verify a real figure for a (country, job) pair, add it to
   GROSS_OVERRIDES so the modelled number is replaced by a known one.
   ──────────────────────────────────────────────────────────────────────── */

export const DATA_VERIFIED = "2026-06-22";

/** Rough EUR per local-currency note shown to BDT-thinking workers. Approximate. */
export const EUR_TO_BDT = 128;

export interface Country {
  id: string;
  name: string;
  slug: string;
  flag: string;
  inEU: boolean;
  schengen: boolean;
  currency: string; // local currency name (figures are shown in EUR-equivalent)
  wageIndex: number; // multiplier vs the EU trade baseline (lower-cost east < 1)
  netRatio: number; // typical net / gross after income tax + social contributions
  accommodationEUR: number; // shared worker housing, monthly
  foodEUR: number; // monthly
  otherEUR: number; // transport + misc, monthly
  language: string;
  ieltsRequired: boolean;
  permitType: string;
  permitNote: string;
  visaWeeks: [number, number]; // typical processing range, weeks
  officialSource: string;
  blurb: string;
}

export interface Job {
  id: string;
  name: string;
  slug: string;
  icon: string;
  skillLevel: "Skilled" | "Semi-skilled";
  demand: "High" | "Very high";
  euAvgGrossEUR: number; // indicative EU monthly gross baseline for this trade
  certNote: string;
  langNote: string;
  summary: string;
}

/* ── 10 countries ──────────────────────────────────────────────────────── */
export const COUNTRIES: Country[] = [
  {
    id: "poland", name: "Poland", slug: "poland", flag: "🇵🇱", inEU: true, schengen: true,
    currency: "Polish złoty (PLN)", wageIndex: 0.95, netRatio: 0.74,
    accommodationEUR: 250, foodEUR: 220, otherEUR: 120,
    language: "Polish (English on many sites)", ieltsRequired: false,
    permitType: "Type A work permit + national (D) visa",
    permitNote: "Employer secures the Type A permit before you apply for the D visa at the Polish consulate. A voivode work permit or employer declaration is the usual route for non-EU workers.",
    visaWeeks: [6, 12],
    officialSource: "https://www.gov.pl/web/diplomacy/national-visa",
    blurb: "The biggest single market for foreign skilled workers in Central Europe — heavy demand in construction, welding, logistics and manufacturing.",
  },
  {
    id: "croatia", name: "Croatia", slug: "croatia", flag: "🇭🇷", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 0.9, netRatio: 0.74,
    accommodationEUR: 280, foodEUR: 230, otherEUR: 120,
    language: "Croatian (English in tourism)", ieltsRequired: false,
    permitType: "Single permit (residence + work)",
    permitNote: "Croatia issues a combined single permit; the employer files the labour-market test and application. Tourism, construction and shipbuilding pull in many non-EU workers each season.",
    visaWeeks: [4, 10],
    officialSource: "https://mup.gov.hr/aliens-281621/stay-and-work/286833",
    blurb: "A fast-growing destination for South-Asian workers, especially in construction, hospitality and shipyards.",
  },
  {
    id: "romania", name: "Romania", slug: "romania", flag: "🇷🇴", inEU: true, schengen: true,
    currency: "Romanian leu (RON)", wageIndex: 0.85, netRatio: 0.62,
    accommodationEUR: 220, foodEUR: 200, otherEUR: 110,
    language: "Romanian", ieltsRequired: false,
    permitType: "Work permit (aviz de muncă) + long-stay D/AM visa",
    permitNote: "The employer obtains the work permit from the Immigration Inspectorate within an annual quota, then you apply for the long-stay visa. Net pay is lower because of higher social contributions.",
    visaWeeks: [6, 14],
    officialSource: "https://www.gov.ro/en",
    blurb: "Large annual worker quotas and strong demand in construction, manufacturing and drivers — a common entry point into the EU.",
  },
  {
    id: "lithuania", name: "Lithuania", slug: "lithuania", flag: "🇱🇹", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 0.95, netRatio: 0.7,
    accommodationEUR: 270, foodEUR: 230, otherEUR: 120,
    language: "Lithuanian (English widely used)", ieltsRequired: false,
    permitType: "Work permit + national (D) visa or temporary residence",
    permitNote: "Workers in shortage occupations can use a simplified route. The employer registers the vacancy with the Employment Service before the permit is issued.",
    visaWeeks: [4, 12],
    officialSource: "https://www.migracija.lt/en/",
    blurb: "Baltic hub for logistics, transport and manufacturing with one of the simpler shortage-occupation routes.",
  },
  {
    id: "slovakia", name: "Slovakia", slug: "slovakia", flag: "🇸🇰", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 0.9, netRatio: 0.73,
    accommodationEUR: 280, foodEUR: 230, otherEUR: 120,
    language: "Slovak", ieltsRequired: false,
    permitType: "Single permit / temporary residence for employment",
    permitNote: "Demand is concentrated in automotive and machine operation. The employer reports the vacancy and the labour office assesses it before the residence-for-employment permit.",
    visaWeeks: [6, 14],
    officialSource: "https://www.minv.sk/?temporary-residence",
    blurb: "Europe's car-factory belt — steady demand for machine operators, welders and assemblers.",
  },
  {
    id: "bulgaria", name: "Bulgaria", slug: "bulgaria", flag: "🇧🇬", inEU: true, schengen: true,
    currency: "Bulgarian lev (BGN)", wageIndex: 0.8, netRatio: 0.78,
    accommodationEUR: 220, foodEUR: 190, otherEUR: 100,
    language: "Bulgarian", ieltsRequired: false,
    permitType: "Single permit (work + residence)",
    permitNote: "Lower gross pay but a flat 10% income tax keeps net pay relatively high. The employer applies for the single permit with the Employment Agency.",
    visaWeeks: [6, 12],
    officialSource: "https://www.az.government.bg/en/",
    blurb: "Lowest cost of living on this list and a flat 10% tax — modest wages but solid take-home for savers.",
  },
  {
    id: "hungary", name: "Hungary", slug: "hungary", flag: "🇭🇺", inEU: true, schengen: true,
    currency: "Hungarian forint (HUF)", wageIndex: 0.85, netRatio: 0.67,
    accommodationEUR: 250, foodEUR: 210, otherEUR: 110,
    language: "Hungarian", ieltsRequired: false,
    permitType: "Combined work and residence permit (guest-worker route)",
    permitNote: "Hungary runs a guest-worker scheme for third-country nationals tied to a specific employer and occupation. Switching employers is restricted.",
    visaWeeks: [6, 12],
    officialSource: "https://oif.gov.hu/en/",
    blurb: "Big automotive and logistics employers near Budapest; the guest-worker permit ties you to one employer.",
  },
  {
    id: "portugal", name: "Portugal", slug: "portugal", flag: "🇵🇹", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.0, netRatio: 0.78,
    accommodationEUR: 350, foodEUR: 250, otherEUR: 140,
    language: "Portuguese", ieltsRequired: false,
    permitType: "Residence visa for subordinate work + residence permit",
    permitNote: "A job offer plus a work-contract lets you apply for the residence visa; Portugal is seen as a friendlier long-term settlement and family-route country.",
    visaWeeks: [8, 16],
    officialSource: "https://aima.gov.pt/en",
    blurb: "Higher living costs but a popular settlement route — strong in construction, tourism and agriculture.",
  },
  {
    id: "italy", name: "Italy", slug: "italy", flag: "🇮🇹", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.15, netRatio: 0.72,
    accommodationEUR: 420, foodEUR: 280, otherEUR: 160,
    language: "Italian", ieltsRequired: false,
    permitType: "Nulla osta + work visa under the Decreto Flussi quota",
    permitNote: "Most non-EU hiring runs through the annual Decreto Flussi quota: the employer applies for a nulla osta (work clearance), then you apply for the work visa. Cooks, drivers and construction are common categories.",
    visaWeeks: [8, 20],
    officialSource: "https://vistoperitalia.esteri.it/home/en",
    blurb: "Highest wages on this list but also the highest costs and a quota-gated (Decreto Flussi) entry process.",
  },
  {
    id: "north-macedonia", name: "North Macedonia", slug: "north-macedonia", flag: "🇲🇰", inEU: false, schengen: false,
    currency: "Macedonian denar (MKD)", wageIndex: 0.65, netRatio: 0.73,
    accommodationEUR: 180, foodEUR: 160, otherEUR: 90,
    language: "Macedonian", ieltsRequired: false,
    permitType: "Work permit + temporary residence (non-EU country)",
    permitNote: "Not in the EU or Schengen, so this is not an EU work permit — but it is a lower-barrier entry to European work experience, often used as a stepping stone.",
    visaWeeks: [4, 10],
    officialSource: "https://vlada.mk/?ln=en-gb",
    blurb: "Lowest barrier and lowest cost, but outside the EU/Schengen — useful first European experience, not an EU permit.",
  },

  /* ── 30 more destinations (added for SEO breadth) ── */
  {
    id: "germany", name: "Germany", slug: "germany", flag: "🇩🇪", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.5, netRatio: 0.63, accommodationEUR: 450, foodEUR: 300, otherEUR: 160,
    language: "German (English in IT/engineering)", ieltsRequired: false,
    permitType: "EU Blue Card / Skilled Worker visa",
    permitNote: "Job offer plus a recognised qualification; the Skilled Immigration Act and the Blue Card (for higher salaries) are the main routes.",
    visaWeeks: [8, 16], officialSource: "https://www.make-it-in-germany.com/en/visa-residence/types/work",
    blurb: "Europe's biggest economy and the #1 skilled-worker magnet — heavy demand in trades, care, logistics and engineering.",
  },
  {
    id: "france", name: "France", slug: "france", flag: "🇫🇷", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.4, netRatio: 0.66, accommodationEUR: 500, foodEUR: 300, otherEUR: 160,
    language: "French", ieltsRequired: false,
    permitType: "Work visa (salarié) + residence permit",
    permitNote: "The employer files the work authorisation with the labour ministry; the 'Passeport Talent' suits skilled and higher-paid workers.",
    visaWeeks: [8, 16], officialSource: "https://france-visas.gouv.fr/en/",
    blurb: "High wages and a structured route; functional French helps a lot for most jobs.",
  },
  {
    id: "spain", name: "Spain", slug: "spain", flag: "🇪🇸", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.1, netRatio: 0.75, accommodationEUR: 380, foodEUR: 260, otherEUR: 140,
    language: "Spanish", ieltsRequired: false,
    permitType: "Work + residence visa (cuenta ajena)",
    permitNote: "The employer applies for the work authorisation; Spain runs a shortage-occupation 'catálogo' and periodic regularisation routes.",
    visaWeeks: [8, 20], officialSource: "https://www.exteriores.gob.es/en/",
    blurb: "Big hospitality and agriculture demand; pay below the north but living costs are lower too.",
  },
  {
    id: "netherlands", name: "Netherlands", slug: "netherlands", flag: "🇳🇱", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.5, netRatio: 0.66, accommodationEUR: 600, foodEUR: 320, otherEUR: 170,
    language: "Dutch (English very widely spoken)", ieltsRequired: false,
    permitType: "Single permit (GVVA) / Highly Skilled Migrant",
    permitNote: "The employer must be an IND-recognised sponsor; the Highly Skilled Migrant route is salary-threshold based.",
    visaWeeks: [6, 12], officialSource: "https://ind.nl/en",
    blurb: "High wages and English-friendly workplaces, but housing is scarce and expensive.",
  },
  {
    id: "belgium", name: "Belgium", slug: "belgium", flag: "🇧🇪", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.45, netRatio: 0.62, accommodationEUR: 550, foodEUR: 300, otherEUR: 160,
    language: "Dutch / French", ieltsRequired: false,
    permitType: "Single permit (work + residence)",
    permitNote: "The region (Flanders, Wallonia or Brussels) issues the work authorisation, so processing and rules vary by region.",
    visaWeeks: [8, 16], officialSource: "https://dofi.ibz.be/en",
    blurb: "Strong wages and a central location; high tax trims take-home pay.",
  },
  {
    id: "austria", name: "Austria", slug: "austria", flag: "🇦🇹", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.45, netRatio: 0.66, accommodationEUR: 500, foodEUR: 300, otherEUR: 160,
    language: "German", ieltsRequired: false,
    permitType: "Red-White-Red Card (points-based)",
    permitNote: "The points-based Red-White-Red Card targets skilled workers and shortage occupations.",
    visaWeeks: [8, 14], officialSource: "https://www.migration.gv.at/en/",
    blurb: "High pay and Alpine quality of life via a points-based skilled-worker route.",
  },
  {
    id: "ireland", name: "Ireland", slug: "ireland", flag: "🇮🇪", inEU: true, schengen: false,
    currency: "Euro (EUR)", wageIndex: 1.55, netRatio: 0.7, accommodationEUR: 700, foodEUR: 340, otherEUR: 180,
    language: "English", ieltsRequired: false,
    permitType: "Employment Permit (General / Critical Skills)",
    permitNote: "Employer-led; Critical Skills permits fast-track shortage roles toward residency. (In the EU but not the Schengen area.)",
    visaWeeks: [8, 16], officialSource: "https://www.irishimmigration.ie/",
    blurb: "English-speaking with top wages — but one of Europe's tightest housing markets.",
  },
  {
    id: "luxembourg", name: "Luxembourg", slug: "luxembourg", flag: "🇱🇺", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.8, netRatio: 0.7, accommodationEUR: 700, foodEUR: 350, otherEUR: 190,
    language: "French / German / Luxembourgish", ieltsRequired: false,
    permitType: "Work + residence permit (salaried)",
    permitNote: "The employer proves no EU candidate was available; very high salaries offset very high living costs.",
    visaWeeks: [8, 14], officialSource: "https://guichet.public.lu/en.html",
    blurb: "Among Europe's highest wages — tiny, multilingual and finance-heavy.",
  },
  {
    id: "switzerland", name: "Switzerland", slug: "switzerland", flag: "🇨🇭", inEU: false, schengen: true,
    currency: "Swiss franc (CHF)", wageIndex: 2.2, netRatio: 0.78, accommodationEUR: 800, foodEUR: 420, otherEUR: 220,
    language: "German / French / Italian", ieltsRequired: false,
    permitType: "Work permit (B/L) — quota for non-EU",
    permitNote: "Non-EU hiring is quota-limited and the employer must show no suitable EU/Swiss candidate; pay is the highest in Europe.",
    visaWeeks: [8, 16], officialSource: "https://www.sem.admin.ch/sem/en/home.html",
    blurb: "The highest pay on the continent — and the highest costs plus tight non-EU quotas.",
  },
  {
    id: "united-kingdom", name: "United Kingdom", slug: "united-kingdom", flag: "🇬🇧", inEU: false, schengen: false,
    currency: "Pound sterling (GBP)", wageIndex: 1.5, netRatio: 0.72, accommodationEUR: 650, foodEUR: 320, otherEUR: 180,
    language: "English", ieltsRequired: true,
    permitType: "Skilled Worker visa (sponsored)",
    permitNote: "Needs a licensed sponsor and a job on the eligible list; an approved English test and a salary threshold apply.",
    visaWeeks: [3, 8], officialSource: "https://www.gov.uk/browse/visas-immigration/work-visas",
    blurb: "English-speaking with fast decisions, but you need a licensed sponsor and an English test.",
  },
  {
    id: "denmark", name: "Denmark", slug: "denmark", flag: "🇩🇰", inEU: true, schengen: true,
    currency: "Danish krone (DKK)", wageIndex: 2.0, netRatio: 0.62, accommodationEUR: 700, foodEUR: 380, otherEUR: 200,
    language: "Danish (English very widely spoken)", ieltsRequired: false,
    permitType: "Work permit (Pay Limit / Positive List)",
    permitNote: "Schemes such as the Pay Limit and the Positive List route skilled and shortage jobs.",
    visaWeeks: [4, 12], officialSource: "https://www.nyidanmark.dk/en-GB",
    blurb: "Very high pay and strong welfare, balanced by high tax and living costs.",
  },
  {
    id: "sweden", name: "Sweden", slug: "sweden", flag: "🇸🇪", inEU: true, schengen: true,
    currency: "Swedish krona (SEK)", wageIndex: 1.7, netRatio: 0.7, accommodationEUR: 600, foodEUR: 340, otherEUR: 180,
    language: "Swedish (English very widely spoken)", ieltsRequired: false,
    permitType: "Work permit (employer-sponsored)",
    permitNote: "The job is advertised in the EU first; a binding offer meeting collective-agreement pay is required.",
    visaWeeks: [4, 16], officialSource: "https://www.migrationsverket.se/en/",
    blurb: "High wages and English-friendly workplaces; processing can be slow.",
  },
  {
    id: "finland", name: "Finland", slug: "finland", flag: "🇫🇮", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.6, netRatio: 0.68, accommodationEUR: 550, foodEUR: 320, otherEUR: 170,
    language: "Finnish (English in tech)", ieltsRequired: false,
    permitType: "Residence permit for an employed person",
    permitNote: "Two-stage: the labour authority assesses the job, then Migri issues the permit; shortage roles are faster.",
    visaWeeks: [4, 12], officialSource: "https://migri.fi/en/",
    blurb: "High pay and growing labour shortages, with an English-friendly tech sector.",
  },
  {
    id: "norway", name: "Norway", slug: "norway", flag: "🇳🇴", inEU: false, schengen: true,
    currency: "Norwegian krone (NOK)", wageIndex: 2.0, netRatio: 0.72, accommodationEUR: 700, foodEUR: 400, otherEUR: 200,
    language: "Norwegian (English very widely spoken)", ieltsRequired: false,
    permitType: "Skilled worker residence permit",
    permitNote: "Needs a concrete offer meeting Norwegian pay norms and a skilled qualification; outside the EU but in Schengen.",
    visaWeeks: [4, 12], officialSource: "https://www.udi.no/en/",
    blurb: "Top wages and strong worker rights; very high costs, and outside the EU.",
  },
  {
    id: "iceland", name: "Iceland", slug: "iceland", flag: "🇮🇸", inEU: false, schengen: true,
    currency: "Icelandic króna (ISK)", wageIndex: 1.9, netRatio: 0.74, accommodationEUR: 700, foodEUR: 420, otherEUR: 200,
    language: "Icelandic (English very widely spoken)", ieltsRequired: false,
    permitType: "Work permit (shortage occupation)",
    permitNote: "Permits favour shortage occupations; the employer applies before you arrive.",
    visaWeeks: [6, 14], officialSource: "https://utl.is/index.php/en/",
    blurb: "High pay and a tiny labour market with strong construction and tourism demand.",
  },
  {
    id: "czechia", name: "Czechia", slug: "czechia", flag: "🇨🇿", inEU: true, schengen: true,
    currency: "Czech koruna (CZK)", wageIndex: 1.0, netRatio: 0.74, accommodationEUR: 400, foodEUR: 260, otherEUR: 140,
    language: "Czech", ieltsRequired: false,
    permitType: "Employee Card (work + residence)",
    permitNote: "The Employee Card is the standard route; Czechia runs government worker programmes for some countries.",
    visaWeeks: [8, 16], officialSource: "https://www.mvcr.cz/mvcren/",
    blurb: "A central manufacturing hub with steady demand for factory and trade workers.",
  },
  {
    id: "slovenia", name: "Slovenia", slug: "slovenia", flag: "🇸🇮", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.1, netRatio: 0.66, accommodationEUR: 420, foodEUR: 270, otherEUR: 150,
    language: "Slovenian", ieltsRequired: false,
    permitType: "Single permit (work + residence)",
    permitNote: "Employer-led single permit, with strong demand in construction, logistics and care.",
    visaWeeks: [6, 12], officialSource: "https://www.gov.si/en/topics/foreigners/",
    blurb: "Orderly and Alpine, with a good pay-to-cost balance and construction-heavy demand.",
  },
  {
    id: "estonia", name: "Estonia", slug: "estonia", flag: "🇪🇪", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.0, netRatio: 0.76, accommodationEUR: 420, foodEUR: 260, otherEUR: 140,
    language: "Estonian (English in tech)", ieltsRequired: false,
    permitType: "Long-stay (D) visa + registration of employment",
    permitNote: "An annual immigration quota applies; IT and e-residency-linked routes are well established.",
    visaWeeks: [4, 10], officialSource: "https://www.politsei.ee/en",
    blurb: "A digital-first Baltic state with IT and logistics demand and a simple tax system.",
  },
  {
    id: "latvia", name: "Latvia", slug: "latvia", flag: "🇱🇻", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 0.9, netRatio: 0.72, accommodationEUR: 350, foodEUR: 230, otherEUR: 130,
    language: "Latvian (Russian common)", ieltsRequired: false,
    permitType: "Work visa / temporary residence for employment",
    permitNote: "The employer registers the vacancy; shortage-occupation lists speed approval.",
    visaWeeks: [4, 12], officialSource: "https://www.pmlp.gov.lv/en",
    blurb: "An affordable Baltic option with transport, construction and manufacturing demand.",
  },
  {
    id: "greece", name: "Greece", slug: "greece", flag: "🇬🇷", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 0.95, netRatio: 0.72, accommodationEUR: 350, foodEUR: 250, otherEUR: 140,
    language: "Greek", ieltsRequired: false,
    permitType: "Work visa + residence permit (under quota)",
    permitNote: "Hiring runs through an annual quota (metáklisi) for many roles; agriculture and tourism dominate.",
    visaWeeks: [8, 20], officialSource: "https://migration.gov.gr/en/",
    blurb: "Seasonal tourism and farm demand; quota-gated, lower pay and low living costs.",
  },
  {
    id: "cyprus", name: "Cyprus", slug: "cyprus", flag: "🇨🇾", inEU: true, schengen: false,
    currency: "Euro (EUR)", wageIndex: 1.0, netRatio: 0.78, accommodationEUR: 450, foodEUR: 270, otherEUR: 150,
    language: "Greek (English very widely spoken)", ieltsRequired: false,
    permitType: "Temporary residence + employment permit",
    permitNote: "Employer-tied permit; tourism, construction and a growing tech sector hire foreign workers. (In the EU, not Schengen.)",
    visaWeeks: [6, 14], officialSource: "https://www.moi.gov.cy/",
    blurb: "An English-friendly island with tourism, construction and low income tax.",
  },
  {
    id: "malta", name: "Malta", slug: "malta", flag: "🇲🇹", inEU: true, schengen: true,
    currency: "Euro (EUR)", wageIndex: 1.05, netRatio: 0.76, accommodationEUR: 550, foodEUR: 290, otherEUR: 160,
    language: "Maltese / English", ieltsRequired: false,
    permitType: "Single permit (work + residence)",
    permitNote: "Identità issues the single permit; English is an official language and gaming/tourism hire heavily.",
    visaWeeks: [6, 12], officialSource: "https://identita.gov.mt/",
    blurb: "English-speaking with gaming and tourism jobs — sunny, but housing is tight.",
  },
  {
    id: "serbia", name: "Serbia", slug: "serbia", flag: "🇷🇸", inEU: false, schengen: false,
    currency: "Serbian dinar (RSD)", wageIndex: 0.7, netRatio: 0.74, accommodationEUR: 220, foodEUR: 180, otherEUR: 100,
    language: "Serbian", ieltsRequired: false,
    permitType: "Unified work + residence permit (non-EU)",
    permitNote: "Outside the EU/Schengen; a single residence-and-work permit is issued — a common stepping stone into Europe.",
    visaWeeks: [4, 10], officialSource: "https://www.mup.gov.rs/wps/portal/en",
    blurb: "Fast-growing and low-cost, with construction and manufacturing demand; a non-EU stepping stone.",
  },
  {
    id: "montenegro", name: "Montenegro", slug: "montenegro", flag: "🇲🇪", inEU: false, schengen: false,
    currency: "Euro (EUR)", wageIndex: 0.7, netRatio: 0.78, accommodationEUR: 250, foodEUR: 190, otherEUR: 100,
    language: "Montenegrin", ieltsRequired: false,
    permitType: "Work + residence permit (non-EU)",
    permitNote: "Tourism-driven seasonal demand; uses the euro despite being outside the EU.",
    visaWeeks: [4, 10], officialSource: "https://www.gov.me/en",
    blurb: "An Adriatic tourism economy that uses the euro — non-EU and low-cost.",
  },
  {
    id: "albania", name: "Albania", slug: "albania", flag: "🇦🇱", inEU: false, schengen: false,
    currency: "Albanian lek (ALL)", wageIndex: 0.6, netRatio: 0.78, accommodationEUR: 180, foodEUR: 150, otherEUR: 80,
    language: "Albanian", ieltsRequired: false,
    permitType: "Work permit / residence for employment (non-EU)",
    permitNote: "Low barrier; tourism, call-centres and construction. An entry point to European work, not an EU permit.",
    visaWeeks: [3, 8], officialSource: "https://e-albania.al/",
    blurb: "Among the cheapest on the list, with growing tourism and BPO work; non-EU.",
  },
  {
    id: "kosovo", name: "Kosovo", slug: "kosovo", flag: "🇽🇰", inEU: false, schengen: false,
    currency: "Euro (EUR)", wageIndex: 0.6, netRatio: 0.8, accommodationEUR: 180, foodEUR: 150, otherEUR: 80,
    language: "Albanian", ieltsRequired: false,
    permitType: "Work permit + residence (non-EU)",
    permitNote: "Uses the euro; a young workforce in construction and services. Not an EU/Schengen permit.",
    visaWeeks: [4, 10], officialSource: "https://mpb.rks-gov.net/",
    blurb: "Euro-using and very low-cost with a young economy; non-EU.",
  },
  {
    id: "bosnia-and-herzegovina", name: "Bosnia and Herzegovina", slug: "bosnia-and-herzegovina", flag: "🇧🇦", inEU: false, schengen: false,
    currency: "Convertible mark (BAM)", wageIndex: 0.65, netRatio: 0.76, accommodationEUR: 200, foodEUR: 160, otherEUR: 90,
    language: "Bosnian / Croatian / Serbian", ieltsRequired: false,
    permitType: "Work permit + temporary residence (non-EU)",
    permitNote: "Employer-led; manufacturing and construction demand. Outside the EU/Schengen.",
    visaWeeks: [4, 12], officialSource: "http://sps.gov.ba/?lang=en",
    blurb: "A low-cost Balkan manufacturing base; non-EU.",
  },
  {
    id: "moldova", name: "Moldova", slug: "moldova", flag: "🇲🇩", inEU: false, schengen: false,
    currency: "Moldovan leu (MDL)", wageIndex: 0.55, netRatio: 0.78, accommodationEUR: 180, foodEUR: 150, otherEUR: 80,
    language: "Romanian / Russian", ieltsRequired: false,
    permitType: "Work + residence permit (non-EU)",
    permitNote: "An EU candidate country; low wages, but a Romanian-speaking bridge toward the EU labour market.",
    visaWeeks: [4, 10], officialSource: "https://bma.gov.md/en",
    blurb: "The cheapest option and Romanian-speaking — an EU-candidate stepping stone.",
  },
  {
    id: "georgia", name: "Georgia", slug: "georgia", flag: "🇬🇪", inEU: false, schengen: false,
    currency: "Georgian lari (GEL)", wageIndex: 0.6, netRatio: 0.8, accommodationEUR: 200, foodEUR: 160, otherEUR: 90,
    language: "Georgian (English in tourism/IT)", ieltsRequired: false,
    permitType: "Work / residence permit (liberal rules, non-EU)",
    permitNote: "Famously easy entry and stay rules for many nationalities; a tourism and IT-nomad scene, not the EU.",
    visaWeeks: [2, 8], officialSource: "https://gov.ge/en",
    blurb: "Very liberal stay rules, low cost and nomad-friendly; not the EU.",
  },
  {
    id: "turkey", name: "Turkey", slug: "turkey", flag: "🇹🇷", inEU: false, schengen: false,
    currency: "Turkish lira (TRY)", wageIndex: 0.75, netRatio: 0.78, accommodationEUR: 300, foodEUR: 220, otherEUR: 120,
    language: "Turkish", ieltsRequired: false,
    permitType: "Work permit (Ministry of Labour)",
    permitNote: "The employer applies to the Ministry of Labour; large manufacturing, tourism and textile sectors hire foreign workers.",
    visaWeeks: [4, 12], officialSource: "https://www.csgb.gov.tr/en/",
    blurb: "A huge manufacturing and tourism economy bridging Europe and Asia; non-EU.",
  },
];

/* ── 10 occupations ────────────────────────────────────────────────────── */
export const JOBS: Job[] = [
  {
    id: "electrician", name: "Electrician", slug: "electrician", icon: "⚡", skillLevel: "Skilled",
    demand: "Very high", euAvgGrossEUR: 2000,
    certNote: "Trade certificate and proof of experience expected; some sites require local safety/wiring familiarisation.",
    langNote: "Basic English usually enough on international sites; local language helps for residential work.",
    summary: "One of Europe's most-listed shortage trades — installation, maintenance and industrial wiring across construction and manufacturing.",
  },
  {
    id: "welder", name: "Welder", slug: "welder", icon: "🔥", skillLevel: "Skilled",
    demand: "Very high", euAvgGrossEUR: 2000,
    certNote: "Process certificates (MIG/MAG, TIG, MMA) and a welding test on arrival are commonly required.",
    langNote: "Minimal language needed; certificates and the practical weld test matter most.",
    summary: "Persistent shortage in shipbuilding, construction and metal fabrication — certified TIG/MIG welders are in demand EU-wide.",
  },
  {
    id: "tiles-ceramic-worker", name: "Tiles & Ceramic Worker", slug: "tiles-ceramic-worker", icon: "🧱", skillLevel: "Skilled",
    demand: "High", euAvgGrossEUR: 1850,
    certNote: "Portfolio of finished work and on-site trial; formal certificate often optional.",
    langNote: "Low language barrier on construction crews.",
    summary: "Finishing trade tied to the construction boom — tiling, ceramic and stone fitting for residential and commercial projects.",
  },
  {
    id: "plumber", name: "Plumber", slug: "plumber", icon: "🔧", skillLevel: "Skilled",
    demand: "High", euAvgGrossEUR: 1950,
    certNote: "Trade qualification and experience; gas work usually needs local certification.",
    langNote: "Basic local language helps for residential and service calls.",
    summary: "Steady demand in construction and building services — installation and maintenance of water, heating and sanitation systems.",
  },
  {
    id: "carpenter", name: "Carpenter", slug: "carpenter", icon: "🪚", skillLevel: "Skilled",
    demand: "High", euAvgGrossEUR: 1900,
    certNote: "Experience and a practical trial; formwork/shuttering carpentry is especially sought.",
    langNote: "Low language barrier on site.",
    summary: "Formwork, framing and finishing carpentry — a reliable construction trade with broad demand.",
  },
  {
    id: "truck-driver", name: "Truck Driver", slug: "truck-driver", icon: "🚚", skillLevel: "Skilled",
    demand: "Very high", euAvgGrossEUR: 2100,
    certNote: "Category C/CE licence plus the Driver CPC (Code 95) and a tachograph card are required to drive in the EU.",
    langNote: "Functional English/local language for paperwork and routing.",
    summary: "Europe's largest single driver shortage — long-haul and regional logistics need C/CE drivers with the Driver CPC.",
  },
  {
    id: "cook-chef", name: "Cook / Chef", slug: "cook-chef", icon: "🍳", skillLevel: "Skilled",
    demand: "High", euAvgGrossEUR: 1800,
    certNote: "Experience in the relevant cuisine; food-hygiene certification often required locally.",
    langNote: "Kitchen-level local language or English; menu and ordering terms matter.",
    summary: "Hospitality shortage across tourism economies — line cooks and specialist (incl. South-Asian) chefs are widely recruited.",
  },
  {
    id: "hvac-technician", name: "HVAC Technician", slug: "hvac-technician", icon: "❄️", skillLevel: "Skilled",
    demand: "High", euAvgGrossEUR: 2050,
    certNote: "Refrigerant-handling (F-gas) certification is typically required for EU work.",
    langNote: "Basic local language for service work; English fine on projects.",
    summary: "Heating, ventilation and cooling — growing demand as buildings electrify and retrofit, F-gas certification expected.",
  },
  {
    id: "construction-worker", name: "Construction Worker", slug: "construction-worker", icon: "👷", skillLevel: "Semi-skilled",
    demand: "Very high", euAvgGrossEUR: 1700,
    certNote: "General site safety induction; no formal trade certificate for general labour.",
    langNote: "Low language barrier; safety instructions must be understood.",
    summary: "The broadest entry-level demand on this list — general site labour and helper roles across every market.",
  },
  {
    id: "machine-operator", name: "Machine Operator", slug: "machine-operator", icon: "🏭", skillLevel: "Semi-skilled",
    demand: "Very high", euAvgGrossEUR: 1850,
    certNote: "On-the-job training common; forklift/crane tickets raise pay.",
    langNote: "Basic local language for safety and instructions.",
    summary: "Factory and warehouse machine operation across the automotive and manufacturing belt — high-volume hiring.",
  },
];

/* Explicit indicative figures for well-known pairs (override the model).
   Add a row here whenever you VERIFY a real monthly gross (EUR). Key = `${country}:${job}`. */
const GROSS_OVERRIDES: Record<string, number> = {
  "poland:welder": 1950,
  "poland:truck-driver": 2050,
  "croatia:construction-worker": 1500,
  "romania:truck-driver": 1850,
  "italy:cook-chef": 2100,
  "portugal:construction-worker": 1700,
};

export interface SalaryEstimate {
  country: Country;
  job: Job;
  grossEUR: number;
  netEUR: number;
  hourlyBaseEUR: number;
  hourlyOtEUR: number;
  livingEUR: number; // food + other (accommodation excluded — often employer-provided)
  savingsHousedEUR: number; // employer provides accommodation
  savingsSelfEUR: number; // worker pays own accommodation
}

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function grossFor(country: Country, job: Job): number {
  const key = `${country.id}:${job.id}`;
  if (key in GROSS_OVERRIDES) return GROSS_OVERRIDES[key];
  return roundTo(job.euAvgGrossEUR * country.wageIndex, 50);
}

export function estimate(country: Country, job: Job): SalaryEstimate {
  const grossEUR = grossFor(country, job);
  const netEUR = roundTo(grossEUR * country.netRatio, 10);
  const hourlyBaseEUR = +(grossEUR / 173).toFixed(2);
  const hourlyOtEUR = +(hourlyBaseEUR * 1.5).toFixed(2);
  const livingEUR = country.foodEUR + country.otherEUR;
  const savingsHousedEUR = Math.max(0, netEUR - livingEUR);
  const savingsSelfEUR = Math.max(0, netEUR - country.accommodationEUR - livingEUR);
  return { country, job, grossEUR, netEUR, hourlyBaseEUR, hourlyOtEUR, livingEUR, savingsHousedEUR, savingsSelfEUR };
}

/* ── accessors ─────────────────────────────────────────────────────────── */
export function getCountry(slug: string): Country | undefined {
  return COUNTRIES.find((c) => c.slug === slug);
}
export function getJob(slug: string): Job | undefined {
  return JOBS.find((j) => j.slug === slug);
}

/** All occupations for one country, highest housed-savings first. */
export function salariesForCountry(country: Country): SalaryEstimate[] {
  return JOBS.map((j) => estimate(country, j)).sort((a, b) => b.savingsHousedEUR - a.savingsHousedEUR);
}

/** All countries for one occupation, highest housed-savings first. */
export function salariesForJob(job: Job): SalaryEstimate[] {
  return COUNTRIES.map((c) => estimate(c, job)).sort((a, b) => b.savingsHousedEUR - a.savingsHousedEUR);
}

/** Best savings combos across the whole grid (for the homepage highlight). */
export function topSavings(limit = 6): SalaryEstimate[] {
  const all: SalaryEstimate[] = [];
  for (const c of COUNTRIES) for (const j of JOBS) all.push(estimate(c, j));
  return all.sort((a, b) => b.savingsHousedEUR - a.savingsHousedEUR).slice(0, limit);
}

/* ── slim shapes passed to the client calculators (keep their bundles small) ─ */
export interface CountryLite {
  id: string;
  name: string;
  flag: string;
  currency: string;
  netRatio: number;
  accommodationEUR: number;
  foodEUR: number;
  otherEUR: number;
  wageIndex: number;
}
export interface JobLite {
  id: string;
  name: string;
  icon: string;
  euAvgGrossEUR: number;
}
export interface EstimateLite {
  countryId: string;
  jobId: string;
  grossEUR: number;
  netEUR: number;
  savingsHousedEUR: number;
  savingsSelfEUR: number;
}

export function countriesLite(): CountryLite[] {
  return COUNTRIES.map((c) => ({
    id: c.id, name: c.name, flag: c.flag, currency: c.currency, netRatio: c.netRatio,
    accommodationEUR: c.accommodationEUR, foodEUR: c.foodEUR, otherEUR: c.otherEUR, wageIndex: c.wageIndex,
  }));
}
export function jobsLite(): JobLite[] {
  return JOBS.map((j) => ({ id: j.id, name: j.name, icon: j.icon, euAvgGrossEUR: j.euAvgGrossEUR }));
}
export function estimatesLite(): EstimateLite[] {
  const out: EstimateLite[] = [];
  for (const c of COUNTRIES)
    for (const j of JOBS) {
      const e = estimate(c, j);
      out.push({ countryId: c.id, jobId: j.id, grossEUR: e.grossEUR, netEUR: e.netEUR, savingsHousedEUR: e.savingsHousedEUR, savingsSelfEUR: e.savingsSelfEUR });
    }
  return out;
}

/** EUR formatter used across the data pages. */
export function eur(n: number): string {
  return "€" + Math.round(n).toLocaleString("en-US");
}

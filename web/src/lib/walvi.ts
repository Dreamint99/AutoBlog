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

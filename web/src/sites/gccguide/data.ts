import type { Article } from "@/lib/types";

/* GCCGuide reference data. Facts are the stable, widely published ones
   (capital, currency peg, time zone, emergency numbers, official portals).
   Every page tells readers to confirm rules on the official site. */

export type Country = {
  slug: string;
  iso: string;
  name: string;
  short: string;
  capital: string;
  city: string; // main expat city (prayer times / weather)
  lat: number;
  lng: number;
  tz: string;
  utc: string;
  currency: string;
  code: string;
  perUsd: number; // local units per 1 USD
  pegged: boolean;
  calling: string;
  emergency: string;
  weekend: string;
  drive: string;
  accent: string;
  tagline: string;
  portals: { label: string; url: string }[];
  re: RegExp;
};

export const COUNTRIES: Country[] = [
  {
    slug: "qatar", iso: "qa", name: "Qatar", short: "QA", capital: "Doha", city: "Doha", lat: 25.2854, lng: 51.531,
    tz: "Asia/Qatar", utc: "UTC+3", currency: "Qatari riyal", code: "QAR", perUsd: 3.64, pegged: true,
    calling: "+974", emergency: "999", weekend: "Fri–Sat", drive: "Right-hand traffic", accent: "#8a1538",
    tagline: "Doha, Lusail and the pearl of the Gulf",
    portals: [
      { label: "Ministry of Interior (MOI)", url: "https://portal.moi.gov.qa" },
      { label: "Hukoomi — government services", url: "https://hukoomi.gov.qa" },
      { label: "Qatar Visa Center", url: "https://www.qatarvisacenter.com" },
    ],
    re: /\bqatar|doha|lusail|al wakrah|qid\b|metrash/i,
  },
  {
    slug: "uae", iso: "ae", name: "UAE", short: "AE", capital: "Abu Dhabi", city: "Dubai", lat: 25.2048, lng: 55.2708,
    tz: "Asia/Dubai", utc: "UTC+4", currency: "UAE dirham", code: "AED", perUsd: 3.6725, pegged: true,
    calling: "+971", emergency: "999 police · 998 ambulance", weekend: "Sat–Sun", drive: "Right-hand traffic", accent: "#00732f",
    tagline: "Dubai, Abu Dhabi, Sharjah and the Emirates",
    portals: [
      { label: "ICP — identity & residency", url: "https://icp.gov.ae" },
      { label: "GDRFA Dubai", url: "https://gdrfad.gov.ae" },
      { label: "RTA Dubai (driving)", url: "https://www.rta.ae" },
      { label: "u.ae — official portal", url: "https://u.ae" },
    ],
    re: /\buae\b|emirates|dubai|abu dhabi|sharjah|ajman|ras al khaimah|fujairah|emirates id/i,
  },
  {
    slug: "saudi-arabia", iso: "sa", name: "Saudi Arabia", short: "SA", capital: "Riyadh", city: "Riyadh", lat: 24.7136, lng: 46.6753,
    tz: "Asia/Riyadh", utc: "UTC+3", currency: "Saudi riyal", code: "SAR", perUsd: 3.75, pegged: true,
    calling: "+966", emergency: "911", weekend: "Fri–Sat", drive: "Right-hand traffic", accent: "#006c35",
    tagline: "Riyadh, Jeddah, Dammam and the Kingdom",
    portals: [
      { label: "Absher", url: "https://www.absher.sa" },
      { label: "MOFA visa services", url: "https://visa.mofa.gov.sa" },
      { label: "Saudi Visa platform", url: "https://ksavisa.sa" },
    ],
    re: /\bsaudi|ksa\b|riyadh|jeddah|dammam|makkah|mecca|madinah|medina|iqama|absher|umrah/i,
  },
  {
    slug: "kuwait", iso: "kw", name: "Kuwait", short: "KW", capital: "Kuwait City", city: "Kuwait City", lat: 29.3759, lng: 47.9774,
    tz: "Asia/Kuwait", utc: "UTC+3", currency: "Kuwaiti dinar", code: "KWD", perUsd: 0.307, pegged: false,
    calling: "+965", emergency: "112", weekend: "Fri–Sat", drive: "Right-hand traffic", accent: "#007a3d",
    tagline: "Kuwait City, Salmiya, Hawally and Farwaniya",
    portals: [
      { label: "Ministry of Interior", url: "https://www.moi.gov.kw" },
      { label: "PACI — civil ID", url: "https://www.paci.gov.kw" },
      { label: "Sahel government app", url: "https://sahel.gov.kw" },
    ],
    re: /\bkuwait|salmiya|hawally|farwaniya|civil id/i,
  },
  {
    slug: "oman", iso: "om", name: "Oman", short: "OM", capital: "Muscat", city: "Muscat", lat: 23.588, lng: 58.3829,
    tz: "Asia/Muscat", utc: "UTC+4", currency: "Omani rial", code: "OMR", perUsd: 0.3845, pegged: true,
    calling: "+968", emergency: "9999", weekend: "Fri–Sat", drive: "Right-hand traffic", accent: "#db161b",
    tagline: "Muscat, Salalah, Sohar and the mountains",
    portals: [
      { label: "Royal Oman Police (ROP)", url: "https://www.rop.gov.om" },
      { label: "Oman eVisa", url: "https://evisa.rop.gov.om" },
    ],
    re: /\boman|muscat|salalah|sohar|nizwa|\brop\b/i,
  },
  {
    slug: "bahrain", iso: "bh", name: "Bahrain", short: "BH", capital: "Manama", city: "Manama", lat: 26.2285, lng: 50.586,
    tz: "Asia/Bahrain", utc: "UTC+3", currency: "Bahraini dinar", code: "BHD", perUsd: 0.376, pegged: true,
    calling: "+973", emergency: "999", weekend: "Fri–Sat", drive: "Right-hand traffic", accent: "#ce1126",
    tagline: "Manama, Muharraq, Juffair and the islands",
    portals: [
      { label: "NPRA — nationality & residence", url: "https://www.npra.gov.bh" },
      { label: "Bahrain eVisa", url: "https://www.evisa.gov.bh" },
      { label: "bahrain.bh — eGovernment", url: "https://www.bahrain.bh" },
    ],
    re: /\bbahrain|manama|muharraq|juffair|\bcpr\b|npra/i,
  },
];

export const BY_SLUG = new Map(COUNTRIES.map((c) => [c.slug, c]));

export type Topic = { key: string; label: string; icon: string; blurb: string; re: RegExp };
export const TOPICS: Topic[] = [
  { key: "visa", label: "Visas & residency", icon: "🛂", blurb: "Visit, work and family visas, iqama/ID, renewals and status checks.", re: /\bvisa|iqama|residen|permit|sponsor|kafala|emirates id|civil id|\bqid\b|\bcpr\b|status check/i },
  { key: "jobs", label: "Jobs & salary", icon: "💼", blurb: "Salaries, hiring, contracts, gratuity and labour rights.", re: /\bjobs?\b|salary|salaries|hiring|career|gratuity|labou?r|end of service|wps\b|work hours/i },
  { key: "driving", label: "Driving & licence", icon: "🚗", blurb: "Licence conversion, tests, fines, Salik and car rules.", re: /driving|licen[cs]e|traffic|fines?\b|salik|car\b|cars\b|road|parking/i },
  { key: "laws", label: "Rules & laws", icon: "⚖️", blurb: "Laws expats must know, fines, Ramadan rules and etiquette.", re: /\blaws?\b|rules?\b|regulation|legal|banned|illegal|ramadan|etiquette|dress code|penalt/i },
  { key: "money", label: "Cost of living", icon: "💰", blurb: "Rent, bills, schools, banking and sending money home.", re: /cost of living|rent|bills?\b|school|bank|remit|exchange|price|budget|apartment|housing|save/i },
  { key: "travel", label: "Travel & things to do", icon: "🌴", blurb: "Weekends, brunches, beaches, desert trips and events.", re: /things to do|travel|weekend|brunch|beach|desert|trip|restaurant|events?\b|hidden gems|shopping|tour/i },
  { key: "news", label: "News & updates", icon: "📰", blurb: "New rules, holidays and changes that affect residents.", re: /\bnews|new rule|announc|update|holiday|eid|national day|2026 change/i },
];

export function countryOf(a: Pick<Article, "title" | "keyword" | "tags">): Country | undefined {
  const t = `${a.title} ${a.keyword || ""} ${(a.tags || []).join(" ")}`;
  return COUNTRIES.find((c) => c.re.test(t));
}

export function topicOf(a: Pick<Article, "title" | "keyword" | "tags">): Topic {
  const t = `${a.title} ${a.keyword || ""} ${(a.tags || []).join(" ")}`;
  return TOPICS.find((x) => x.re.test(t)) ?? TOPICS[5];
}

export const flag = (iso: string, w = 80) => `https://flagcdn.com/w${w}/${iso}.png`;

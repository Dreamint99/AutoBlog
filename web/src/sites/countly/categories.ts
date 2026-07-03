import type { Article } from "@/lib/types";

/** Countly content categories (the nav + topic landing pages). Pure data — no JSX —
 *  so it can be shared by the Home, the Category page and the topic route. */
export interface CnCategory {
  slug: string;
  label: string;
  blurb: string;
  /** lowercase substrings; an article belongs to the category if any is found in
   *  its title / tags / keyword / excerpt. */
  match: string[];
}

export const CN_CATEGORIES: CnCategory[] = [
  {
    slug: "ai-chatgpt",
    label: "AI & ChatGPT",
    blurb: "Users, adoption and AI-market numbers.",
    match: [" ai ", "chatgpt", "openai", "artificial intelligence", "machine learning",
      "llm", "generative", "gemini", "claude", "gpt"],
  },
  {
    slug: "social-media",
    label: "Social Media",
    blurb: "Platform users and time-spent by country.",
    match: ["social media", "facebook", "instagram", "tiktok", "youtube", "twitter",
      " x ", "whatsapp", "snapchat", "linkedin", "reddit", "telegram", "social network"],
  },
  {
    slug: "companies",
    label: "Companies",
    blurb: "Employees, stores, revenue and subscribers.",
    match: ["company", "companies", "revenue", "employees", "valuation", "market cap",
      "market value", "subscribers", "stores", "startup", "unicorn", "profit", "earnings"],
  },
  {
    slug: "internet",
    label: "Internet",
    blurb: "Connectivity, websites and ecommerce data.",
    match: ["internet", "website", "ecommerce", "e-commerce", "online shopping", "broadband",
      "connectivity", "mobile users", "smartphone", "app downloads", "web traffic"],
  },
  {
    slug: "countries",
    label: "Countries",
    blurb: "Digital and market data, country by country.",
    match: ["country", "countries", "population", "gdp", "by country", "per capita",
      "nation", "worldwide"],
  },
  {
    slug: "rankings",
    label: "Rankings",
    blurb: "Largest, fastest-growing and most valuable.",
    match: ["largest", "biggest", "top 10", "top 20", "ranking", "most ", "richest",
      "fastest-growing", "fastest growing", "leading", "highest", "world's", "best "],
  },
  {
    slug: "bangladesh-travel",
    label: "Visit Bangladesh",
    blurb: "Travel guides, beaches, hills and trips across Bangladesh.",
    match: ["bangladesh travel", "travel guide", "tour guide", "cox's bazar", "coxs bazar",
      "sylhet", "tanguar", "bandarban", "rajshahi", "kuakata", "sundarban", "sajek",
      "saint martin", "sea beach", "resorts in bangladesh", "resort in bangladesh",
      "star hotels in bangladesh", "5-star hotel"],
  },
];

export function getCategory(slug: string): CnCategory | undefined {
  return CN_CATEGORIES.find((c) => c.slug === slug);
}

function haystack(a: Article): string {
  return ` ${a.title} ${(a.tags || []).join(" ")} ${a.keyword || ""} ${a.excerpt || ""} `.toLowerCase();
}

export function matchCategory(a: Article, cat: CnCategory): boolean {
  const hay = haystack(a);
  return cat.match.some((m) => hay.includes(m));
}

export function articlesInCategory(articles: Article[], slug: string): Article[] {
  const cat = getCategory(slug);
  if (!cat) return [];
  return articles.filter((a) => matchCategory(a, cat));
}

/* ── Top 10 (dedicated, premium ranked page) ─────────────────────────────── */
const TOP10_MATCH = ["top 10", "top ten", "top-10", "10 best", "best 10", "top 100"];

export function isTop10(a: Article): boolean {
  const hay = haystack(a);
  return TOP10_MATCH.some((m) => hay.includes(m));
}

export function top10Articles(articles: Article[]): Article[] {
  return articles.filter(isTop10);
}

/** Pull the leading number out of a "Top 10 …" title for the rank badge. */
export function topNumber(title: string): string {
  const m = title.match(/top\s*(\d{1,3})/i) || title.match(/(\d{1,3})\s*best/i);
  return m ? m[1] : "10";
}


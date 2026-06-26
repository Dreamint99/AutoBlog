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

export interface Site {
  id: string;
  name: string;
  domain: string;
  tagline: string;
  niche: string;
  language: string;
  tone: string;
  audience: string;
  theme: string;
  default_word_count: number;
}

export interface FaqItem { q: string; a: string; }

export interface Article {
  id: string;
  site_id: string;
  title: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  excerpt: string;
  body_html: string;
  tags: string[];
  faq: FaqItem[];
  keyword: string;
  secondary_keywords: string[];
  image_url: string;
  schema: unknown;
  word_count: number;
  reading_time: number;
  status: string;
  is_mock: boolean;
  created_at: string;
}

export interface TocItem { id: string; text: string; level: number; }

/** A row in the InfKey `infkey_models` pricing database. */
export interface InfModel {
  id: string;
  provider: string;
  name: string;
  version: string | null;
  category: string; // llm | video | image | voice | embedding
  input_per_m: number | null;
  output_per_m: number | null;
  cached_input_per_m: number | null;
  unit_price: number | null;
  unit_label: string | null;
  max_context: number | null;
  max_output: number | null;
  latency_note: string | null;
  supports_vision: boolean;
  supports_audio: boolean;
  supports_functions: boolean;
  supports_structured: boolean;
  commercial_use: boolean;
  official_source: string | null;
  last_verified: string | null;
  sort: number;
  notes: string | null;
}

/** Props every per-site Home component receives. */
export interface SiteHomeProps {
  site: Site;
  articles: Article[];
}

/** Props every per-site Article component receives. body html is pre-processed
 *  (tables wrapped for mobile scroll, headings given ids); toc is derived from it. */
export interface SiteArticleProps {
  site: Site;
  article: Article;
  related: Article[];
  bodyHtml: string;
  toc: TocItem[];
  /** Evergreen high-value pages to surface for more pages/session (optional). */
  popular?: Article[];
}

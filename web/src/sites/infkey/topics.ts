import type { Article } from "@/lib/types";

/* InfKey content pillars — articles are routed by title/keyword/tags, so new
   trending posts ("best AI for doctors", "how to use Claude free") land in the
   right rail without manual tagging. Order matters: first match wins. */

export type Topic = { key: string; label: string; blurb: string; re: RegExp; not?: RegExp };

export const TOPICS: Topic[] = [
  { key: "prompts", label: "Prompt library", blurb: "Copy-paste prompts for viral photos, editing, study, work and video.", re: /\bprompts?\b/i, not: /\bapi\b|caching|tokens?\b|\bllm\b|cost/i },
  { key: "photo-video", label: "AI photo & video", blurb: "Edit photos, make images and videos with AI — free and paid tools.", re: /\bnano banana\b|\bai (photo|image|video|art|headshot)|image generator|video generator|photo edit|\bveo\b|\bsora\b|midjourney|\bkling\b/i, not: /\bapi\b|per (second|minute)|cost/i },
  { key: "best-ai-for", label: "Best AI for…", blurb: "The right AI tool for your job, class or business.", re: /\bbest ai\b|\bai (tools? )?for (students|doctors|teachers|lawyers|writers|marketers|designers|developers|business|nurses|accountants)|\bfor (students|doctors|teachers|lawyers)\b/i },
  { key: "how-to", label: "How-to & free use", blurb: "Step-by-step guides, free plans, limits and prompts.", re: /\bhow to\b|\bfree\b|\bprompts?\b|\bguide to using\b|\btutorial\b|\buse (chatgpt|claude|gemini|copilot|perplexity|grok)/i },
  { key: "deals", label: "Plans, prices & deals", blurb: "Subscriptions, discounts, student plans and free trials.", re: /\bcoupon|discount|promo|deal|plus price|pro price|subscription|worth it|student plan|free trial\b/i },
  { key: "compare", label: "AI vs AI", blurb: "Head-to-head comparisons that end with a clear verdict.", re: /\bvs\.?\b|versus|compared|comparison/i },
  { key: "api-cost", label: "AI API cost", blurb: "Verified API pricing, the math and the cheapest option.", re: /\bapi\b|\bllm\b|per (1m|million) tokens|pricing|cost/i },
];

export function topicOf(a: Pick<Article, "title" | "keyword" | "tags">): Topic {
  const text = `${a.title} ${a.keyword || ""} ${(a.tags || []).join(" ")}`;
  return TOPICS.find((t) => t.re.test(text) && !(t.not && t.not.test(text))) ?? TOPICS[TOPICS.length - 1];
}

export const PROFESSIONS: { k: string; e: string }[] = [
  { k: "Students", e: "🎓" },
  { k: "Doctors", e: "🩺" },
  { k: "Teachers", e: "📚" },
  { k: "Lawyers", e: "⚖️" },
  { k: "Developers", e: "💻" },
  { k: "Marketers", e: "📈" },
  { k: "Writers", e: "✍️" },
  { k: "Designers", e: "🎨" },
  { k: "Small business", e: "🏪" },
  { k: "Content creators", e: "🎬" },
  { k: "Nurses", e: "💉" },
  { k: "Researchers", e: "🔬" },
];

export const TOOLS: { name: string; by: string; color: string; q: string }[] = [
  { name: "ChatGPT", by: "OpenAI", color: "#10a37f", q: "chatgpt" },
  { name: "Claude", by: "Anthropic", color: "#d97757", q: "claude" },
  { name: "Gemini", by: "Google", color: "#4f8ef7", q: "gemini" },
  { name: "Copilot", by: "Microsoft", color: "#7f5af0", q: "copilot" },
  { name: "Perplexity", by: "Perplexity AI", color: "#20b8cd", q: "perplexity" },
  { name: "Grok", by: "xAI", color: "#e5e7eb", q: "grok" },
  { name: "DeepSeek", by: "DeepSeek", color: "#4d6bfe", q: "deepseek" },
  { name: "Meta AI", by: "Meta", color: "#0866ff", q: "meta ai" },
];

/** Best existing article for a query, by shared meaningful words (title/keyword). */
export function bestMatch(articles: Article[], words: string[]): Article | undefined {
  const want = words.map((w) => w.toLowerCase());
  let best: Article | undefined;
  let score = 0;
  for (const a of articles) {
    const t = `${a.title} ${a.keyword || ""}`.toLowerCase();
    const s = want.filter((w) => t.includes(w)).length;
    if (s > score) {
      best = a;
      score = s;
    }
  }
  return score >= want.length ? best : undefined;
}

/* Prompt library tiles — the searches people make most ("best prompt for …"). */
export const PROMPT_PACKS: { k: string; e: string; q: string }[] = [
  { k: "Viral AI photo", e: "🔥", q: "viral ai photo prompt" },
  { k: "Photo editing", e: "🪄", q: "prompt for photo editing" },
  { k: "Gemini / Nano Banana", e: "🍌", q: "gemini photo editing prompt" },
  { k: "Couple photo", e: "💞", q: "couple photo prompt" },
  { k: "Professional headshot", e: "👔", q: "professional photo prompt" },
  { k: "Passport size photo", e: "🪪", q: "passport size photo prompt" },
  { k: "Viral AI video", e: "🎥", q: "viral ai video prompt" },
  { k: "Study notes", e: "📝", q: "chatgpt prompt for study" },
  { k: "Make money with AI", e: "💸", q: "how to use ai to make money" },
  { k: "Marketing & ads", e: "📣", q: "chatgpt prompt for marketing" },
];

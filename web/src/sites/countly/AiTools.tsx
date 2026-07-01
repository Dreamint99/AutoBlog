import "./theme.css";
import { fontVars } from "./fonts";
import type { Site } from "@/lib/types";
import type { AiTool } from "@/lib/data";
import { CnHeader, SiteFooter, fmtDate } from "./Home";
import AiToolsBrowser, { type CatMeta } from "./AiToolsBrowser";

export const AI_FAQS: { q: string; a: string }[] = [
  {
    q: "What are the best AI tools in 2026?",
    a: "The best AI tools depend on the job. For chat: ChatGPT, Claude and Google Gemini lead. For coding: Cursor, Claude Code and GitHub Copilot. For images: Midjourney, Flux and Stable Diffusion. For video: Runway, Sora and Kling. This page ranks 140+ tools across 12 categories and refreshes their live popularity daily.",
  },
  {
    q: "What is the best AI tool for coding?",
    a: "Cursor is the most popular AI-native code editor, while Claude Code and GitHub Copilot are the leading terminal and IDE assistants. Open-source options like Cline, Aider and OpenAI Codex CLI let you bring your own model. See the 'Best AI Tools for Coding' section for the full ranking with live GitHub momentum.",
  },
  {
    q: "What are the best free and open-source AI tools?",
    a: "Many top tools are free or open-source: Ollama and vLLM for running models locally, ComfyUI and Stable Diffusion for images, LibreChat for chat, n8n and Flowise for agents, and Whisper for transcription. Filter this directory by category or search 'open source' to find them — each shows its live GitHub star count.",
  },
  {
    q: "How is this Best AI Tools list ranked and updated?",
    a: "Tools are ordered editorially (best-first) by real-world adoption and quality within each category. The live 'count' on every open-source tool is its real GitHub star total, pulled daily from the GitHub API, with the day-over-day growth shown as ▲ / ▼. Closed tools show a clearly-labelled public user estimate — never a fabricated figure.",
  },
  {
    q: "What is the best AI chatbot?",
    a: "ChatGPT has the largest user base (900M+ weekly), followed by Google Gemini, Microsoft Copilot, Meta AI and Claude. Perplexity is the best AI answer engine for cited, real-time web answers. Compare them all in the 'Best AI Chatbots & Assistants' section.",
  },
];

function buildCats(tools: AiTool[]): CatMeta[] {
  const map = new Map<string, CatMeta>();
  for (const t of tools) {
    if (!t.url_ok) continue;
    if (!map.has(t.category_key)) {
      map.set(t.category_key, {
        key: t.category_key,
        name: t.category,
        heading: t.heading_keyword || `Best ${t.category}`,
        blurb: t.category_blurb || "",
        count: 0,
      });
    }
    map.get(t.category_key)!.count++;
  }
  return Array.from(map.values());
}

export default function AiTools({ site, tools }: { site: Site; tools: AiTool[] }) {
  const live = tools.filter((t) => t.url_ok);
  const categories = buildCats(live);
  const tracked = live.filter((t) => t.github_repo && t.stars > 0).length;
  const year = new Date().getFullYear();
  const latest = live.reduce((m, t) => (t.updated_at > m ? t.updated_at : m), "");

  return (
    <div className={`cn-root ${fontVars}`}>
      <CnHeader site={site} />

      {/* ── HERO ── */}
      <section className="cn-ai-hero">
        <div className="cn-wrap">
          <span className="cn-ai-eyebrow">
            <span className="cn-ai-dot" aria-hidden="true" /> Updated daily · {year}
          </span>
          <h1>
            Best <em>AI Tools</em>, ranked &amp; counted
          </h1>
          <p>
            A living directory of {live.length}+ AI tools across {categories.length} categories — chat,
            coding, image, video, audio, writing, agents and more. Every open-source tool shows its{" "}
            <b>live GitHub star count</b> and daily growth, so you can see what the world is actually
            adopting — and what&apos;s cooling off.
          </p>
          <div className="cn-ai-herostats">
            <span>
              <b>{live.length}+</b>
              AI tools
            </span>
            <span>
              <b>{categories.length}</b>
              categories
            </span>
            <span>
              <b>{tracked}</b>
              live-counted (GitHub)
            </span>
            <span>
              <b>{latest ? fmtDate(latest) : "Daily"}</b>
              last refreshed
            </span>
          </div>
        </div>
      </section>

      {/* ── Interactive directory (search + filter + cards) ── */}
      <AiToolsBrowser tools={live} categories={categories} />

      {/* ── Methodology + FAQ (SEO) ── */}
      <section className="cn-ai-method">
        <div className="cn-wrap">
          <h2>How we rank the best AI tools</h2>
          <p>
            This directory is compiled and maintained by Countly. Within each category, tools are ordered
            best-first by real-world adoption, capability and momentum. The <b>count</b> shown on each
            card is a real signal, not marketing spin: for open-source tools it is the live number of
            GitHub stars, pulled from the GitHub API every day, with the day-over-day change shown as an
            up (▲) or down (▼) arrow. Closed, proprietary tools have no free public usage API, so they
            display a clearly-labelled <b>estimate</b> of publicly-reported scale — we never invent a
            number. Outbound links are checked automatically and dead links are hidden.
          </p>

          <h2>Frequently asked questions</h2>
          <div className="cn-ai-faq">
            {AI_FAQS.map((f) => (
              <details className="cn-ai-faq-item" key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}

// countly-generate — serverless daily statistics-article generator for Countly.
//
// Runs entirely in Supabase (no local PC). pg_cron pings this every ~30 min;
// a state row (countly_autogen_state) self-paces it to a daily target at random
// gaps. One DeepSeek call writes a full, SOURCED SEO statistics article, a free
// Pollinations URL is the AI feature image, dedup is enforced against existing
// titles/keywords, then it publishes to `articles` and pings IndexNow.
//
// Honesty contract (this niche is statistics — fabricated numbers are the #1
// failure mode): the playbook forces the model to lead with a direct figure,
// build a real data table, LABEL estimates vs official figures, avoid false
// precision, add a Methodology note + source types, and date everything.
//
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto), DEEPSEEK_API_KEY (secret).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
const INDEXNOW_KEY = "9f2c7a1be4d05836c1a9e7402d6b8f51";

const SITE = {
  id: "countly",
  name: "Countly",
  domain: "countly.net",
  niche:
    "Global statistics, rankings and data: AI and ChatGPT usage, social media users by country, internet and ecommerce data, global company stats (employees, stores, revenue, subscribers), country digital data, and market rankings",
  audience:
    "researchers, journalists, marketers, students, analysts and the data-curious looking for quick, sourced statistics about technology, AI, social media, companies, countries and global markets",
  tone:
    "data-journalist voice; open with a direct numeric answer, always include a real data table and a short historical-growth note, distinguish official figures from estimates, and state that statistics change and must be verified",
};

const PGRST = `${SUPABASE_URL}/rest/v1`;
const H = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

async function sel(path: string): Promise<any[]> {
  const r = await fetch(`${PGRST}/${path}`, { headers: H });
  return r.ok ? await r.json() : [];
}
async function patchState(patch: Record<string, unknown>) {
  await fetch(`${PGRST}/countly_autogen_state?id=eq.1`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

function slugify(s: string): string {
  return (
    s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9\s-]/g, "").trim()
      .replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60).replace(/^-|-$/g, "") || "post"
  );
}
function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
}
function parseJSON(txt: string): any {
  try {
    return JSON.parse(txt);
  } catch {
    const m = txt.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("bad LLM JSON");
  }
}
function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function deepseek(system: string, user: string, key: string, maxTokens = 8000): Promise<string> {
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.6,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`deepseek ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

const PLAYBOOK = `You write in-depth, people-first, original STATISTICS reports that rank on Google AND get cited by AI answer engines (AI Overviews, ChatGPT, Perplexity).

LENGTH: this is a LONG-FORM data report — write 1500-2200 words of real substance. Do NOT write a short article; thin posts are rejected.

REQUIRED STRUCTURE (use these as H2/H3 sections, in order):
1. A 2-3 sentence DIRECT numeric answer in the first 50 words ("As of {year}, approximately X ..."). Put the primary keyword here and in one H2.
2. "<subject> by the numbers ({year})" — the headline figures, with context.
3. A year-by-year TREND table (e.g. 2019→{year}) inside <table><thead>…</thead><tbody>…</tbody></table>.
4. A by-country / by-region / by-segment BREAKDOWN table (a SECOND distinct <table>).
5. "Historical growth" — 1-2 paragraphs on how the number changed and why.
6. "What's driving the change" — drivers, context, notable shifts.
7. "Methodology" — 2-3 sentences: what is official vs estimated and how figures were compiled.
Then key takeaways + an FAQ are appended automatically.

You MUST include TWO real <table> elements. Clean SEMANTIC HTML only: <h2> <h3> <p> <ul> <ol> <li> <strong> <em> <blockquote> <table> <thead> <tbody> <tr> <th> <td>. NO <h1>, NO markdown, NO code fences.

HONESTY RULES (critical — this is a statistics publication):
- DISTINGUISH official/reported figures from estimates. When a number is an estimate, say "estimated" or give a RANGE (e.g. "800-900 million"). Do NOT invent exact precise figures you cannot reasonably source.
- Prefer round, defensible numbers over false precision. If unsure, give a range or say the exact figure is not publicly disclosed.
- Cite SOURCE TYPES (company filings/annual reports, government & regulator databases, industry reports such as DataReportal) — name the type, do not fabricate exact URLs or quotes.
- State "Last updated: {month} {year}" and note that statistics change and should be re-verified before citing.

VOICE: human, authoritative, specific. No fluff, no keyword stuffing.`;

const CATEGORY_HINTS: Record<string, string> = {
  ai: 'the AI category — ChatGPT/Gemini/Claude users, AI adoption by country, AI market size, most-used AI tools',
  social: 'the SOCIAL MEDIA category — platform users by country, time spent, most-followed accounts (pick a platform/angle NOT already covered)',
  companies: 'the GLOBAL COMPANIES category — employees, stores/locations, revenue, subscribers (e.g. McDonald\'s restaurants, Amazon employees, Starbucks stores, Netflix subscribers)',
  internet: 'the INTERNET category — internet users by country, number of websites, most-visited sites, ecommerce penetration, mobile vs desktop',
  countries: 'the COUNTRY DATA category — a country or region\'s digital/economic statistics, or "X by country" rankings',
  rankings: 'the RANKINGS category — largest/most-valuable/fastest-growing lists (largest companies, most valuable brands, biggest ecommerce markets)',
};

async function generateArticle(
  avoidTitles: string[],
  key: string,
  year: number,
  monthYear: string,
  category?: string,
) {
  const system = `You are a data-journalism content engine for ${SITE.name} (${SITE.niche}). Audience: ${SITE.audience}. Tone: ${SITE.tone}.\n\n${PLAYBOOK}\n\nCurrent period: ${monthYear}. Use ${year} as "now". Return ONLY JSON.`;
  const avoid = avoidTitles.slice(0, 120).join(" | ");
  const hint = category && CATEGORY_HINTS[category] ? CATEGORY_HINTS[category] : "";
  const focus = hint
    ? `Choose your topic from ${hint}.`
    : `Pick ONE fresh, specific, search-driven STATISTICS topic in this niche that real people Google (e.g. "how many people use ChatGPT", "TikTok users by country", "how many McDonald's restaurants", "internet users by country", "largest ecommerce markets").`;
  const user = `${focus}
Write a complete, sourced, LONG-FORM report (1500-2200 words, two data tables).
The topic MUST be clearly DIFFERENT from every existing title/keyword below — no duplicates, no near-rephrasings, cover a NEW subtopic/angle:
${avoid}

Return JSON:
{
 "title": "SEO title <=60 chars with the primary keyword (a real question or 'X by country/year' framing)",
 "primary_keyword": "the main keyword people search",
 "secondary_keywords": ["6-10 long-tail/semantic keywords"],
 "meta_title": "<=60 chars",
 "meta_description": "<=155 chars, compelling, includes primary keyword and a headline number",
 "excerpt": "<=155 char summary that leads with the key figure",
 "tags": ["5-8 tags"],
 "image_prompt": "a vivid, concrete prompt for an AI image generator — a clean data/infographic or thematic scene, NO text or numbers in the image",
 "body_html": "the full long-form article in semantic HTML following the REQUIRED STRUCTURE, with TWO real data <table> elements (a year-by-year trend table and a by-country/segment table)",
 "key_takeaways": ["3-5 bullet takeaways, each with a number"],
 "faq": [{"q":"...","a":"..."}]
}`;
  return parseJSON(await deepseek(system, user, key));
}

function assembleBody(a: any): string {
  let body = String(a.body_html || "");
  if (Array.isArray(a.key_takeaways) && a.key_takeaways.length) {
    body += `\n<div class="key-takeaways"><h2>Key takeaways</h2><ul>` +
      a.key_takeaways.map((k: string) => `<li>${esc(k)}</li>`).join("") + `</ul></div>`;
  }
  if (Array.isArray(a.faq) && a.faq.length) {
    body += `\n<section class="faq"><h2>Frequently asked questions</h2>` +
      a.faq.map((f: any) => `<div class="faq-item"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join("") +
      `</section>`;
  }
  return body;
}

function buildSchema(a: any, slug: string, nowISO: string) {
  const url = `https://${SITE.domain}/${slug}`;
  const out: any[] = [{
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.meta_description || a.excerpt,
    datePublished: nowISO,
    dateModified: nowISO,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
  }];
  if (Array.isArray(a.faq) && a.faq.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: a.faq.map((f: any) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  return out;
}

async function uniqueSlug(base: string, idShort: string): Promise<string> {
  const existing = await sel(`articles?site_id=eq.${SITE.id}&slug=like.${base}*&select=slug`);
  const set = new Set(existing.map((e: any) => e.slug));
  if (!set.has(base)) return base;
  let s = `${base}-${idShort.slice(0, 4)}`;
  let i = 2;
  while (set.has(s)) s = `${base}-${i++}`;
  return s;
}

// Download the on-demand AI image once and store it permanently in Supabase
// Storage, so cards never break on Pollinations cold-starts. Falls back to the
// source URL if anything fails.
async function storeImage(id: string, srcUrl: string): Promise<string> {
  try {
    const ir = await fetch(srcUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!ir.ok) return srcUrl;
    if (!(ir.headers.get("Content-Type") || "").startsWith("image")) return srcUrl;
    const buf = new Uint8Array(await ir.arrayBuffer());
    if (buf.length < 1000) return srcUrl;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/article-images/${id}.jpg`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
      },
      body: buf,
    });
    if (up.ok) return `${SUPABASE_URL}/storage/v1/object/public/article-images/${id}.jpg`;
  } catch (_e) { /* keep source url */ }
  return srcUrl;
}

async function indexNow(url: string) {
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: SITE.domain,
        key: INDEXNOW_KEY,
        keyLocation: `https://${SITE.domain}/${INDEXNOW_KEY}.txt`,
        urlList: [url],
      }),
    });
  } catch (_e) { /* non-fatal */ }
}

Deno.serve(async (req: Request) => {
  const now = new Date();
  let category: string | undefined;
  try {
    const b = await req.json().catch(() => ({}));
    if (b && typeof b.category === "string") category = b.category.toLowerCase();
  } catch (_e) { /* no body */ }
  try {
    const st = (await sel("countly_autogen_state?id=eq.1&select=*"))[0];
    if (!st) return json({ error: "no state row" }, 500);
    if (!st.enabled) return json({ skipped: "disabled" });

    const today = now.toISOString().slice(0, 10);
    let count = st.count_today;
    if (st.day !== today) {
      count = 0;
      await patchState({ day: today, count_today: 0 });
    }
    if (st.day === today && now < new Date(st.next_due_at)) {
      return json({ skipped: "not due", next_due_at: st.next_due_at });
    }
    if (count >= st.daily_target) {
      return json({ skipped: "daily target reached", count, target: st.daily_target });
    }
    const dsKey = DEEPSEEK_KEY || st.deepseek_key || "";
    if (!dsKey) return json({ error: "no DeepSeek key (env or state)" }, 500);

    // dedup source
    const rows = await sel(
      `articles?site_id=eq.${SITE.id}&select=title,keyword&order=created_at.desc&limit=160`,
    );
    const avoid = rows.flatMap((r: any) => [r.title, r.keyword]).filter(Boolean);

    const year = now.getUTCFullYear();
    const monthYear = now.toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" });
    const a = await generateArticle(avoid, dsKey, year, monthYear, category);
    if (!a?.title || !a?.body_html) throw new Error("LLM returned no title/body");

    const nowISO = now.toISOString();
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const slug = await uniqueSlug(slugify(a.title), id);
    const body = assembleBody(a);
    const seed = Math.floor(Math.random() * 1_000_000);
    const imgPrompt = String(a.image_prompt || a.title);
    const poll_url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1200&height=630&nologo=true&seed=${seed}`;
    const image_url = await storeImage(id, poll_url);
    const wc = wordCount(body);

    const row = {
      id,
      site_id: SITE.id,
      title: a.title,
      slug,
      meta_title: a.meta_title || a.title,
      meta_description: a.meta_description || a.excerpt || "",
      excerpt: a.excerpt || "",
      body_html: body,
      tags: a.tags || [],
      faq: a.faq || [],
      keyword: a.primary_keyword || a.title,
      secondary_keywords: a.secondary_keywords || [],
      image_url,
      schema: buildSchema(a, slug, nowISO),
      word_count: wc,
      reading_time: Math.max(1, Math.round(wc / 200)),
      status: "published",
      is_mock: false,
      created_at: nowISO,
    };

    const ins = await fetch(`${PGRST}/articles`, {
      method: "POST",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (!ins.ok) throw new Error(`insert ${ins.status}: ${(await ins.text()).slice(0, 200)}`);

    await indexNow(`https://${SITE.domain}/${slug}`);

    const gap = st.gap_min_sec + Math.floor(Math.random() * Math.max(1, st.gap_max_sec - st.gap_min_sec));
    await patchState({
      day: today,
      count_today: count + 1,
      total_made: (st.total_made || 0) + 1,
      last_title: a.title,
      last_run_at: nowISO,
      last_status: "ok",
      next_due_at: new Date(now.getTime() + gap * 1000).toISOString(),
    });

    return json({ ok: true, title: a.title, slug, words: wc, count: count + 1, next_in_min: Math.round(gap / 60) });
  } catch (e) {
    // soft-fail: retry in ~10 min, do not consume a daily slot
    await patchState({
      last_status: `err: ${String(e).slice(0, 180)}`,
      last_run_at: now.toISOString(),
      next_due_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    });
    return json({ error: String(e) }, 500);
  }
});

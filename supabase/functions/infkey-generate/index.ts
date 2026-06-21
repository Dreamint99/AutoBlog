// infkey-generate — serverless daily SEO article generator for InfKey.
//
// Runs entirely in Supabase (no local PC). pg_cron pings this every ~30 min;
// a state row (infkey_autogen_state) self-paces it to 10–12 articles/day at
// random 60–120 min gaps. One DeepSeek call writes a full SEO article, a free
// Pollinations URL is the AI feature image, dedup is enforced against existing
// titles/keywords, then it publishes to `articles` and pings IndexNow.
//
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto), DEEPSEEK_API_KEY (secret).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
const INDEXNOW_KEY = "7cb730425493bd6250188aee25110d83";

const SITE = {
  id: "infkey",
  name: "InfKey",
  domain: "infkey.com",
  niche:
    "AI API cost, LLM & model pricing, cost calculators, model comparisons, AI video/image/voice API pricing, automation cost, RAG & embedding cost, AI cost optimization",
  audience:
    "AI product builders, founders, developers, indie hackers and businesses estimating and optimizing AI/LLM API spend",
  tone:
    "data-driven cost analyst; lead with the direct answer in the first 50 words, show the math, give a clear cheapest-vs-best verdict, and note that AI prices change and must be re-verified",
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
  await fetch(`${PGRST}/infkey_autogen_state?id=eq.1`, {
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
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`deepseek ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

const PLAYBOOK = `You write helpful, people-first, original SEO articles that rank on Google AND get cited by AI answer engines (AI Overviews, ChatGPT, Perplexity).
Rules: open with a 2-3 sentence DIRECT answer (first 50 words). Put the primary keyword in the first paragraph and in one H2. Use clean SEMANTIC HTML only: <h2> <h3> <p> <ul> <ol> <li> <strong> <em> <blockquote> <table> <thead> <tbody> <tr> <th> <td>. NO <h1>, NO markdown. Include at least one real data/comparison <table>. Be specific with numbers, give a clear "cheapest / best quality / best for high volume" verdict, and state that AI prices change and must be re-verified. Human voice, no fluff, no keyword stuffing. Target ~1700-2100 words.`;

async function generateArticle(avoidTitles: string[], key: string) {
  const system = `You are an SEO content engine for ${SITE.name} (${SITE.niche}). Audience: ${SITE.audience}. Tone: ${SITE.tone}.\n\n${PLAYBOOK}\n\nReturn ONLY JSON.`;
  const avoid = avoidTitles.slice(0, 120).join(" | ");
  const user = `Pick ONE fresh, specific, search-driven topic in this niche that real people Google, and write a complete long article.
The topic MUST be clearly DIFFERENT from every existing title/keyword below — no duplicates, no near-rephrasings, cover a NEW subtopic/angle:
${avoid}

Return JSON:
{
 "title": "SEO title <=60 chars with the primary keyword",
 "primary_keyword": "the main keyword people search",
 "secondary_keywords": ["6-10 long-tail/semantic keywords"],
 "meta_title": "<=60 chars",
 "meta_description": "<=155 chars, compelling, includes primary keyword",
 "excerpt": "<=155 char summary",
 "tags": ["5-8 tags"],
 "image_prompt": "a vivid, concrete prompt for an AI image generator that fits the article (no text in image)",
 "body_html": "the full article in semantic HTML with a quick-answer opener and at least one comparison <table>",
 "key_takeaways": ["3-5 bullet takeaways"],
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

Deno.serve(async (_req: Request) => {
  const now = new Date();
  try {
    const st = (await sel("infkey_autogen_state?id=eq.1&select=*"))[0];
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

    const a = await generateArticle(avoid, dsKey);
    if (!a?.title || !a?.body_html) throw new Error("LLM returned no title/body");

    const nowISO = now.toISOString();
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const slug = await uniqueSlug(slugify(a.title), id);
    const body = assembleBody(a);
    const seed = Math.floor(Math.random() * 1_000_000);
    const imgPrompt = String(a.image_prompt || a.title);
    const image_url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=1200&height=630&nologo=true&seed=${seed}`;
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

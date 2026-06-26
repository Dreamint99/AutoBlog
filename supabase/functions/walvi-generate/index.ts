// walvi-generate — serverless daily Europe-work-permit article generator for Walvi.
//
// Runs entirely in Supabase (no local PC, no GitHub Actions). pg_cron pings this
// every ~30 min; a state row (walvi_autogen_state) self-paces it to a daily
// target at random gaps. One DeepSeek call writes a full, English, SEO work-
// permit / salary / visa guide, a free Pollinations URL is the AI feature image,
// dedup is enforced against existing titles/keywords, then it publishes to
// `articles` and pings IndexNow (Bing/Yandex).
//
// Honesty contract: salary/cost/savings are INDICATIVE ESTIMATES (label + ranges,
// never official quotes); visa rules change → "confirm with the official source";
// warn about recruitment scams; ALWAYS English even for a Bangladeshi audience.
//
// Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto), DEEPSEEK_API_KEY (secret
// or from the state row's deepseek_key column).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEEPSEEK_KEY = Deno.env.get("DEEPSEEK_API_KEY") ?? "";
const INDEXNOW_KEY = "7cb730425493bd6250188aee25110d83";

const SITE = {
  id: "walvi",
  name: "Walvi",
  domain: "walvi.io",
  niche:
    "Europe work and skilled-trade jobs, salaries by country and occupation, cost of living and realistic monthly savings, work permits and work visas, requirements and documents, and relocation for foreign workers moving to Europe from ANYWHERE in the world — South Asia, the Gulf, Africa, Southeast Asia, the Balkans and beyond",
  audience:
    "skilled and semi-skilled workers WORLDWIDE (Bangladesh, Nepal, India, Pakistan, Sri Lanka, the Philippines, Indonesia, the Gulf, Egypt, North & West Africa, the Balkans and elsewhere) looking for jobs and work permits in Europe, plus their families and recruiters",
  tone:
    "first-hand Europe-recruitment insider crossed with a data analyst; lead with the direct answer, show indicative salary/cost/savings, mark estimates vs official figures, link the official source, date everything, and warn about recruitment scams",
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
  await fetch(`${PGRST}/walvi_autogen_state?id=eq.1`, {
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

const PLAYBOOK =
  `You write in-depth, people-first, original guides for workers MOVING TO EUROPE FOR WORK that rank on Google AND get cited by AI answer engines (AI Overviews, ChatGPT, Perplexity).

LENGTH: 1300-1900 words of real, specific substance. No thin posts.

REQUIRED STRUCTURE (use as H2/H3, in order):
1. A 2-3 sentence DIRECT answer in the first 50 words (e.g. "To get a <country> work permit from <origin>, you first need a job offer; the employer applies for the permit, then you apply for the national (D) visa. Processing is roughly X weeks."). Put the primary keyword here and in one H2.
2. "Who can apply / requirements" — eligibility, documents, certificates, language.
3. A numbered step-by-step PROCESS section.
4. A "Salary, cost & savings" section with a real <table> (monthly gross, estimated net, living cost, realistic monthly savings) AND/OR a fees+timeline table — clearly labelled INDICATIVE ESTIMATES.
5. "Processing time & what to expect."
6. "Scams & red flags" — how to spot fake job offers; never pay a fee for an unverified offer.
7. "Sources & how to verify" — point to the official government/embassy site by name.
Then key takeaways + FAQ are appended automatically.

Include at least ONE real <table>. Clean SEMANTIC HTML only: <h2> <h3> <p> <ul> <ol> <li> <strong> <em> <blockquote> <table> <thead> <tbody> <tr> <th> <td>. NO <h1>, NO markdown, NO code fences.

HONESTY RULES (critical):
- Salary, cost and savings figures are INDICATIVE ESTIMATES — label them and give RANGES, never false precision or guaranteed/official quotes.
- Visa & work-permit rules change — tell readers to confirm with the official government source or the embassy, and add "Last verified: {monthYear}".
- Warn clearly about recruitment scams and fake job offers; never advise paying fees to unverified agents.
- LANGUAGE: write the ENTIRE article in ENGLISH, even though many readers are from Bangladesh / South Asia / the Gulf. Do NOT switch to Bengali or any other language.

VOICE: first-hand, practical, specific. No fluff, no keyword stuffing.`;

const CATEGORY_HINTS: Record<string, string> = {
  permit:
    'an "<origin> to <European country> work permit/visa" guide — pick an origin (Bangladesh, Qatar, Saudi Arabia, UAE, India, Nepal, Egypt) and a European destination (Poland, Croatia, Romania, Serbia, Portugal, Lithuania, Hungary, Slovakia, Malta, Germany) NOT already covered',
  salary:
    'a salary guide — "<trade> salary in <European country>" (electrician, welder, truck driver, cook/chef, construction worker, plumber, carpenter, HVAC technician, machine operator, tiles/ceramic worker)',
  cost:
    'a cost-of-living / savings guide — "living cost in <country>" or "how much can a worker save in <country>"',
  scam:
    'a scams/verification guide — spotting fake European job offers, verifying an employer or recruiter, recruitment-fee red flags, what a real work contract looks like',
  compare:
    'a comparison — "<country A> vs <country B> for foreign workers" on salary, cost of living, savings and permit route',
  visa:
    'a visa-process guide — documents checklist, processing time, or one step (medical, biometrics, work-contract attestation, BMET/clearance) for a European work visa',
};

// Worldwide variety pools — rotated each run so the feed is NOT all "Bangladesh to X".
const ORIGINS = [
  "Bangladesh", "Nepal", "India", "Pakistan", "Sri Lanka", "the Philippines", "Indonesia",
  "Vietnam", "Saudi Arabia", "Oman", "Qatar", "the UAE", "Kuwait", "Egypt", "Morocco",
  "Tunisia", "Nigeria", "Kenya", "Ghana", "Serbia", "Moldova", "Ukraine", "Albania",
  "Kosovo", "North Macedonia", "Turkey", "Georgia", "Uzbekistan",
];
const DESTS = [
  "Poland", "Croatia", "Romania", "Lithuania", "Slovakia", "Bulgaria", "Hungary", "Portugal",
  "Italy", "Germany", "Czechia", "Slovenia", "Malta", "the Netherlands", "Estonia", "Latvia", "Serbia",
];
const TRADES = [
  "electrician", "welder", "truck driver", "cook", "chef", "construction worker", "plumber",
  "carpenter", "HVAC technician", "machine operator", "tiles and ceramic worker", "warehouse worker",
  "farm worker", "caregiver", "cleaner", "painter", "mason",
];
function rand<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}
// Build a varied focus instruction. Manual `category` overrides; otherwise rotate type + origin.
function pickFocus(category?: string): string {
  if (category && CATEGORY_HINTS[category]) return `Choose your topic from ${CATEGORY_HINTS[category]}.`;
  const dest = rand(DESTS);
  const r = Math.random();
  if (r < 0.42) {
    const origin = rand(ORIGINS);
    return `Write an "${origin} to ${dest} work permit / work visa" guide — the route, who can apply, documents, cost, salary and timeline for a worker from ${origin}. This site is WORLDWIDE: use ${origin} as the origin (NOT Bangladesh unless it is literally ${origin}).`;
  }
  if (r < 0.60) {
    const t = rand([
      "work visa requirements and the full documents checklist",
      "work visa processing time and the step-by-step process",
      "eligibility — who can apply and the qualifications/certificates needed",
      "the work-permit vs residence-permit difference and how to switch",
    ]);
    return `Write about ${t} for a ${dest} work visa, for foreign workers from around the world.`;
  }
  if (r < 0.74) {
    return `Write a salary guide: "${rand(TRADES)} salary in ${dest}" — monthly gross, estimated net, living cost and realistic monthly savings (indicative).`;
  }
  if (r < 0.84) {
    return `Write a cost-of-living and savings guide: how much a foreign worker can realistically save per month in ${dest}, with a breakdown.`;
  }
  if (r < 0.93) {
    let d2 = rand(DESTS);
    if (d2 === dest) d2 = rand(DESTS);
    return `Write a comparison: "${dest} vs ${d2} for foreign workers" — salary, cost of living, savings and the work-permit route.`;
  }
  return rand([
    `Write a guide: how to spot and avoid fake European job offers and recruitment scams (verifying the employer, recruitment-fee red flags, what a real work contract looks like).`,
    `Write a guide: how to get a Europe work permit WITHOUT IELTS — which countries and routes accept workers with no English test.`,
    `Write a guide: the cheapest and easiest European countries to get a work visa from Asia, the Gulf or Africa right now.`,
    `Write a guide: the documents and steps to fly out AFTER a European work visa is approved (attestation, medical, contract, what to do on arrival).`,
  ]);
}

async function generateArticle(avoidTitles: string[], key: string, monthYear: string, focus: string) {
  const system =
    `You are an expert Europe-migration content engine for ${SITE.name} (${SITE.niche}). Audience: ${SITE.audience}. Tone: ${SITE.tone}.\n\n${PLAYBOOK}\n\nCurrent period: ${monthYear}. Return ONLY JSON.`;
  const avoid = avoidTitles.slice(0, 140).join(" | ");
  const user = `${focus}
Write a complete, English, practical guide (1300-1900 words, at least one indicative salary/cost table).
The topic MUST be clearly DIFFERENT from every existing title/keyword below — no duplicates, no near-rephrasings, cover a NEW origin/destination/trade/angle:
${avoid}

Return JSON:
{
 "title": "SEO title <=60 chars with the primary keyword (a real question or '<origin> to <country> work permit' framing)",
 "primary_keyword": "the main keyword people search (English, short)",
 "secondary_keywords": ["6-10 long-tail/semantic keywords"],
 "meta_title": "<=60 chars",
 "meta_description": "<=155 chars, compelling, includes primary keyword",
 "excerpt": "<=155 char summary leading with the direct answer",
 "tags": ["5-8 tags"],
 "image_prompt": "a vivid, concrete prompt for an AI image generator — a clean thematic scene (a European city skyline, a construction/factory worker, a passport with a visa, an airport departures board), NO text, words or numbers in the image",
 "body_html": "the full guide in semantic HTML following the REQUIRED STRUCTURE, with at least one real indicative <table>",
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
    const st = (await sel("walvi_autogen_state?id=eq.1&select=*"))[0];
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

    const rows = await sel(
      `articles?site_id=eq.${SITE.id}&select=title,keyword&order=created_at.desc&limit=180`,
    );
    const avoid = rows.flatMap((r: any) => [r.title, r.keyword]).filter(Boolean);

    const monthYear = now.toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" });
    const focus = pickFocus(category);
    const a = await generateArticle(avoid, dsKey, monthYear, focus);
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
    await patchState({
      last_status: `err: ${String(e).slice(0, 180)}`,
      last_run_at: now.toISOString(),
      next_due_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    });
    return json({ error: String(e) }, 500);
  }
});

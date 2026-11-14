// InfKey model sync: pulls the public OpenRouter model list once a day into D1
// (infkey_models + infkey_price_history). Read by web/src/lib/models.ts.
const SRC = "https://openrouter.ai/api/v1/models";

const PROVIDERS = {
  openai: ["OpenAI", "https://openai.com/api/pricing/"],
  anthropic: ["Anthropic", "https://www.anthropic.com/pricing#api"],
  google: ["Google", "https://ai.google.dev/gemini-api/docs/pricing"],
  deepseek: ["DeepSeek", "https://api-docs.deepseek.com/quick_start/pricing"],
  "meta-llama": ["Meta", null],
  meta: ["Meta", null],
  mistralai: ["Mistral", "https://mistral.ai/pricing#api-pricing"],
  "x-ai": ["xAI", "https://docs.x.ai/docs/models"],
  qwen: ["Qwen (Alibaba)", null],
  moonshotai: ["Moonshot AI", null],
  "z-ai": ["Z.ai (Zhipu)", null],
  amazon: ["Amazon", "https://aws.amazon.com/bedrock/pricing/"],
  cohere: ["Cohere", "https://cohere.com/pricing"],
  minimax: ["MiniMax", null],
  perplexity: ["Perplexity", "https://docs.perplexity.ai/guides/pricing"],
  nvidia: ["NVIDIA", null],
  microsoft: ["Microsoft", null],
  tencent: ["Tencent", null],
  baidu: ["Baidu", null],
  "bytedance-seed": ["ByteDance Seed", null],
  xiaomi: ["Xiaomi", null],
};
const MAJOR = new Set(["openai", "anthropic", "google", "deepseek", "meta-llama", "meta", "mistralai", "x-ai", "qwen", "moonshotai", "z-ai"]);

const perM = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1e6 * 1e6) / 1e6;
};
const slugOf = (orId) =>
  orId
    .toLowerCase()
    .replace(/[/:_.]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-vs-/g, "-v-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
const titleCase = (s) =>
  s
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
const firstSentence = (s) => {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim();
  const m = t.match(/^(.{40,240}?[.!?])(\s|$)/);
  return (m ? m[1] : t.slice(0, 220)).trim();
};

function mapModel(m, today) {
  const orId = m.id;
  const pfx = orId.split("/")[0];
  const [provider, source] = PROVIDERS[pfx] || [titleCase(pfx), null];
  const name = (m.name || orId).replace(/^[^:]{1,40}:\s*/, "");
  const inMod = m.architecture?.input_modalities || [];
  const outMod = m.architecture?.output_modalities || [];
  const params = m.supported_parameters || [];
  let category = "llm";
  if (/embed/i.test(orId)) category = "embedding";
  else if (outMod.includes("image")) category = "image";
  else if (outMod.includes("video")) category = "video";
  else if (outMod.includes("audio")) category = "voice";
  const p = m.pricing || {};
  const req = Number(p.request);
  return {
    id: slugOf(orId),
    or_id: orId,
    hf_id: m.hugging_face_id || null,
    provider,
    name,
    version: m.canonical_slug && m.canonical_slug !== orId ? m.canonical_slug.split("/").pop() : null,
    category,
    input_per_m: perM(p.prompt),
    output_per_m: perM(p.completion),
    cached_input_per_m: perM(p.input_cache_read),
    unit_price: Number.isFinite(req) && req > 0 ? req : null,
    unit_label: Number.isFinite(req) && req > 0 ? "per request" : null,
    max_context: m.top_provider?.context_length || m.context_length || null,
    max_output: m.top_provider?.max_completion_tokens || null,
    supports_vision: inMod.includes("image") ? 1 : 0,
    supports_audio: inMod.includes("audio") || outMod.includes("audio") ? 1 : 0,
    supports_functions: params.includes("tools") ? 1 : 0,
    supports_structured: params.includes("structured_outputs") || params.includes("response_format") ? 1 : 0,
    supports_reasoning: params.includes("reasoning") || params.includes("include_reasoning") ? 1 : 0,
    input_modalities: inMod.join(","),
    output_modalities: outMod.join(","),
    official_source: source || `https://openrouter.ai/${orId.replace(/:.*$/, "")}`,
    last_verified: today,
    description: m.description || null,
    notes: firstSentence(m.description),
    created: m.created || null,
    major: MAJOR.has(pfx),
    free: /:free$/.test(orId),
  };
}

export async function sync(env) {
  const r = await fetch(SRC, { headers: { "user-agent": "infkey-sync/1.0 (+https://infkey.com)" } });
  if (!r.ok) throw new Error(`openrouter ${r.status}`);
  const list = (await r.json()).data || [];
  if (list.length < 50) throw new Error(`openrouter returned only ${list.length} models, keeping old data`);
  const today = new Date().toISOString().slice(0, 10);
  const rows = list.filter((m) => m?.id && !m.id.startsWith("~") && !m.id.startsWith("openrouter/")).map((m) => mapModel(m, today));

  // Tier: the 4 newest paid models of each major lab are "flagship" (tier 0).
  const byLab = {};
  for (const x of rows) if (x.major && !x.free && !/batch|preview|-\d{4}($|-)/i.test(x.or_id)) (byLab[x.provider] ||= []).push(x);
  const flagship = new Set();
  for (const xs of Object.values(byLab))
    xs
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .slice(0, 4)
      .forEach((x) => flagship.add(x.id));
  const seen = new Set();
  for (const x of rows) {
    x.tier = flagship.has(x.id) ? 0 : x.major ? 1 : 2;
    const blended = (x.input_per_m ?? 50) + (x.output_per_m ?? 50);
    x.sort = x.tier * 100000 + Math.min(99999, Math.round(blended * 100));
    if (seen.has(x.id)) x.id = `${x.id}-${seen.size}`;
    seen.add(x.id);
  }

  const now = new Date().toISOString();
  const cols = ["id", "or_id", "hf_id", "provider", "name", "version", "category", "input_per_m", "output_per_m", "cached_input_per_m", "unit_price", "unit_label", "max_context", "max_output", "supports_vision", "supports_audio", "supports_functions", "supports_structured", "supports_reasoning", "input_modalities", "output_modalities", "official_source", "last_verified", "sort", "tier", "notes", "description", "created"];
  const up = `INSERT INTO infkey_models (${cols.join(",")},active,updated_at) VALUES (${cols.map(() => "?").join(",")},1,?)
    ON CONFLICT(id) DO UPDATE SET ${cols
      .filter((c) => c !== "id")
      .map((c) => `${c}=excluded.${c}`)
      .join(",")},active=1,updated_at=excluded.updated_at`;
  const hist =
    "INSERT INTO infkey_price_history (id,day,input_per_m,output_per_m) VALUES (?,?,?,?) ON CONFLICT(id,day) DO UPDATE SET input_per_m=excluded.input_per_m,output_per_m=excluded.output_per_m";
  const before = new Set(((await env.DB.prepare("SELECT id FROM infkey_models").all()).results || []).map((r) => r.id));
  const fresh = rows.filter((x) => !before.has(x.id)).map((x) => x.id);
  const stmts = [env.DB.prepare("UPDATE infkey_models SET active=0")];
  for (const x of rows) {
    stmts.push(env.DB.prepare(up).bind(...cols.map((c) => x[c] ?? null), now));
    stmts.push(env.DB.prepare(hist).bind(x.id, today, x.input_per_m, x.output_per_m));
  }
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  // Tell Bing/Yandex (IndexNow) about brand-new model pages right away.
  if (before.size) {
    const key = "7cb730425493bd6250188aee25110d83";
    const urlList = ["https://infkey.com/changes", `https://infkey.com/changes/${today}`, "https://infkey.com/new", "https://infkey.com/models", ...fresh.slice(0, 500).map((id) => `https://infkey.com/models/${id}`)];
    try {
      await fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify({ host: "infkey.com", key, keyLocation: `https://infkey.com/${key}.txt`, urlList }) });
    } catch {}
  }
  return { models: rows.length, flagship: flagship.size, fresh: fresh.length, day: today };
}

// ---------- AI status (every 5 min) ----------
export const STATUS = [
  ["chatgpt", "ChatGPT & OpenAI API", "https://status.openai.com"],
  ["claude", "Claude (Anthropic)", "https://status.anthropic.com"],
  ["cursor", "Cursor", "https://status.cursor.com"],
  ["perplexity", "Perplexity", "https://status.perplexity.com"],
  ["mistral", "Mistral AI", "https://status.mistral.ai"],
  ["elevenlabs", "ElevenLabs", "https://status.elevenlabs.io"],
  ["cohere", "Cohere", "https://status.cohere.com"],
  ["github-copilot", "GitHub & Copilot", "https://www.githubstatus.com"],
  ["runway", "Runway", "https://status.runwayml.com"],
];
const RANK = { none: 0, minor: 1, major: 2, critical: 3, maintenance: 1 };

export async function syncStatus(env) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const stmts = [];
  await Promise.all(
    STATUS.map(async ([svc, name, page]) => {
      try {
        const r = await fetch(`${page}/api/v2/summary.json`, { headers: { "user-agent": "infkey-status/1.0 (+https://infkey.com/status)" }, cf: { cacheTtl: 0 } });
        if (!r.ok) return;
        const d = await r.json();
        const ind = d.status?.indicator || "none";
        const comps = (d.components || []).filter((c) => !c.group).map((c) => ({ n: c.name, s: c.status }));
        const inc = (d.incidents || []).slice(0, 10).map((i) => ({ n: i.name, s: i.status, i: i.impact, at: i.created_at, u: i.shortlink || `${page}/incidents/${i.id}` }));
        stmts.push(
          env.DB.prepare("INSERT INTO infkey_status (service,name,page_url,indicator,description,components,incidents,checked_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(service) DO UPDATE SET name=excluded.name,page_url=excluded.page_url,indicator=excluded.indicator,description=excluded.description,components=excluded.components,incidents=excluded.incidents,checked_at=excluded.checked_at").bind(svc, name, page, ind, d.status?.description || "", JSON.stringify(comps), JSON.stringify(inc), now.toISOString()),
          env.DB.prepare("INSERT INTO infkey_status_daily (service,day,checks,bad,worst) VALUES (?,?,1,?,?) ON CONFLICT(service,day) DO UPDATE SET checks=checks+1,bad=bad+excluded.bad,worst=CASE WHEN (CASE excluded.worst WHEN 'critical' THEN 3 WHEN 'major' THEN 2 WHEN 'minor' THEN 1 ELSE 0 END) > (CASE worst WHEN 'critical' THEN 3 WHEN 'major' THEN 2 WHEN 'minor' THEN 1 ELSE 0 END) THEN excluded.worst ELSE worst END").bind(svc, day, RANK[ind] >= 2 ? 1 : 0, ind),
        );
      } catch {}
    }),
  );
  if (stmts.length) await env.DB.batch(stmts);
  return { services: stmts.length / 2 };
}

// ---------- Hugging Face models for "Can I run it?" (daily) ----------
export async function syncHf(env) {
  const r = await fetch("https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&direction=-1&limit=1000&expand[]=safetensors&expand[]=downloads&expand[]=likes", { headers: { "user-agent": "infkey-sync/1.0 (+https://infkey.com)" } });
  if (!r.ok) throw new Error(`hf ${r.status}`);
  const list = await r.json();
  const now = new Date().toISOString();
  const rows = [];
  const seen = new Set();
  for (const m of list) {
    const params = m.safetensors?.total;
    if (!params || params < 1e8) continue;
    const id = m.id.toLowerCase().replace(/[/_.:]+/g, "-").replace(/[^a-z0-9-]+/g, "-").replace(/-vs-/g, "-v-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push([id, m.id, params, m.downloads || 0, m.likes || 0, rows.length + 1, now]);
  }
  const stmts = [env.DB.prepare("DELETE FROM infkey_hf")];
  for (const x of rows) stmts.push(env.DB.prepare("INSERT INTO infkey_hf (id,hf_id,params,downloads,likes,rank,updated_at) VALUES (?,?,?,?,?,?,?)").bind(...x));
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  return { hf: rows.length };
}

export default {
  async scheduled(e, env, ctx) {
    if (e.cron === "*/5 * * * *") return ctx.waitUntil(syncStatus(env));
    ctx.waitUntil(Promise.allSettled([sync(env), syncHf(env)]));
  },
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/run" && env.RUN_KEY && u.searchParams.get("key") === env.RUN_KEY) {
      const what = u.searchParams.get("what") || "models";
      if (what === "status") return Response.json(await syncStatus(env));
      if (what === "hf") return Response.json(await syncHf(env));
      return Response.json(await sync(env));
    }
    return new Response("infkey-sync", { status: 200 });
  },
};

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
  const stmts = [env.DB.prepare("UPDATE infkey_models SET active=0")];
  for (const x of rows) {
    stmts.push(env.DB.prepare(up).bind(...cols.map((c) => x[c] ?? null), now));
    stmts.push(env.DB.prepare(hist).bind(x.id, today, x.input_per_m, x.output_per_m));
  }
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  return { models: rows.length, flagship: flagship.size, day: today };
}

export default {
  async scheduled(_e, env, ctx) {
    ctx.waitUntil(sync(env));
  },
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/run" && env.RUN_KEY && u.searchParams.get("key") === env.RUN_KEY) {
      return Response.json(await sync(env));
    }
    return new Response("infkey-sync", { status: 200 });
  },
};

"""Central config. Loads from .env (see .env.example)."""
import os
from dotenv import load_dotenv

# Load .env from the generator dir explicitly, so it works no matter the CWD
# (admin via Start-Process, drip via Task Scheduler, etc.).
_GEN_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_GEN_DIR, ".env"))

# === DeepSeek (OpenAI-compatible client) ===
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")

# === OpenRouter (alternative LLM provider — access to many latest models) ===
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "qwen/qwen3.8-27b:free")

# === Free-tier providers (all OpenAI-compatible) ===
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")  # also used for gemini images
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY", "")

PROVIDERS = {
    "gemini": {"key": GEMINI_API_KEY, "model": os.getenv("GEMINI_MODEL", "gemini-flash-latest"),
               "base": "https://generativelanguage.googleapis.com/v1beta/openai/"},
    "mistral": {"key": MISTRAL_API_KEY, "model": os.getenv("MISTRAL_MODEL", "mistral-medium-latest"),
                "base": "https://api.mistral.ai/v1"},
    "groq": {"key": GROQ_API_KEY, "model": os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
             "base": "https://api.groq.com/openai/v1"},
    "cerebras": {"key": CEREBRAS_API_KEY, "model": os.getenv("CEREBRAS_MODEL", "gpt-oss-120b"),
                 "base": "https://api.cerebras.ai/v1"},
    "openrouter": {"key": OPENROUTER_API_KEY, "model": OPENROUTER_MODEL, "base": OPENROUTER_BASE_URL},
    "deepseek": {"key": DEEPSEEK_API_KEY, "model": DEEPSEEK_MODEL, "base": DEEPSEEK_BASE_URL},
}

# Cloudflare Workers AI (free plan: 10k neurons/day). Reuses the D1 token unless a
# dedicated CF_AI_API_TOKEN is set — the token needs the "Workers AI" permission.
CF_ACCOUNT_ID = os.getenv("CF_AI_ACCOUNT_ID") or os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
CF_AI_API_TOKEN = os.getenv("CF_AI_API_TOKEN") or os.getenv("CLOUDFLARE_API_TOKEN", "")
PROVIDERS["workersai"] = {
    "key": CF_AI_API_TOKEN if CF_ACCOUNT_ID else "",
    "model": os.getenv("CF_AI_MODEL", "@cf/openai/gpt-oss-120b"),
    "base": f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/v1",
}

# chain = try LLM_CHAIN in order, falling through on quota/overload; or pin one provider name.
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "chain")
# "provider" or "provider:model". Providers without a key are skipped automatically.
# Best quality first; each later entry is a separate free quota to fall back on.
LLM_CHAIN = os.getenv("LLM_CHAIN", ",".join([
    "gemini:gemini-flash-latest",
    "gemini:gemini-flash-lite-latest",
    "cerebras:gpt-oss-120b",
    "groq:openai/gpt-oss-120b",
    "mistral:mistral-medium-latest",
    "workersai:@cf/openai/gpt-oss-120b",
    "cerebras:qwen-3.8-27b",
    "groq:qwen/qwen3.8-27b",
    "workersai:@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "openrouter:qwen/qwen3.8-27b:free",
    "deepseek",
]))

# === Feature + inline images ===
IMAGE_PROVIDER = os.getenv("IMAGE_PROVIDER", "pollinations")  # pixabay | pollinations | openai | gemini | placeholder
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY", "")

# === SEO data (optional) ===
SEMRUSH_API_KEY = os.getenv("SEMRUSH_API_KEY", "")

# === IndexNow (instant Bing + Yandex indexing on publish) ===
# Key file must be hosted at https://<domain>/<key>.txt (see web/public/).
INDEXNOW_KEY = os.getenv("INDEXNOW_KEY", "7cb730425493bd6250188aee25110d83")
# Only ping hosts whose key file is actually live + domain connected. Comma-separated.
INDEXNOW_HOSTS = set(
    h.strip().lower() for h in os.getenv("INDEXNOW_HOSTS", "infkey.com").split(",") if h.strip()
)

# === Storage ===
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")  # local | supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# === Paths ===
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
DB_DIR = os.path.join(OUTPUT_DIR, "db")
SITES_CONFIG = os.path.join(BASE_DIR, "sites", "sites_config.json")

os.makedirs(DB_DIR, exist_ok=True)

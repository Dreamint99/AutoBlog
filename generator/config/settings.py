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
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "deepseek")  # deepseek | openrouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-chat")

# === Feature + inline images ===
IMAGE_PROVIDER = os.getenv("IMAGE_PROVIDER", "pollinations")  # pixabay | pollinations | openai | gemini | placeholder
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
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

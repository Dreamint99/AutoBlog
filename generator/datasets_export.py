"""Weekly open-data export → Hugging Face + Kaggle (white-hat backlinks: people cite the source).

Datasets (CC BY 4.0, attribution = link back to the site):
  ai-model-api-prices      from infkey.com  (D1 infkey_models + infkey_price_history)
  gulf-remittance-rates    from gccguide.com (D1 gcc_fx_daily)

Env:
  CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID   D1 read (REST API)
  HF_TOKEN, HF_USER                             optional: push to huggingface.co/datasets/<HF_USER>/<slug>
  KAGGLE_API_TOKEN, KAGGLE_USER                 optional: push to kaggle.com/datasets/<KAGGLE_USER>/<slug>
Without a platform's token the files are still written to generator/output/datasets/ (dry run).
"""
import csv
import json
import os
import shutil
import subprocess
import sys
from datetime import date

import requests

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output", "datasets")
DB = "58dacf96-c574-4f0b-88e6-3005d895eb90"  # autoblog-content
TODAY = date.today().isoformat()


def d1(sql: str) -> list:
    tok, acct = os.environ["CLOUDFLARE_API_TOKEN"], os.environ["CLOUDFLARE_ACCOUNT_ID"]
    r = requests.post(f"https://api.cloudflare.com/client/v4/accounts/{acct}/d1/database/{DB}/query",
                      headers={"Authorization": f"Bearer {tok}"}, json={"sql": sql}, timeout=120)
    j = r.json()
    if not j.get("success"):
        raise SystemExit(f"D1 query failed: {j.get('errors')}")
    return j["result"][0]["results"]


def write_csv(path: str, rows: list, cols: list):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k) for k in cols})


def card(slug: str, title: str, summary: str, files: list, source: str, body: str, tags: list) -> str:
    """Hugging Face dataset card (YAML front matter + markdown). Kaggle gets the same text."""
    cfg = "\n".join(f"  - split: {f[0]}\n    path: {f[1]}" for f in files)
    return f"""---
license: cc-by-4.0
pretty_name: {title}
tags:
{chr(10).join('- ' + t for t in tags)}
configs:
- config_name: default
  data_files:
{cfg}
---

# {title}

{summary}

**Source and live version:** {source} — updated every week (last export {TODAY}).

{body}

## License and attribution

CC BY 4.0. You can use, share and adapt the data, including commercially, as long as you credit
the source with a link: *"Data: [{source.split('//')[1].rstrip('/')}]({source})"*.
"""


def ai_prices(d: str) -> dict:
    cols = ["id", "provider", "name", "category", "input_per_m", "output_per_m", "cached_input_per_m",
            "unit_price", "unit_label", "max_context", "max_output", "supports_vision", "supports_audio",
            "supports_functions", "supports_structured", "supports_reasoning", "input_modalities",
            "output_modalities", "official_source", "last_verified"]
    models = d1(f"SELECT {','.join(cols)} FROM infkey_models WHERE active=1 ORDER BY provider, name")
    hist = d1("SELECT id, day, input_per_m, output_per_m FROM infkey_price_history ORDER BY day, id")
    write_csv(os.path.join(d, "models.csv"), models, cols)
    write_csv(os.path.join(d, "price_history.csv"), hist, ["id", "day", "input_per_m", "output_per_m"])
    body = f"""{len(models)} AI models (OpenAI, Anthropic, Google, Mistral, DeepSeek, Meta and more) with API prices
in USD per 1M tokens, context window, output limit, modalities and capability flags; plus a daily price
history ({len(hist)} rows) so you can see price changes over time.

| File | What it is |
|---|---|
| `models.csv` | One row per active model: prices (`input_per_m`, `output_per_m`, `cached_input_per_m`), limits, capabilities, official source link, last verified date |
| `price_history.csv` | Daily input/output price per model id |

Browse and compare the same data on [infkey.com](https://infkey.com/) — prices, side-by-side comparisons,
status pages and a GPU memory calculator."""
    return {"slug": "ai-model-api-prices", "title": "AI Model API Prices (LLM pricing per 1M tokens)",
            "summary": "Daily-verified API prices and specs for 400+ large language and multimodal AI models.",
            "files": [("models", "models.csv"), ("price_history", "price_history.csv")],
            "source": "https://infkey.com/", "body": body,
            "tags": ["llm", "pricing", "ai", "api", "openai", "anthropic", "gemini"],
            "kaggle_keywords": ["artificial intelligence", "nlp", "economics"]}


def remittance(d: str) -> dict:
    rows = d1("SELECT d AS date, currency, rate AS usd_rate, source FROM gcc_fx_daily ORDER BY d, currency")
    write_csv(os.path.join(d, "usd_rates_weekly.csv"), rows, ["date", "currency", "usd_rate", "source"])
    gulf = ["QAR", "AED", "SAR", "KWD", "OMR", "BHD"]
    home = ["BDT", "INR", "PKR", "NPR", "LKR", "PHP", "IDR", "EGP", "KES", "ETB", "EUR", "GBP"]
    by = {}
    for r in rows:
        by.setdefault(r["date"], {})[r["currency"]] = r["usd_rate"]
    cross = []
    for dt, m in sorted(by.items()):
        for g in gulf:
            for h in home:
                if m.get(g) and m.get(h):
                    cross.append({"date": dt, "from": g, "to": h, "rate": round(m[h] / m[g], 6)})
    write_csv(os.path.join(d, "gulf_to_home_rates.csv"), cross, ["date", "from", "to", "rate"])
    body = f"""Weekly mid-market exchange rates for remittances from the six Gulf (GCC) currencies to the main
home currencies of migrant workers in the Gulf — Bangladesh (BDT), India (INR), Pakistan (PKR), Nepal (NPR),
Sri Lanka (LKR), the Philippines (PHP), Indonesia (IDR), Egypt (EGP), Kenya (KES), Ethiopia (ETB) — plus EUR and GBP.

| File | What it is |
|---|---|
| `usd_rates_weekly.csv` | Units of each currency per 1 USD, weekly, with the upstream source |
| `gulf_to_home_rates.csv` | Ready-made cross rates, e.g. 1 QAR → BDT ({len(cross)} rows) |

These are mid-market rates, not the rate a bank or exchange house pays. Monthly analysis with charts:
[GCCGuide remittance reports](https://gccguide.com/reports/remittance)."""
    return {"slug": "gulf-remittance-rates", "title": "Gulf (GCC) Remittance Exchange Rates — weekly",
            "summary": "Weekly exchange rates from QAR, AED, SAR, KWD, OMR and BHD to South Asian, Southeast Asian and African currencies.",
            "files": [("gulf_to_home", "gulf_to_home_rates.csv"), ("usd_rates", "usd_rates_weekly.csv")],
            "source": "https://gccguide.com/reports/remittance", "body": body,
            "tags": ["finance", "remittance", "exchange-rates", "gcc", "bangladesh", "migration"],
            "kaggle_keywords": ["finance", "economics", "currencies and foreign exchange"]}


def push_hf(d: str, meta: dict):
    tok, user = os.getenv("HF_TOKEN"), os.getenv("HF_USER")
    if not (tok and user):
        print(f"  HF: skipped (no HF_TOKEN/HF_USER)")
        return
    from huggingface_hub import HfApi
    api = HfApi(token=tok)
    repo = f"{user}/{meta['slug']}"
    api.create_repo(repo, repo_type="dataset", exist_ok=True)
    api.upload_folder(folder_path=d, repo_id=repo, repo_type="dataset",
                      commit_message=f"Weekly update {TODAY}", ignore_patterns=["dataset-metadata.json"])
    print(f"  HF: https://huggingface.co/datasets/{repo}")


def push_kaggle(d: str, meta: dict):
    tok, user = os.getenv("KAGGLE_API_TOKEN"), os.getenv("KAGGLE_USER")
    if not (tok and user):
        print(f"  Kaggle: skipped (no KAGGLE_API_TOKEN/KAGGLE_USER)")
        return
    ref = f"{user}/{meta['slug']}"
    json.dump({"title": meta["title"][:50], "id": ref, "subtitle": meta["summary"][:80],
               "description": open(os.path.join(d, "README.md"), encoding="utf-8").read().split("---", 2)[2],
               "licenses": [{"name": "CC-BY-4.0"}], "keywords": meta["kaggle_keywords"]},
              open(os.path.join(d, "dataset-metadata.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    exists = subprocess.run(["kaggle", "datasets", "status", ref], capture_output=True, text=True).returncode == 0
    cmd = (["kaggle", "datasets", "version", "-p", d, "-m", f"Weekly update {TODAY}", "-r", "skip"] if exists
           else ["kaggle", "datasets", "create", "-p", d, "--public", "-r", "skip"])
    r = subprocess.run(cmd, capture_output=True, text=True)
    print(f"  Kaggle {'version' if exists else 'create'}: rc={r.returncode} {(r.stdout + r.stderr).strip()[-300:]}")


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    for build in (ai_prices, remittance):
        d = os.path.join(OUT, build.__name__)
        os.makedirs(d, exist_ok=True)
        meta = build(d)
        open(os.path.join(d, "README.md"), "w", encoding="utf-8").write(
            card(meta["slug"], meta["title"], meta["summary"], meta["files"], meta["source"], meta["body"], meta["tags"]))
        print(f"{meta['slug']}: " + ", ".join(f"{f} {os.path.getsize(os.path.join(d, f))}B" for f in sorted(os.listdir(d))))
        push_hf(d, meta)
        push_kaggle(d, meta)


if __name__ == "__main__":
    main()

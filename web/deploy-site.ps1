# Build + deploy ONE site to its Cloudflare Worker (autoblog-<site>).
#   powershell -ExecutionPolicy Bypass -File deploy-site.ps1 ninetymins
#   powershell -ExecutionPolicy Bypass -File deploy-site.ps1 countly -DryRun
# wrangler.jsonc is gitignored because it's per-site; this script regenerates it
# from the live worker settings (assets + D1 + SITE_ID + custom domains).
param(
    [Parameter(Mandatory = $true)][string]$Site,
    [switch]$DryRun
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$domains = @{ countly = "countly.net"; ninetymins = "ninetymins.com"; infkey = "infkey.com"; walvi = "visapoint.net" }
if (-not $domains.ContainsKey($Site)) { throw "unknown site '$Site' (known: $($domains.Keys -join ', '))" }
$d = $domains[$Site]

@"
{
  "name": "autoblog-$Site",
  "main": "cache-worker.js",
  "compatibility_date": "2026-06-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "d1_databases": [
    { "binding": "DB", "database_name": "autoblog-content", "database_id": "58dacf96-c574-4f0b-88e6-3005d895eb90" }
  ],
  "vars": { "SITE_ID": "$Site" },
  "version_metadata": { "binding": "CF_VERSION_METADATA" },
  "routes": [
    { "pattern": "$d", "custom_domain": true },
    { "pattern": "www.$d", "custom_domain": true }
  ]
}
"@ | Out-File -Encoding utf8 wrangler.jsonc

$env:SITE_ID = $Site
npx opennextjs-cloudflare build
if ($LASTEXITCODE -ne 0) { throw "build failed" }
if ($DryRun) {
    npx wrangler deploy --dry-run
} else {
    npx wrangler deploy
}
if ($LASTEXITCODE -ne 0) { throw "deploy failed" }

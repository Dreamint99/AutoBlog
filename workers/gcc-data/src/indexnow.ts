/* IndexNow ping — same protocol the generator already uses
 * (generator/modules/indexnow.py), kept dependency-free here so the cron Worker
 * can tell Bing/Yandex/Seznam that today's rate and gold pages changed.
 *
 * The key is a public verification file (web/public/<key>.txt), not a secret.
 * Google ignores IndexNow; it discovers the changes through the sitemaps.
 */

import type { Env } from "./shared";

export function ratePaths(): string[] {
  const gulf = ["aed", "sar", "qar", "omr", "bhd", "kwd"];
  const quotes = ["inr", "pkr", "bdt", "php", "npr", "lkr", "egp", "idr", "kes", "ngn", "etb", "usd", "eur", "gbp"];
  const out: string[] = ["/", "/rates", "/gold-rate", "/fuel-price"];
  for (const g of gulf) for (const q of quotes) out.push(`/rates/${g}-to-${q}`);
  for (const c of ["dubai", "abu-dhabi", "sharjah", "al-ain", "riyadh", "jeddah", "dammam", "mecca", "medina", "doha", "kuwait-city", "muscat", "salalah", "manama"]) {
    out.push(`/gold-rate/${c}`);
  }
  return out;
}

/** Pings IndexNow with the URLs whose numbers changed. Returns a short status line. */
export async function pingIndexNow(env: Env, paths: string[]): Promise<{ status: "ok" | "error"; message: string }> {
  if (env.INDEXNOW_ENABLED !== "1") return { status: "ok", message: "disabled" };
  const host = new URL(env.SITE_URL).host;
  const body = {
    host,
    key: env.INDEXNOW_KEY,
    keyLocation: `${env.SITE_URL}/${env.INDEXNOW_KEY}.txt`,
    urlList: paths.map((p) => `${env.SITE_URL}${p}`),
  };
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    // 200 = accepted, 202 = accepted (key pending validation). Both are fine.
    if (res.status === 200 || res.status === 202) return { status: "ok", message: `${res.status} · ${body.urlList.length} urls` };
    return { status: "error", message: `HTTP ${res.status} · ${body.urlList.length} urls` };
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
}

import "server-only";
import { d1 } from "@/lib/data";
import { FLAG_CODES } from "./flag-codes";

/* Team badges / player photos cached in D1 nm_media by the nm-api cron (TheSportsDB, free key).
   Pages never call TheSportsDB; this module reads the cached URLs (one small query per isolate per 10 min). */

export interface TeamMedia { slug: string; url: string }
type Index = { bySlug: Map<string, string>; byId: Map<string, TeamMedia> };
let memo: { t: number; v: Index } | null = null;

export async function teamIndex(): Promise<Index> {
  if (memo && Date.now() - memo.t < 600_000) return memo.v;
  const db = d1();
  const v: Index = { bySlug: new Map(), byId: new Map() };
  if (db) {
    try {
      const rows = (await db.prepare("SELECT key,url FROM nm_media WHERE kind='team'").all<{ key: string; url: string }>()).results;
      for (const r of rows) {
        if (r.url) v.bySlug.set(r.key, r.url);
        const id = r.key.match(/-football-(\d+)$/)?.[1];
        if (id) v.byId.set(id, { slug: r.key, url: r.url });
      }
    } catch { /* table missing: no badges */ }
  }
  memo = { t: Date.now(), v };
  return v;
}

/** TheSportsDB serves fixed-size previews: /tiny = 100 px, /small = 200 px. */
export const sized = (url: string, size: "tiny" | "small" = "tiny") => (url && url.includes("thesportsdb.com/") && !/\/(tiny|small|medium)$/.test(url) ? `${url}/${size}` : url);

export function flagUrl(country: string | undefined, w: 20 | 40 | 80 = 40): string {
  const code = country ? FLAG_CODES[country.trim().toLowerCase()] : undefined;
  return code ? `https://flagcdn.com/w${w}/${code}.png` : "";
}

/** Badge for a stored team slug; national sides fall back to their flag. */
export async function teamLogo(slug: string, name = "", national = false, size: "tiny" | "small" = "tiny"): Promise<string> {
  const url = (await teamIndex()).bySlug.get(slug) || "";
  return url ? sized(url, size) : national ? flagUrl(name, size === "small" ? 80 : 40) : "";
}

export async function playerPhotos(paths: string[]): Promise<Map<string, string>> {
  const db = d1(), out = new Map<string, string>();
  if (!db || !paths.length) return out;
  try {
    for (let i = 0; i < paths.length; i += 90) {
      const part = paths.slice(i, i + 90);
      const rows = (await db.prepare(`SELECT key,url FROM nm_media WHERE kind='player' AND url<>'' AND key IN (${part.map(() => "?").join(",")})`).bind(...part).all<{ key: string; url: string }>()).results;
      for (const r of rows) out.set(r.key, sized(r.url, "tiny"));
    }
  } catch { /* no photos */ }
  return out;
}

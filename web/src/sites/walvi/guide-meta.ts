import type { Article } from "@/lib/types";
import { COUNTRIES, type Country } from "@/lib/walvi";

/** Destination country of a guide: the part after " to " wins ("Bangladesh to
 *  Romania work visa" → Romania), else the first register country named in the
 *  title, then the slug. */
export function countryOf(a: Article): Country | undefined {
  const t = a.title.toLowerCase();
  const to = t.match(/\bto ([a-z ]+?)(?: work| visa| guide|[:,]|$)/);
  const find = (s: string) => COUNTRIES.find((c) => s.includes(c.name.toLowerCase()));
  return (to && find(to[1])) || find(t) || find(a.slug.replace(/-/g, " "));
}

/** Topic label for a guide (shown as the kicker). */
export function topicOf(a: Article): string {
  const t = a.title.toLowerCase();
  if (/salary|salaries|pay\b|wage/.test(t)) return "Salaries";
  if (/cost of living|savings|save/.test(t)) return "Cost of living";
  if (/scam|fake|fraud/.test(t)) return "Scam alert";
  if (/visa|permit|residence|blue card/.test(t)) return "Work permit";
  if (/job|jobs|demand|occupation/.test(t)) return "Jobs";
  return "Guide";
}

// Feature images that came from Wikipedia/Commons are matched by search term
// and are frequently wrong (club crests, unrelated people, a 1941 flag). The
// VisaPoint design never shows them — a country banner is used instead.
const UNTRUSTED = /wikimedia\.org|wikipedia\.org/i;

export function trustedImage(a: Article): string {
  return a.image_url && !UNTRUSTED.test(a.image_url) ? a.image_url : "";
}

/** Flag image URL from a flag emoji (regional-indicator pair → ISO code). Windows
 *  renders flag emoji as plain letters ("PL"), so the UI shows a real flag image. */
export function flagUrl(emoji: string | undefined, width = 80): string {
  const cps = [...(emoji || "")].map((ch) => ch.codePointAt(0) || 0).filter((c) => c >= 0x1f1e6 && c <= 0x1f1ff);
  if (cps.length !== 2) return "";
  const iso = cps.map((c) => String.fromCharCode(c - 0x1f1e6 + 97)).join("");
  return `https://flagcdn.com/w${width}/${iso}.png`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/* Number/date formatting for the hub. Deterministic and UTC-pinned so a page
 * rendered on the server never disagrees with its own structured data. */

import { dpFor } from "./series";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmt(n: number | null | undefined, dp?: number): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const d = dp ?? dpFor(n);
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** "AED 25.62" — currency code first, the way Gulf rate boards print it. */
export function money(n: number | null | undefined, code: string, dp?: number): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${code} ${fmt(n, dp)}`;
}

/** Whole number with thousands separators: 1,234,567 */
export function int(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

/** "14 Nov 2026" — always UTC, so it matches the data's own timestamps. */
export function dateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "14 Nov" — for chart axes. */
export function dateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "14 Nov 2026, 07:35 UTC" — the data-as-of stamp shown next to every source. */
export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dateLong(iso)}, ${hh}:${mm} UTC`;
}

/** "+1.24%" / "−1.24%" */
export function pct(n: number | null | undefined, dp = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const s = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${s}${Math.abs(n).toFixed(dp)}%`;
}

export function signed(n: number | null | undefined, dp: number): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const s = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${s}${fmt(Math.abs(n), dp)}`;
}

export const DOWN = "↘";
export const UP = "↗";
export const FLAT = "→";

/** Tone used for "up/down" colouring. For an expat sending money home, a higher
 *  local→home rate is good news, so the page colours by the reader's benefit
 *  where that is unambiguous, and stays neutral otherwise. */
export function tone(n: number): "up" | "down" | "flat" {
  if (!Number.isFinite(n) || Math.abs(n) < 0.005) return "flat";
  return n > 0 ? "up" : "down";
}

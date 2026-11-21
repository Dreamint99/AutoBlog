/** Clock labels for a published kick-off. Date-only fixtures stay on the venue calendar. */

export const ZONES: { id: string; label: string }[] = [
  { id: "", label: "My time" },
  { id: "UTC", label: "UTC" },
  { id: "Asia/Kolkata", label: "IST" },
  { id: "Asia/Karachi", label: "PKT" },
  { id: "Asia/Dubai", label: "GST" },
  { id: "Europe/London", label: "GMT/BST" },
  { id: "Australia/Sydney", label: "Sydney" },
  { id: "America/New_York", label: "ET" },
];

export function formatKick(iso: string, zone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone || undefined,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

/** A YYYY-MM-DD venue date, not shifted into the reader's zone. */
export function formatVenueDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function countdown(iso: string, now: number): { d: number; h: number; m: number; s: number } | null {
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

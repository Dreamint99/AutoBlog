/** URL helpers for event team and match pages. Existing /team and /match slugs are not reused. */

export function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function teamPath(event: string, name: string): string {
  return `/event/${event}/team/${slugify(name)}`;
}

export function matchPath(event: string, id: string): string {
  return `/event/${event}/match/${slugify(id)}`;
}

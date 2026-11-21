/** Display colours for hub and team heroes. Known franchise pairs only; everyone else gets a stable generated pair, not a claimed kit. */

const KNOWN: Record<string, [string, string]> = {
  "chennai super kings": ["#f5c518", "#1d3e7a"],
  "delhi capitals": ["#d21f3c", "#0b4f9c"],
  "gujarat titans": ["#0b1f3a", "#c6a15b"],
  "kolkata knight riders": ["#3b0764", "#eab308"],
  "lucknow super giants": ["#0ea5e9", "#f97316"],
  "mumbai indians": ["#004ba0", "#d4a017"],
  "punjab kings": ["#ed1c24", "#c6a15b"],
  "rajasthan royals": ["#e31c79", "#1e3a8a"],
  "royal challengers bengaluru": ["#c8102e", "#111111"],
  "sunrisers hyderabad": ["#f97316", "#111111"],
  "desert vipers": ["#c2410c", "#111111"],
  "gulf giants": ["#b45309", "#1c1917"],
  "mi emirates": ["#004ba0", "#d4a017"],
  "sharjah warriorz": ["#111111", "#e11d48"],
  "dubai capitals": ["#0b4f9c", "#d21f3c"],
  "abu dhabi knight riders": ["#3b0764", "#eab308"],
  "perth scorchers": ["#f97316", "#111111"],
  "sydney sixers": ["#ec4899", "#111111"],
  "sydney thunder": ["#16a34a", "#111111"],
  "melbourne stars": ["#14532d", "#84cc16"],
  "melbourne renegades": ["#dc2626", "#111111"],
  "brisbane heat": ["#0ea5e9", "#111111"],
  "adelaide strikers": ["#1d4ed8", "#f97316"],
  "hobart hurricanes": ["#4c1d95", "#111111"],
};

function hash(name: string) {
  let n = 0;
  for (const c of name) n = (n * 33 + c.charCodeAt(0)) >>> 0;
  return n;
}

export function teamColour(name: string): { a: string; b: string } {
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const known = KNOWN[key];
  if (known) return { a: known[0], b: known[1] };
  const n = hash(key || "team");
  const hue = n % 360;
  return { a: `hsl(${hue} 42% 28%)`, b: `hsl(${(hue + 40) % 360} 55% 42%)` };
}

export function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
  return letters;
}

/* SAFF Championship reference data for the /topic/saff-championship hub.
   Static facts (finals, hosts, titles) — the live parts of the page come from
   the score feeds and the drip-written guides. */

export interface SaffFinal {
  year: number;
  host: string;
  champion: string;
  runnerUp: string;
  score: string;
  venue: string;
}

export const SAFF_FINALS: SaffFinal[] = [
  { year: 2023, host: "India", champion: "India", runnerUp: "Kuwait", score: "1–1 (5–4 pens)", venue: "Bengaluru" },
  { year: 2021, host: "Maldives", champion: "India", runnerUp: "Nepal", score: "3–0", venue: "Malé" },
  { year: 2018, host: "Bangladesh", champion: "Maldives", runnerUp: "India", score: "2–1", venue: "Dhaka" },
  { year: 2015, host: "India", champion: "India", runnerUp: "Afghanistan", score: "2–1 (aet)", venue: "Thiruvananthapuram" },
  { year: 2013, host: "Nepal", champion: "Afghanistan", runnerUp: "India", score: "2–0", venue: "Kathmandu" },
  { year: 2011, host: "India", champion: "India", runnerUp: "Afghanistan", score: "4–0", venue: "New Delhi" },
  { year: 2009, host: "Bangladesh", champion: "India", runnerUp: "Maldives", score: "0–0 (3–1 pens)", venue: "Dhaka" },
  { year: 2008, host: "Maldives & Sri Lanka", champion: "Maldives", runnerUp: "India", score: "1–0", venue: "Malé" },
  { year: 2005, host: "Pakistan", champion: "India", runnerUp: "Bangladesh", score: "2–0", venue: "Karachi" },
  { year: 2003, host: "Bangladesh", champion: "Bangladesh", runnerUp: "Maldives", score: "1–1 (5–3 pens)", venue: "Dhaka" },
  { year: 1999, host: "India", champion: "India", runnerUp: "Bangladesh", score: "2–0", venue: "Margao" },
  { year: 1997, host: "Nepal", champion: "India", runnerUp: "Maldives", score: "5–1", venue: "Kathmandu" },
  { year: 1995, host: "Sri Lanka", champion: "Sri Lanka", runnerUp: "India", score: "1–0", venue: "Colombo" },
  { year: 1993, host: "Pakistan", champion: "India", runnerUp: "Sri Lanka", score: "Round-robin", venue: "Lahore" },
];

export interface SaffTeam {
  name: string;
  code: string; // ISO 3166-1 alpha-2, for flag images
  nickname: string;
  fed: string;
}

export const SAFF_TEAMS: SaffTeam[] = [
  { name: "Bangladesh", code: "bd", nickname: "The Red and Greens", fed: "BFF" },
  { name: "Bhutan", code: "bt", nickname: "The Dragon Boys", fed: "BFF (Bhutan)" },
  { name: "India", code: "in", nickname: "The Blue Tigers", fed: "AIFF" },
  { name: "Maldives", code: "mv", nickname: "The Red Snappers", fed: "FAM" },
  { name: "Nepal", code: "np", nickname: "The Gorkhalis", fed: "ANFA" },
  { name: "Pakistan", code: "pk", nickname: "The Green Shirts", fed: "PFF" },
  { name: "Sri Lanka", code: "lk", nickname: "The Brave Reds", fed: "FFSL" },
];

/** Titles per nation, derived from the finals list (most first). */
export function saffTitles(): Array<{ team: string; titles: number; years: number[]; finals: number }> {
  const m = new Map<string, { titles: number; years: number[]; finals: number }>();
  for (const f of SAFF_FINALS) {
    for (const t of [f.champion, f.runnerUp]) if (!m.has(t)) m.set(t, { titles: 0, years: [], finals: 0 });
    const c = m.get(f.champion)!;
    c.titles++;
    c.years.push(f.year);
    c.finals++;
    m.get(f.runnerUp)!.finals++;
  }
  return [...m.entries()]
    .map(([team, v]) => ({ team, ...v, years: v.years.sort((a, b) => a - b) }))
    .filter((r) => r.titles > 0)
    .sort((a, b) => b.titles - a.titles || b.finals - a.finals);
}

export const SAFF_FAQ: Array<{ q: string; a: string }> = [
  {
    q: "What is the SAFF Championship?",
    a: "The SAFF Championship is the national-team football tournament of the South Asian Football Federation (SAFF). It began in 1993 as the SAARC Gold Cup and is South Asia's top international football competition.",
  },
  {
    q: "Which country has won the most SAFF Championship titles?",
    a: "India have won the SAFF Championship nine times (1993, 1997, 1999, 2005, 2009, 2011, 2015, 2021 and 2023). Maldives have won it twice, and Sri Lanka, Bangladesh and Afghanistan once each.",
  },
  {
    q: "Who won the last SAFF Championship?",
    a: "India won the 2023 SAFF Championship in Bengaluru, beating guest team Kuwait 5–4 on penalties after a 1–1 draw in the final.",
  },
  {
    q: "Has Bangladesh ever won the SAFF Championship?",
    a: "Yes. Bangladesh won the 2003 SAFF Championship on home soil in Dhaka, beating Maldives 5–3 on penalties after a 1–1 draw. They also reached the final in 1999 and 2005.",
  },
  {
    q: "Which teams play in the SAFF Championship?",
    a: "SAFF's seven member nations are Bangladesh, Bhutan, India, Maldives, Nepal, Pakistan and Sri Lanka. Afghanistan took part from 2003 to 2015 before moving to the Central Asian federation, and Kuwait and Lebanon were invited guests in 2023.",
  },
  {
    q: "Who is the SAFF Championship's all-time top scorer?",
    a: "India captain Sunil Chhetri is the competition's all-time leading scorer.",
  },
  {
    q: "How can I watch the SAFF Championship live?",
    a: "Broadcast rights are sold per edition and per country, so channels change each time. Our SAFF guides below list the official TV and streaming options for Bangladesh, India, Nepal and the rest of the region once they are announced.",
  },
];

export const flag = (code: string, w = 80) => `https://flagcdn.com/w${w}/${code}.png`;

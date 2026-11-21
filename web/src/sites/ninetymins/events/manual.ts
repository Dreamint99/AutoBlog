/** Operator log only. These gaps are printed by event-refresh.yml. They are not rendered on the site. */

export type ManualFact = {
  id: string;
  slug: string;
  label: string;
  reviewAfter: string;
  detail: string;
};

export const MANUAL_FACTS: ManualFact[] = [
  { id: "ipl-fixtures", slug: "ipl-2027", label: "IPL 2027 match list", reviewAfter: "2027-01-15", detail: "The BCCI pages checked on 21 Nov 2026 had the auction and retentions, not a fixture list." },
  { id: "ipl-auction", slug: "ipl-2027", label: "Auction results", reviewAfter: "2026-12-16", detail: "Sold prices exist only after the 16 Dec 2026 auction. Update the retention file by hand." },
  { id: "ipl-tv", slug: "ipl-2027", label: "IPL broadcasters", reviewAfter: "2027-02-01", detail: "No country list was on the organizer pages." },
  { id: "wc-times", slug: "icc-mens-odi-world-cup-2027", label: "World Cup kick-off times", reviewAfter: "2027-06-01", detail: "The 1 Oct 2026 ICC release has dates and cities, not clocks." },
  { id: "wc-sanz", slug: "icc-mens-odi-world-cup-2027", label: "South Africa vs New Zealand venue", reviewAfter: "2027-01-01", detail: "The same ICC release names both Centurion/Tshwane and Newlands." },
  { id: "wc-tv", slug: "icc-mens-odi-world-cup-2027", label: "World Cup broadcasters", reviewAfter: "2027-06-01", detail: "The ICC where-to-watch note was for the schedule launch, not the matches." },
  { id: "ilt-tv", slug: "ilt20-2026-27", label: "ILT20 broadcasters", reviewAfter: "2026-11-21", detail: "The league schedule note does not list channels, and secondary lists disagree." },
  { id: "bbl-rest", slug: "bbl-2026-27", label: "Remaining BBL fixtures", reviewAfter: "2026-12-01", detail: "Only matches named in the 13 Jul 2026 Cricket Australia story are on the page." },
  { id: "bbl-tv", slug: "bbl-2026-27", label: "BBL broadcasters outside Australia", reviewAfter: "2026-12-01", detail: "Cricket Australia listed Seven, 7plus, Kayo, Foxtel and Fox Cricket only." },
  { id: "sa-rest", slug: "sa20-2027", label: "Rest of the SA20 fixture list", reviewAfter: "2027-01-01", detail: "Double-header days of 30 Jan, 6 Feb and 13 Feb have no sides in the league story." },
  { id: "sa-tv", slug: "sa20-2027", label: "SA20 broadcasters", reviewAfter: "2027-01-01", detail: "The fixture announcement did not list channels." },
  { id: "psl-fx", slug: "psl-2027", label: "PSL fixtures, venues and auction", reviewAfter: "2027-01-15", detail: "The 8 Oct 2026 PCB release confirms the window only." },
  { id: "ucl-ties", slug: "champions-league-2026-27", label: "UCL knockout ties and kick-off times", reviewAfter: "2027-02-01", detail: "UEFA published matchweeks and the final, not the clubs or a clock time." },
  { id: "ucl-tv", slug: "champions-league-2026-27", label: "UCL broadcasters", reviewAfter: "2027-02-01", detail: "The UEFA dates page does not list country channels." },
  { id: "captain-coach", slug: "all", label: "Captains and coaches", reviewAfter: "2026-11-21", detail: "No free feed used here publishes a verified captain or coach for these squads." },
  { id: "home-ground", slug: "all", label: "Official home grounds", reviewAfter: "2026-11-21", detail: "City on a fixture is not treated as a franchise's home ground unless the feed names the ground." },
  { id: "broadcasters", slug: "all", label: "Broadcasters", reviewAfter: "2026-11-21", detail: "No free structured feed lists legal broadcasters for these seasons. BBL Australia TV stays the Cricket Australia sentence already on that hub." },
];

export function dueFacts(slug: string, today = new Date().toISOString().slice(0, 10)) {
  return MANUAL_FACTS.filter((f) => f.slug === slug && f.reviewAfter <= today);
}

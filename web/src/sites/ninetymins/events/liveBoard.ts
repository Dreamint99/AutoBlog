import "server-only";
import { getCricket } from "../cricket";
import { getScores } from "../live";
import type { Hub, LiveHit } from "./types";

function slug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function cricketHref(id: string, home: string, away: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return "/cricket";
  return `/cricket/${id}-${`${slug(home)}-vs-${slug(away)}`.slice(0, 80)}`;
}

function footballHref(id: string, home: string, away: string) {
  if (!/^\d+$/.test(id)) return "/league/uefa-champions";
  return `/match/uefa-champions/${id}-${`${slug(home)}-vs-${slug(away)}`.slice(0, 80)}`;
}

/** Current matches from the same readers as /cricket and the Champions League board. */
export async function liveFor(hub: Hub): Promise<LiveHit[]> {
  try {
    if (hub.live.kind === "cricket") {
      const q = hub.live;
      const rows = await getCricket();
      return rows
        .filter((m) => {
          const hay = `${m.series || ""} ${m.name}`.toLowerCase();
          if (q.series.some((s) => hay.includes(s.toLowerCase()))) return true;
          const names = m.teams.map((t) => t.name.toLowerCase());
          return q.teams.some((t) => names.includes(t.toLowerCase()));
        })
        .map((m) => {
          const [a, b] = m.teams;
          const score = [a.score, b.score].filter(Boolean).join(" · ");
          const status = m.status || "";
          const winner = [a.name, b.name].find((n) => status.toLowerCase().startsWith(n.toLowerCase()));
          return {
            id: m.id,
            name: m.name,
            state: m.state,
            detail: status,
            date: m.date,
            href: cricketHref(m.id, a.name, b.name),
            home: a.name,
            away: b.name,
            score,
            winner,
            venue: m.venue,
          };
        });
    }
    if (hub.live.kind === "ucl") {
      const rows = await getScores("uefa.champions");
      return rows
        .filter((e) => e.home && e.away && e.state !== "post")
        .slice(0, 8)
        .map((e) => ({
          id: e.id,
          name: e.name,
          state: e.state,
          detail: e.detail,
          date: e.date,
          href: footballHref(e.id, e.home!.name, e.away!.name),
          home: e.home!.name,
          away: e.away!.name,
          score: [e.home!.score, e.away!.score].filter(Boolean).join(" – "),
        }));
    }
  } catch {
    return [];
  }
  return [];
}

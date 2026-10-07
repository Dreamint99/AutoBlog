import { NextResponse } from "next/server";
import { getScores, getStandings, getMatch, NM_LEAGUES } from "@/sites/ninetymins/live";

export const dynamic = "force-dynamic";

/* GET /api/scores?l=eng.1,nba[&d=YYYYMMDD] → { events: NmEvent[] }
   GET /api/scores?table=eng.1            → { table: NmStanding[] }
   GET /api/scores?match=eng.1:740123     → { match: NmMatch | null }
   NinetyMins only. Public at /api/scores (middleware rewrites to /s/<site>/…),
   which the edge cache-worker never caches — freshness is handled in live.ts. */
export async function GET(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  if (site !== "ninetymins") return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const headers = { "cache-control": "public, max-age=30" };

  const match = url.searchParams.get("match");
  if (match) {
    const [league, id] = match.split(":");
    return NextResponse.json({ match: await getMatch(league, id || "") }, { headers });
  }

  const table = url.searchParams.get("table");
  if (table) return NextResponse.json({ table: (await getStandings(table)).slice(0, 24) }, { headers });

  const date = url.searchParams.get("d") || "";
  const leagues = (url.searchParams.get("l") || "eng.1,uefa.champions,nba")
    .split(",")
    .filter((l) => l in NM_LEAGUES)
    .slice(0, 10);
  const lists = await Promise.all(leagues.map((l) => getScores(l, date)));
  return NextResponse.json({ events: lists.flat() }, { headers });
}

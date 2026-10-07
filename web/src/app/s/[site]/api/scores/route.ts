import { NextResponse } from "next/server";
import { getScores, getStandings, NM_LEAGUES } from "@/sites/ninetymins/live";

export const dynamic = "force-dynamic";

/* GET /api/scores?l=eng.1,nba            → { events: NmEvent[] }
   GET /api/scores?table=eng.1            → { table: NmStanding[] }
   NinetyMins only. Public at /api/scores (middleware rewrites to /s/<site>/…),
   which the edge cache-worker never caches — freshness is handled in live.ts. */
export async function GET(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  if (site !== "ninetymins") return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const headers = { "cache-control": "public, max-age=30" };

  const table = url.searchParams.get("table");
  if (table) return NextResponse.json({ table: (await getStandings(table)).slice(0, 20) }, { headers });

  const leagues = (url.searchParams.get("l") || "eng.1,uefa.champions,nba")
    .split(",")
    .filter((l) => l in NM_LEAGUES)
    .slice(0, 6);
  const lists = await Promise.all(leagues.map(getScores));
  return NextResponse.json({ events: lists.flat() }, { headers });
}

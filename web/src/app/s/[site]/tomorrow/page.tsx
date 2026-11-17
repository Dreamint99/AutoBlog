import { notFound } from "next/navigation";
import { getSite } from "@/lib/data";
import { Shell } from "@/sites/ninetymins/Chrome";
import { JsonLd } from "@/lib/seo";
import { fixtures } from "@/sites/ninetymins/engine";
import FixtureList, { itemList } from "@/sites/ninetymins/FixtureList";
export const dynamic = "force-dynamic";
export const metadata = { title: "Tomorrow's matches: fixtures & kick-off times", alternates: { canonical: "/tomorrow" } };
export default async function Tomorrow({ params }: { params: Promise<{ site: string }> }) {
  const site = getSite((await params).site);
  if (site?.id !== "ninetymins") notFound();
  const start = new Date(); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() + 1);
  const end = new Date(+start + 86400000);
  const fs = await fixtures("starts>=? AND starts<?", [start.toISOString(), end.toISOString()], 500);
  return <Shell site={site}><main className="nm-wrap nm-engine"><JsonLd data={itemList(fs)} /><h1>Tomorrow's matches</h1><p>{fs.length} confirmed fixtures for {start.toISOString().slice(0, 10)} (UTC calendar day). Open a match to see the kick-off in your time zone.</p><FixtureList fixtures={fs} /><p><a href="/today">Today's matches</a></p></main></Shell>;
}

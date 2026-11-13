import { notFound } from "next/navigation";
import { getSite } from "@/lib/data";
import { Shell } from "@/sites/ninetymins/Chrome";
import { recentFixtures } from "@/sites/ninetymins/engine";
export const dynamic = "force-dynamic";
export const metadata = { title: "Free live score widgets for your website", alternates: { canonical: "/widgets" } };
export default async function Widgets({ params }: { params: Promise<{ site: string }> }) {
  const site = getSite((await params).site);
  if (site?.id !== "ninetymins") notFound();
  const fs = await recentFixtures();
  return <Shell site={site}><main className="nm-wrap nm-engine"><h1>Free live score widgets</h1><p>Add real fixture and score data to your fan site, blog or newsroom with a lightweight iframe. No account or payment required. The source is ESPN; coverage depends on provider availability.</p><p>Copy an example below into your site's HTML. Attribution is optional; links use nofollow. Reloading the iframe refreshes the score.</p>
    {fs.slice(0, 5).map(f => <section key={f.key}><h2>{f.ev.home.name} vs {f.ev.away.name}</h2><a href={`/embed/match/${f.league}_${f.ev.id}`}>Preview match widget</a><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{`<iframe src="https://ninetymins.com/embed/match/${f.league}_${f.ev.id}" title="${f.ev.home.name.replace(/["<>]/g, "")} vs ${f.ev.away.name.replace(/["<>]/g, "")} scores" width="100%" height="320" loading="lazy" style="border:0"></iframe>`}</pre><p><a href={`/embed/league/${f.league}`}>League widget preview</a></p><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{`<iframe src="https://ninetymins.com/embed/league/${f.league}" title="Competition live scores" width="100%" height="480" loading="lazy" style="border:0"></iframe>`}</pre></section>)}
  </main></Shell>;
}

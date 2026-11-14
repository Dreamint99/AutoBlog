import Link from "next/link";
import type { Site } from "@/lib/types";
import { getFlagships, getModels, latestVerified } from "@/lib/models";
import { ModelTable, fmtDate } from "./data-ui";

/* Home section: today's API prices for the big labs' newest models, plus popular head-to-heads.
   Data comes from D1 (refreshed daily by workers/infkey-sync). */
export default async function LivePrices({ site }: { site: Site }) {
  const [flag, all] = await Promise.all([getFlagships(), getModels()]);
  if (flag.length === 0) return null;
  const b = `/s/${site.id}`;
  const top = flag.filter((m) => m.category === "llm").slice(0, 12);
  const byProv = new Map<string, (typeof flag)[number]>();
  for (const m of flag) if (m.category === "llm" && !byProv.has(m.provider)) byProv.set(m.provider, m);
  const leaders = [...byProv.values()].slice(0, 8);
  const pairs: [string, string, string][] = [];
  for (let i = 0; i < leaders.length && pairs.length < 10; i++)
    for (let j = i + 1; j < leaders.length && pairs.length < 10; j++)
      pairs.push([[leaders[i].id, leaders[j].id].sort().join("-vs-"), leaders[i].name, leaders[j].name]);
  return (
    <section className="ai-sec" id="live-prices">
      <div className="section-head">
        <h2>AI API prices today</h2>
        <span className="rule" />
      </div>
      <p className="src-note">
        Newest models from the big labs, USD per 1M tokens · {all.length} models tracked · updated {fmtDate(latestVerified(all))}
      </p>
      <ModelTable site={site} models={top} />
      <div className="cta-row">
        <Link className="btn btn-primary" href={`${b}/models`}>
          See all {all.length} models
        </Link>
        <Link className="btn btn-ghost" href={`${b}/changes`}>
          Today&apos;s price changes
        </Link>
        <Link className="btn btn-ghost" href={`${b}/calculators#calculator`}>
          Estimate your monthly cost
        </Link>
      </div>
      {pairs.length > 0 ? (
        <>
          <div className="section-head">
            <h2>Popular comparisons</h2>
            <span className="rule" />
          </div>
          <div className="vs-links">
            {pairs.map(([slug, a, c]) => (
              <Link className="vs-link" href={`${b}/compare/${slug}`} key={slug}>
                {a} <span className="vs">vs</span> {c}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

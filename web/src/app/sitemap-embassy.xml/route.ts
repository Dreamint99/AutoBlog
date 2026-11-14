import { urlset, xmlResponse, siteAndBase, abs } from "@/lib/gcc-sitemaps";
import { verifiedMissions, missionSlug } from "@/sites/gccguide/hub/embassy";
import { gate } from "@/sites/gccguide/hub/gate";

export async function GET() {
  const { base } = siteAndBase();
  const lastmod = new Date().toISOString().slice(0, 10);
  const entries = [
    { loc: abs(base, "/embassy"), lastmod, changefreq: "monthly" as const, priority: 0.9 },
    ...verifiedMissions()
      .filter((m) => gate.embassy(m.verified))
      .map((m) => ({ loc: abs(base, `/embassy/${missionSlug(m)}`), lastmod, changefreq: "monthly" as const, priority: 0.7 })),
  ];
  return xmlResponse(urlset(entries));
}

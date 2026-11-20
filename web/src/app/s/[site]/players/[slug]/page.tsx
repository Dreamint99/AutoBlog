import { notFound, permanentRedirect } from "next/navigation";
import { playerPathByNameSlug } from "@/sites/ninetymins/engine";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ site: string; slug: string }> };

/** Legacy /players/<name-slug> links (e.g. /players/dan-burn) 404'd. Send them to the real
 *  /player/<sport>-<id>-<name-slug> page when exactly one stored player has that name slug. */
export default async function LegacyPlayer({ params }: P) {
  const { site, slug } = await params;
  if (site !== "ninetymins" || !/^[a-z0-9-]{2,80}$/.test(slug)) notFound();
  const path = await playerPathByNameSlug(slug);
  if (!path) notFound();
  permanentRedirect(path);
}

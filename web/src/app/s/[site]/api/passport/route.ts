import { NextResponse } from "next/server";
import { getPassportByIso, getPiMeta } from "@/lib/passports";

export const dynamic = "force-dynamic";

/* GET /api/passport?iso=BD → { iso2, name, slug, rank, score, codes } (VisaPoint only).
   Used by the visa checker; D1 reads are cached per colo in lib/passports. */
export async function GET(req: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  if (site !== "walvi") return NextResponse.json({ error: "not found" }, { status: 404 });
  const sp = new URL(req.url).searchParams;
  const iso = (sp.get("iso") || "").slice(0, 2);
  const p = iso ? await getPassportByIso(iso) : null;
  if (!p) return NextResponse.json({ error: "unknown passport" }, { status: 404 });
  // ?dest=1 also returns the destination ISO order the codes are aligned with (travel map).
  const dest = sp.get("dest") ? (await getPiMeta())?.dest.map((d) => d.iso2) : undefined;
  return NextResponse.json(
    { iso2: p.iso2, name: p.name, slug: p.slug, rank: p.rank, score: p.score, codes: p.codes, dest },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}

import { sitemapResponse } from "@/lib/seo-sitemaps";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ seoMap: string }> }) {
  return sitemapResponse((await params).seoMap);
}

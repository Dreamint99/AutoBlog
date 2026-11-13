import { sitemapResponse } from "@/lib/seo-sitemaps";
export const dynamic = "force-dynamic";
export const GET = () => sitemapResponse("sitemap.xml");

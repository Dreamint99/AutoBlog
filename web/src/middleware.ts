import { NextResponse, type NextRequest } from "next/server";
import { DOMAIN_TO_SITE } from "@/lib/sites.config";

// When a deployment is pinned to ONE site (one Vercel project per site), set SITE_ID.
const FORCED_SITE = process.env.SITE_ID || "";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Let Next internals and real files (sitemap.xml, robots.txt, favicon…) through.
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // ── Single-site deployment: serve that site at the domain root with clean URLs. ──
  if (FORCED_SITE) {
    const prefix = `/s/${FORCED_SITE}`;
    // Internal links still point to /s/<id>/...; 308-redirect them to clean paths.
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.slice(prefix.length) || "/";
      return NextResponse.redirect(url, 308);
    }
    // Clean path → render via the existing /s/<id>/... routes (internal rewrite).
    const url = req.nextUrl.clone();
    url.pathname = `${prefix}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── Multi-site by custom domain (one project serving many domains). ──
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const site = DOMAIN_TO_SITE[host];
  if (site) {
    if (pathname.startsWith("/s/")) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = `/s/${site}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

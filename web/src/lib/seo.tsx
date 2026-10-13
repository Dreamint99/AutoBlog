import type { ReactElement } from "react";

/* Shared structured-data (JSON-LD) helpers.
   Google's SEO starter guide recommends structured data + breadcrumbs so pages
   are eligible for richer results. Schema MUST mirror visible page content —
   we never emit ratings/claims that aren't on the page. */

export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}): ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationSchema(name: string, base: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: base,
    description,
    // The per-site generated icon (192px) — gives Google a logo for the brand.
    logo: `${new URL(base).origin}/icon`,
  } as Record<string, unknown>;
}

export function websiteSchema(name: string, base: string) {
  const u = new URL(base);
  const isRoot = u.pathname === "/" || u.pathname === "";
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    // Google's site-name system shows the bare domain until it trusts a name;
    // naming the domain as an alternate helps it settle on `name`.
    ...(isRoot ? { alternateName: [u.hostname.replace(/^www\./, "")] } : {}),
    url: base,
  } as Record<string, unknown>;
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  } as Record<string, unknown>;
}

export function webAppSchema(opts: { name: string; url: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: opts.name,
    url: opts.url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: opts.description,
  } as Record<string, unknown>;
}

export function datasetSchema(opts: {
  name: string;
  url: string;
  description: string;
  creator: string;
  modified?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: opts.name,
    url: opts.url,
    description: opts.description,
    creator: { "@type": "Organization", name: opts.creator },
    ...(opts.modified ? { dateModified: opts.modified } : {}),
  } as Record<string, unknown>;
}

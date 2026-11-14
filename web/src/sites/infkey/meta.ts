import type { Metadata } from "next";
import type { Site } from "@/lib/types";
import { siteBaseUrl } from "@/lib/sites.config";
import { defaultOgImages } from "@/lib/og";

/** Shared page metadata for InfKey data pages. */
export function infMeta(site: Site, title: string, description: string, path: string, noindex = false): Metadata {
  return {
    title,
    description,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: { images: defaultOgImages(), title, description, type: "website", url: path },
    twitter: { card: "summary_large_image", title },
  };
}

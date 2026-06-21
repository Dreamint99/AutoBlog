import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getSite } from "@/lib/data";

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ site: string }>;
}) {
  const { site: id } = await params;
  const site = getSite(id);
  if (!site) notFound();
  // Per-site theme scope. Each site's theme.css targets `.site-<id>`.
  return <div className={`site site-${site.id}`}>{children}</div>;
}

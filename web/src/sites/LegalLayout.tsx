/**
 * Renders a legal/info page inside the correct per-site chrome so the About,
 * Contact, Privacy, Terms and Disclaimer pages match each site's own design.
 *   - countly → its InfoPage (kicker + title + .article-content)
 *   - walvi / infkey → their page Shell + a matching article-style header
 * Content lands in a `.article-content` container, which every theme styles.
 */
import type { ReactNode } from "react";
import type { Site } from "@/lib/types";
import CountlyInfoPage from "@/sites/countly/InfoPage";
import { WalviShell } from "@/sites/walvi/Chrome";
import { InfShell } from "@/sites/infkey/Chrome";
import { Shell as NmShell } from "@/sites/ninetymins/Chrome";

export function LegalLayout({
  site,
  kicker,
  title,
  children,
}: {
  site: Site;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  if (site.id === "countly") {
    return (
      <CountlyInfoPage site={site} kicker={kicker} title={title}>
        {children}
      </CountlyInfoPage>
    );
  }

  if (site.id === "ninetymins") {
    return (
      <NmShell site={site}>
        <div className="nm-wrap nm-legal">
          <span className="nm-art-kicker">{kicker}</span>
          <h1 className="nm-art-h">{title}</h1>
          <div className="article-content">{children}</div>
        </div>
      </NmShell>
    );
  }

  const Shell = site.id === "walvi" ? WalviShell : InfShell;
  return (
    <Shell site={site}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 0 56px" }}>
        <header className="article-head" style={{ marginBottom: 18 }}>
          <div className="article-cat">{kicker}</div>
          <h1 className="article-title">{title}</h1>
        </header>
        <div className="article-content">{children}</div>
      </div>
    </Shell>
  );
}

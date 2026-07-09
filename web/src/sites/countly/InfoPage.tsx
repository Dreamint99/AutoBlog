import "./theme.css";
import type { ReactNode } from "react";
import { fontVars } from "./fonts";
import type { Site } from "@/lib/types";
import { CnHeader, SiteFooter } from "./Home";

export default function InfoPage({
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
  return (
    <div className={`cn-root ${fontVars}`}>
      <CnHeader site={site} />
      <section className="cn-section">
        <div className="cn-wrap" style={{ maxWidth: 820 }}>
          <div className="cn-sec-head">
            <div>
              <span className="cn-sec-kicker">{kicker}</span>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="article-content">{children}</div>
        </div>
      </section>
      <SiteFooter siteName={site.name} siteId={site.id} domain={site.domain} />
    </div>
  );
}

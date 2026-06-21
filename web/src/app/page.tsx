import Link from "next/link";
import { getSites } from "@/lib/data";

export const dynamic = "force-dynamic";

// Local dev hub. In production each site is served from its own domain via middleware.
export default function Home() {
  const sites = getSites();
  return (
    <main className="hub">
      <h1>⚡ AutoBlog network</h1>
      <p className="muted">Local preview hub — each site has its own design. In production these live on their own domains.</p>
      <div className="hub-cards">
        {sites.map((s) => (
          <Link key={s.id} href={`/s/${s.id}`} className="hub-card">
            <b>{s.name}</b> — {s.tagline}
            <div className="muted">{s.domain} · {s.niche.split(",")[0]}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";

/* Hero quick finder: pick a destination and (optionally) a job → jump to the
   country register page or the job page. Plain links, works without JS too
   (the default selection is a valid link). */

type Opt = { slug: string; name: string; flag?: string };

export default function QuickFinder({ siteId, countries, jobs }: { siteId: string; countries: Opt[]; jobs: Opt[] }) {
  const [c, setC] = useState(countries[0]?.slug || "");
  const [j, setJ] = useState("");
  const href = j ? `/s/${siteId}/jobs/${j}` : `/s/${siteId}/countries/${c}`;
  const country = countries.find((x) => x.slug === c);
  return (
    <form className="vp-finder" action={href} onSubmit={(e) => { e.preventDefault(); window.location.href = href; }}>
      <span className="vp-finder-eyebrow">Quick finder</span>
      <h2>Where do you want to work?</h2>
      <label>
        <span>Destination</span>
        <select value={c} onChange={(e) => setC(e.target.value)}>
          {countries.map((x) => (
            <option key={x.slug} value={x.slug}>
              {x.flag ? `${x.flag} ` : ""}{x.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Your trade (optional)</span>
        <select value={j} onChange={(e) => setJ(e.target.value)}>
          <option value="">Any job</option>
          {jobs.map((x) => (
            <option key={x.slug} value={x.slug}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">
        {j ? "See salary by country" : `Explore ${country?.name ?? "country"}`} <span aria-hidden="true">→</span>
      </button>
      <p className="vp-finder-note">Salary, living cost, savings & the official work-permit route — free.</p>
    </form>
  );
}

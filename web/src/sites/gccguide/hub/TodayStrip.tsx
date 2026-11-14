import Link from "next/link";
import type { Site } from "@/lib/types";
import { getFxSnapshot, crossRate, getGold } from "@/lib/gcc";
import { buildFuelView } from "./fuel";
import { GRAMS_PER_OZ, INDEX } from "./config";
import { fmt, dateLong } from "./format";

/* "Today in the Gulf" — the home page strip.
 *
 * Four live numbers, each one link away from its own page: the dirham-rupee
 * rate, 22K gold in Dubai, the next prayer in the visitor's city (Dubai by
 * default; remembered with a tiny inline script), and the latest UAE fuel price.
 * Server-rendered: with JavaScript off you get Dubai, which is the honest
 * default for a Gulf audience.
 */

export default async function TodayStrip({ site }: { site: Site }) {
  const b = `/s/${site.id}`;
  const [snap, gold] = await Promise.all([getFxSnapshot(), getGold()]);
  const aedInr = crossRate(snap, "AED", "INR");
  const g22 = (gold.usdPerOz / GRAMS_PER_OZ) * (snap.byCode.AED?.rate ?? 3.6725) * 0.916;
  const fuel = buildFuelView("uae");
  const p95 = fuel?.rows.find((r) => /95/.test(r.grade)) ?? fuel?.rows[0];
  const updated = snap.updated.slice(0, 10);

  return (
    <section className="gh-today" aria-label="Today in the Gulf">
      <Link href={`${b}/rates/aed-to-inr`}>
        <span className="k">1 AED buys</span>
        <span className="v">
          {aedInr == null ? "—" : fmt(aedInr, 2)} <small style={{ fontSize: 13, color: "var(--muted)" }}>INR</small>
        </span>
        <span className="s">{dateLong(updated)} · mid-market</span>
      </Link>

      <Link href={`${b}/gold-rate/dubai`}>
        <span className="k">22K gold · Dubai</span>
        <span className="v">
          AED {fmt(g22, 2)} <small style={{ fontSize: 13, color: "var(--muted)" }}>/g</small>
        </span>
        <span className="s">spot-based, before making charges</span>
      </Link>

      <Link href={`${b}/prayer-times/uae/dubai`}>
        <span className="k">Prayer times · Dubai</span>
        <span className="v" id="gh-next-prayer">
          See today
        </span>
        <span className="s">Fajr to Isha, full month</span>
      </Link>

      <Link href={`${b}/fuel-price/uae`}>
        <span className="k">Petrol 95 · UAE</span>
        <span className="v">
          {p95 ? `${p95.currency} ${fmt(p95.price, 3)}` : "—"} <small style={{ fontSize: 13, color: "var(--muted)" }}>/L</small>
        </span>
        <span className="s">{fuel?.monthLabel ?? ""}</span>
      </Link>

      {INDEX.prayer ? (
        // Progressive enhancement only: swaps the third card to the visitor's last
        // chosen city. Without it the Dubai card still works.
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var s=localStorage.getItem("gcc.city");if(!s)return;var p=s.split("/");if(p.length<2)return;' +
              'var a=document.querySelector(\'.gh-today a[href*="/prayer-times/"]\');if(!a)return;' +
              'a.setAttribute("href",a.getAttribute("href").replace(/\\/prayer-times\\/[^/]+\\/[^/?#]+/,"/prayer-times/"+p[0]+"/"+p[1]));' +
              'var k=a.querySelector(".k");if(k)k.textContent="Prayer times · "+p[2];}catch(e){}})();',
          }}
        />
      ) : null}
    </section>
  );
}

import Link from "next/link";
import type { Site } from "@/lib/types";
import "./hub.css";

/* Home section: the daily-data hub (rates, gold, fuel, calculators, prayer, embassies, fees,
   holidays) as one scannable grid, so the home page matches what the site now offers. */

const TILES: { icon: string; title: string; text: string; path: string }[] = [
  { icon: "💱", title: "Exchange rates", text: "AED, SAR, QAR, KWD, OMR, BHD to INR, PKR, BDT, PHP — updated 3× a day", path: "rates" },
  { icon: "🪙", title: "Gold rate today", text: "24K, 22K, 21K and 18K per gram in 14 Gulf cities", path: "gold-rate" },
  { icon: "⛽", title: "Petrol prices", text: "Official monthly fuel prices in all six countries", path: "fuel-price" },
  { icon: "🧮", title: "Salary & gratuity calculators", text: "End-of-service, overtime, leave and notice — from the labour law", path: "calculators" },
  { icon: "🕌", title: "Prayer times", text: "385 Gulf cities, monthly tables and Qibla", path: "prayer-times" },
  { icon: "🏛️", title: "Embassies & consulates", text: "Addresses, phones and official sites for 76 missions", path: "embassy" },
  { icon: "🛂", title: "Visa & residence fees", text: "Official fee tables for each country", path: "visa-fees" },
  { icon: "📅", title: "Public holidays", text: "2026 and 2027 calendars for all six countries", path: "public-holidays" },
];

export default function HomeData({ site }: { site: Site }) {
  const b = `/s/${site.id}`;
  return (
    <section className="gc-sec" id="data">
      <div className="gc-head">
        <h2>Daily rates & money tools</h2>
        <p>Real numbers with their official source and update date — checked every day.</p>
      </div>
      <div className="gh-hometiles">
        {TILES.map((t) => (
          <Link key={t.path} href={`${b}/${t.path}`}>
            <span className="ic" aria-hidden="true">
              {t.icon}
            </span>
            <span className="tt">{t.title}</span>
            <span className="tx">{t.text}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

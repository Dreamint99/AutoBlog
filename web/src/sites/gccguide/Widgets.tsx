"use client";

import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, type Country } from "./data";

/* Live, keyless city widget: local time, prayer times (AlAdhan API) and
   current weather (Open-Meteo). Used on country pages. */

function useNow(ms = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const timeIn = (d: Date, tz: string, sec = false) =>
  d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", ...(sec ? { second: "2-digit" } : {}) });

type Prayer = { name: string; time: string };
export function CityPulse({ initial = "qatar" }: { initial?: string }) {
  const [slug, setSlug] = useState(initial);
  const c = useMemo(() => COUNTRIES.find((x) => x.slug === slug) as Country, [slug]);
  const now = useNow(30000);
  const [prayers, setPrayers] = useState<Prayer[] | null>(null);
  const [wx, setWx] = useState<{ t: number; feels: number; hum: number; wind: number } | null>(null);
  useEffect(() => {
    setPrayers(null);
    setWx(null);
    fetch(`https://api.aladhan.com/v1/timings?latitude=${c.lat}&longitude=${c.lng}&method=4`)
      .then((r) => r.json())
      .then((j) => {
        const t = j?.data?.timings;
        if (t) setPrayers(["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"].map((n) => ({ name: n, time: String(t[n]).slice(0, 5) })));
      })
      .catch(() => {});
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m`)
      .then((r) => r.json())
      .then((j) => j?.current && setWx({ t: j.current.temperature_2m, feels: j.current.apparent_temperature, hum: j.current.relative_humidity_2m, wind: j.current.wind_speed_10m }))
      .catch(() => {});
  }, [c]);
  const local = now ? timeIn(now, c.tz) : "";
  const next = prayers?.find((p) => p.name !== "Sunrise" && p.time > local) ?? prayers?.[0];
  return (
    <div className="gc-card gc-pulse">
      <div className="gc-card-h">
        <span>📍</span>
        <b>City pulse</b>
        <select value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="City">
          {COUNTRIES.map((x) => (
            <option key={x.slug} value={x.slug}>
              {x.city}
            </option>
          ))}
        </select>
      </div>
      <div className="gc-pulse-top">
        <div>
          <span className="gc-k">Local time</span>
          <b className="gc-big">{local || "--:--"}</b>
          <span className="gc-s">{c.utc}</span>
        </div>
        <div>
          <span className="gc-k">Weather now</span>
          <b className="gc-big">{wx ? `${Math.round(wx.t)}°` : "…"}</b>
          <span className="gc-s">{wx ? `feels ${Math.round(wx.feels)}° · ${wx.hum}% humidity` : "loading"}</span>
        </div>
      </div>
      <div className="gc-prayers">
        {(prayers || Array.from({ length: 6 }, (_, i) => ({ name: ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"][i], time: "--:--" }))).map((p) => (
          <div key={p.name} className={next && next.name === p.name ? "on" : ""}>
            <span>{p.name}</span>
            <b>{p.time}</b>
          </div>
        ))}
      </div>
      <p className="gc-note">Prayer times: AlAdhan (Umm al-Qura method) · weather: Open-Meteo. Times can differ slightly from your local mosque.</p>
    </div>
  );
}

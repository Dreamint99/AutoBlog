"use client";

import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, flag, type Country } from "./data";

/* Live, keyless widgets: local clocks, GCC currency converter (official pegs),
   prayer times (AlAdhan API) and current weather (Open-Meteo). */

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

export function Clocks({ base }: { base: string }) {
  const now = useNow();
  return (
    <div className="gc-clocks" aria-label="Local time across the GCC">
      {COUNTRIES.map((c) => (
        <a key={c.slug} href={`${base}/country/${c.slug}`} className="gc-clock">
          <img src={flag(c.iso, 40)} alt="" width={22} height={15} />
          <span className="n">{c.short}</span>
          <b>{now ? timeIn(now, c.tz) : "--:--"}</b>
        </a>
      ))}
    </div>
  );
}

export function Converter() {
  const [amt, setAmt] = useState("1000");
  const [from, setFrom] = useState("QAR");
  const units = [{ code: "USD", perUsd: 1, iso: "us", name: "US dollar" }, ...COUNTRIES.map((c) => ({ code: c.code, perUsd: c.perUsd, iso: c.iso, name: c.currency })), { code: "BDT", perUsd: 0, iso: "bd", name: "Bangladeshi taka" }, { code: "INR", perUsd: 0, iso: "in", name: "Indian rupee" }, { code: "PKR", perUsd: 0, iso: "pk", name: "Pakistani rupee" }, { code: "PHP", perUsd: 0, iso: "ph", name: "Philippine peso" }];
  const [live, setLive] = useState<Record<string, number>>({});
  useEffect(() => {
    // free, keyless daily rates for the home-country currencies (GCC pegs are fixed)
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((j) => j?.rates && setLive({ BDT: j.rates.BDT, INR: j.rates.INR, PKR: j.rates.PKR, PHP: j.rates.PHP, KWD: j.rates.KWD }))
      .catch(() => {});
  }, []);
  const rate = (code: string) => live[code] || units.find((u) => u.code === code)?.perUsd || 0;
  const usd = (Number(amt) || 0) / (rate(from) || 1);
  return (
    <div className="gc-card gc-conv">
      <div className="gc-card-h">
        <span>💱</span>
        <b>GCC money converter</b>
      </div>
      <div className="gc-conv-in">
        <input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ""))} aria-label="Amount" />
        <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From currency">
          {units.map((u) => (
            <option key={u.code} value={u.code}>
              {u.code}
            </option>
          ))}
        </select>
      </div>
      <ul className="gc-conv-out">
        {units
          .filter((u) => u.code !== from && rate(u.code))
          .map((u) => (
            <li key={u.code}>
              <img src={flag(u.iso, 40)} alt="" width={20} height={14} />
              <span>{u.code}</span>
              <b>{(usd * rate(u.code)).toLocaleString("en-US", { maximumFractionDigits: u.code === "KWD" || u.code === "OMR" || u.code === "BHD" ? 3 : 2 })}</b>
            </li>
          ))}
      </ul>
      <p className="gc-note">QAR, AED, SAR, OMR and BHD are pegged to the US dollar; KWD and home currencies use today&apos;s market rate. Banks and exchange houses add a margin.</p>
    </div>
  );
}

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

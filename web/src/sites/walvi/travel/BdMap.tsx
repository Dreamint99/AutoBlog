"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoArea, geoCentroid, geoDistance, geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature, neighbors } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import RAW from "@/data/bd-districts.json";
import { THEMES, THEME_LABEL, loadImg, type Theme } from "./TravelMap";

/* "Districts of Bangladesh I've visited" map maker — 64 zila, 8 divisions.
   Boundaries: geoBoundaries BGD ADM2 (CC BY 4.0), simplified to /geo/bd-districts.json.
   Like the world map, everything stays in the browser (photo is never uploaded). */

type D = { bn: string; div: string; fam: string; t: string[] };
const DATA = RAW as Record<string, D>;
const NAMES = Object.keys(DATA).sort((a, b) => a.localeCompare(b));
const TOTAL = NAMES.length; // 64
const DIVS = ["Dhaka", "Chattogram", "Rajshahi", "Khulna", "Barishal", "Sylhet", "Rangpur", "Mymensingh"];
const DIV_BN: Record<string, string> = { Dhaka: "ঢাকা", Chattogram: "চট্টগ্রাম", Rajshahi: "রাজশাহী", Khulna: "খুলনা", Barishal: "বরিশাল", Sylhet: "সিলেট", Rangpur: "রংপুর", Mymensingh: "ময়মনসিংহ" };
const DIV_TOTAL = Object.fromEntries(DIVS.map((d) => [d, NAMES.filter((n) => DATA[n].div === d).length]));
// display spellings for the boundary file's names
const EN: Record<string, string> = { Barisal: "Barishal", Bogra: "Bogura", Brahamanbaria: "Brahmanbaria", Chittagong: "Chattogram", Comilla: "Cumilla", Jessore: "Jashore", Maulvibazar: "Moulvibazar", Nawabganj: "Chapai Nawabganj" };
const en = (n: string) => EN[n] || n;
const GEO = "/geo/bd-districts.json";
const STORE = "vp-bd-map-v1";
const KM = 6371;

type Badge = { id: string; e: string; name: string; hint: string; test: (v: Set<string>, divs: number) => boolean };
const tagged = (t: string) => NAMES.filter((n) => DATA[n].t.includes(t));
const has = (v: Set<string>, list: string[], min = list.length) => list.filter((n) => v.has(n)).length >= min;
const BADGES: Badge[] = [
  { id: "sea", e: "🏖️", name: "Sea Lover", hint: "Visit 3 coastal districts", test: (v) => has(v, tagged("sea"), 3) },
  { id: "cox", e: "🌊", name: "Longest Beach", hint: "Visit Cox's Bazar", test: (v) => v.has("Cox's Bazar") },
  { id: "hill", e: "⛰️", name: "Hill Tracker", hint: "All 3 hill districts: Bandarban, Rangamati, Khagrachhari", test: (v) => has(v, ["Bandarban", "Rangamati", "Khagrachhari"]) },
  { id: "tea", e: "🍃", name: "Tea Trail", hint: "Sylhet, Moulvibazar and Habiganj", test: (v) => has(v, ["Sylhet", "Maulvibazar", "Habiganj"]) },
  { id: "mangrove", e: "🐅", name: "Tiger Country", hint: "A Sundarbans district: Khulna, Bagerhat or Satkhira", test: (v) => has(v, tagged("mangrove"), 1) },
  { id: "haor", e: "🛶", name: "Haor Explorer", hint: "2 haor & wetland districts", test: (v) => has(v, tagged("haor"), 2) },
  { id: "heritage", e: "🏛️", name: "Heritage Hunter", hint: "5 districts with famous ruins, forts or palaces", test: (v) => has(v, tagged("heritage"), 5) },
  { id: "river", e: "⛴️", name: "River Nomad", hint: "8 river districts", test: (v) => has(v, tagged("river"), 8) },
  { id: "north", e: "🏔️", name: "Kanchenjunga View", hint: "Panchagarh, the northern tip", test: (v) => v.has("Panchagarh") },
  { id: "half", e: "🧭", name: "Half Way", hint: "32 districts", test: (v) => v.size >= 32 },
  { id: "divs", e: "🗺️", name: "All 8 Divisions", hint: "At least one district in every division", test: (_, d) => d >= 8 },
  { id: "all", e: "🏆", name: "Shonar Bangla", hint: "All 64 districts", test: (v) => v.size >= TOTAL },
];
const LEVELS = [
  { min: 0, name: "Ghor-kuno", e: "🏡" },
  { min: 3, name: "Weekend Tripper", e: "🎒" },
  { min: 10, name: "Bhromon Pagol", e: "🚌" },
  { min: 20, name: "Desh Explorer", e: "🧭" },
  { min: 35, name: "Zila Hunter", e: "🗺️" },
  { min: 50, name: "Bangla Nomad", e: "🛶" },
  { min: 64, name: "Shonar Bangla Legend", e: "🏆" },
];
const levelOf = (n: number) => {
  const i = LEVELS.reduce((a, l, k) => (n >= l.min ? k : a), 0);
  return { ...LEVELS[i], next: LEVELS[i + 1] };
};

type F = Feature<Geometry, { name: string }>;
type Geo = { feats: F[]; nb: Map<string, string[]>; area: Map<string, number>; cen: Map<string, [number, number]> };
let geoP: Promise<Geo> | null = null;
const loadGeo = () =>
  (geoP ??= fetch(GEO)
    .then((r) => r.json())
    .then((t) => {
      const fc = feature(t, t.objects.adm2) as unknown as { features: F[] };
      const geoms = t.objects.adm2.geometries as { properties: { name: string } }[];
      const nbIdx = neighbors(t.objects.adm2.geometries);
      const nb = new Map(geoms.map((g, i) => [g.properties.name, nbIdx[i].map((j: number) => geoms[j].properties.name)]));
      const area = new Map(fc.features.map((f) => [f.properties.name, geoArea(f) * KM * KM]));
      const cen = new Map(fc.features.map((f) => [f.properties.name, geoCentroid(f) as [number, number]]));
      return { feats: fc.features, nb, area, cen };
    }));

const dist = (g: Geo | null, a: string, b: string) => {
  const pa = g?.cen.get(a);
  const pb = g?.cen.get(b);
  return pa && pb ? Math.round(geoDistance(pa, pb) * KM) : 0;
};
const fmt = (n: number) => n.toLocaleString("en-US");

export default function BdMap() {
  const [visited, setVisited] = useState<string[]>([]);
  const [home, setHome] = useState("Dhaka");
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [theme, setTheme] = useState<Theme>("neon");
  const [lang, setLang] = useState<"en" | "bn">("bn");
  const [geo, setGeo] = useState<Geo | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; n: string } | null>(null);
  const [div, setDiv] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const ready = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGeo().then(setGeo).catch(() => {});
    const u = new URL(window.location.href);
    const d = u.searchParams.get("d");
    if (d) {
      setVisited(d.split(".").map((x) => NAMES[parseInt(x, 36)]).filter(Boolean));
      const h = NAMES[parseInt(u.searchParams.get("h") || "", 36)];
      if (h) setHome(h);
      setName((u.searchParams.get("n") || "").slice(0, 40));
    } else {
      try {
        const s = JSON.parse(localStorage.getItem(STORE) || "{}");
        if (Array.isArray(s.v)) setVisited(s.v.filter((x: string) => DATA[x]));
        if (DATA[s.h]) setHome(s.h);
        if (typeof s.n === "string") setName(s.n);
        if (s.t in THEMES) setTheme(s.t);
        if (s.l === "en" || s.l === "bn") setLang(s.l);
      } catch {}
    }
    ready.current = true;
  }, []);
  useEffect(() => {
    if (!ready.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ v: visited, h: home, n: name, t: theme, l: lang }));
    } catch {}
  }, [visited, home, name, theme, lang]);

  const all = useMemo(() => new Set([home, ...visited]), [visited, home]);
  const label = (n: string) => (lang === "bn" ? DATA[n]?.bn || n : en(n));
  const toggle = (n: string) => {
    if (n === home || !DATA[n]) return;
    setVisited((v) => (v.includes(n) ? v.filter((x) => x !== n) : [...v, n]));
  };

  const ins = useMemo(() => {
    const away = visited.filter((v) => v !== home);
    const perDiv = DIVS.map((d) => ({ d, n: [...all].filter((x) => DATA[x]?.div === d).length, total: DIV_TOTAL[d] }));
    const divs = perDiv.filter((p) => p.n > 0).length;
    const totalArea = geo ? [...geo.area.values()].reduce((s, a) => s + a, 0) : 1;
    const seenArea = geo ? [...all].reduce((s, n) => s + (geo.area.get(n) || 0), 0) : 0;
    const ds = away.map((n) => ({ n, km: dist(geo, home, n) })).sort((a, b) => b.km - a.km);
    const lat = (n: string) => geo?.cen.get(n)?.[1] ?? 0;
    const lng = (n: string) => geo?.cen.get(n)?.[0] ?? 0;
    const arr = [...all];
    const pick = (f: (n: string) => number) => arr.reduce((b, n) => (f(n) > f(b) ? n : b), arr[0]);
    const nextCount = new Map<string, number>();
    for (const n of arr) for (const x of geo?.nb.get(n) || []) if (!all.has(x)) nextCount.set(x, (nextCount.get(x) || 0) + 1);
    const next = [...nextCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);
    const earned = BADGES.filter((b) => b.test(all, divs));
    return {
      count: all.size,
      away: away.length,
      pct: Math.round((all.size / TOTAL) * 1000) / 10,
      areaPct: Math.round((seenArea / totalArea) * 1000) / 10,
      seenArea: Math.round(seenArea),
      perDiv,
      divs,
      farthest: ds[0] || null,
      totalKm: ds.reduce((s, d) => s + d.km, 0),
      north: pick(lat),
      south: pick((n) => -lat(n)),
      east: pick(lng),
      west: pick((n) => -lng(n)),
      beaches: [...all].filter((n) => DATA[n]?.t.includes("sea")).length,
      hills: [...all].filter((n) => DATA[n]?.t.includes("hill")).length,
      next,
      earned,
      level: levelOf(all.size),
    };
  }, [visited, home, all, geo]);

  const W = 600;
  const H = 760;
  const proj = useMemo(
    () => (geo ? geoMercator().fitExtent([[12, 12], [W - 12, H - 12]], { type: "FeatureCollection", features: geo.feats } as GeoPermissibleObjects) : null),
    [geo],
  );
  const path = useMemo(() => (proj ? geoPath(proj) : null), [proj]);
  const T = THEMES[theme];

  const shareUrl = () => {
    const u = new URL(window.location.href);
    u.search = "";
    u.searchParams.set("d", visited.map((v) => NAMES.indexOf(v).toString(36)).join("."));
    u.searchParams.set("h", NAMES.indexOf(home).toString(36));
    if (name.trim()) u.searchParams.set("n", name.trim());
    return u.toString();
  };

  const render = async (story: boolean): Promise<Blob | null> => {
    const g = geo ?? (await loadGeo());
    const CW = 1080;
    const CH = story ? 1920 : 1080;
    const cv = document.createElement("canvas");
    cv.width = CW;
    cv.height = CH;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const fam = (root.current && getComputedStyle(root.current).getPropertyValue("--tm-font").trim()) || "'Segoe UI', Arial, sans-serif";
    try {
      await Promise.all([document.fonts.load(`800 100px ${fam}`), document.fonts.load(`600 30px ${fam}`)]);
    } catch {}
    const font = (w: number, s: number) => `${w} ${s}px ${fam}, 'Nirmala UI', 'Noto Sans Bengali', sans-serif`;
    const pad = 64;
    const bg = ctx.createLinearGradient(0, 0, CW, CH);
    bg.addColorStop(0, T.bg[0]);
    bg.addColorStop(1, T.bg[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, CH);

    // map: right column on the square post, centre on the story
    const box = story ? [pad + 40, 470, CW - pad - 40, 1450] : [470, 60, CW - 40, CH - 110];
    const pj = geoMercator().fitExtent([[box[0], box[1]], [box[2], box[3]]], { type: "FeatureCollection", features: g.feats } as GeoPermissibleObjects);
    const p = geoPath(pj, ctx);
    for (const f of g.feats) {
      const n = f.properties.name;
      const isH = n === home;
      const isV = all.has(n);
      ctx.beginPath();
      p(f);
      ctx.fillStyle = isH ? T.home : isV ? T.visited : T.land;
      if (T.glow && isV) {
        ctx.shadowColor = isH ? T.home : T.visited;
        ctx.shadowBlur = 12;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = T.line;
      ctx.stroke();
    }
    const hc = g.cen.get(home);
    const hxy = hc ? pj(hc) : null;
    if (hxy) {
      ctx.save();
      ctx.strokeStyle = T.arc;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      for (const v of visited) {
        const c = g.cen.get(v);
        const xy = c ? pj(c) : null;
        if (!xy || v === home) continue;
        ctx.beginPath();
        ctx.moveTo(hxy[0], hxy[1]);
        ctx.quadraticCurveTo((hxy[0] + xy[0]) / 2, Math.min(hxy[1], xy[1]) - 40, xy[0], xy[1]);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = T.arc;
      ctx.beginPath();
      ctx.arc(hxy[0], hxy[1], 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // text column
    let y = story ? 120 : 90;
    const av = 112;
    if (photo) {
      const img = await loadImg(photo);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pad + av / 2, y + av / 2, av / 2, 0, Math.PI * 2);
        ctx.clip();
        const s = Math.max(av / img.width, av / img.height);
        ctx.drawImage(img, pad + (av - img.width * s) / 2, y + (av - img.height * s) / 2, img.width * s, img.height * s);
        ctx.restore();
        ctx.lineWidth = 6;
        ctx.strokeStyle = T.visited;
        ctx.beginPath();
        ctx.arc(pad + av / 2, y + av / 2, av / 2 + 4, 0, Math.PI * 2);
        ctx.stroke();
        y += av + 40;
      }
    }
    ctx.fillStyle = T.sub;
    ctx.font = font(600, 28);
    ctx.fillText((name.trim() ? `${name.trim()} has explored` : "I have explored").toUpperCase(), pad, y);
    ctx.fillStyle = T.text;
    ctx.font = font(800, story ? 120 : 132);
    ctx.fillText(`${ins.count}/64`, pad, y + (story ? 118 : 128));
    ctx.font = font(800, story ? 46 : 40);
    ctx.fillText("districts of Bangladesh", pad, y + (story ? 175 : 180));
    ctx.fillStyle = T.visited;
    ctx.font = font(800, story ? 40 : 34);
    ctx.fillText("আমার বাংলাদেশ", pad, y + (story ? 232 : 232));

    const stats: [string, string][] = [
      [`${ins.areaPct}%`, "of the land"],
      [`${ins.divs}/8`, "divisions"],
      [`${fmt(ins.totalKm)}`, "km from home"],
    ];
    if (story) {
      const sy = 1530;
      const sw = (CW - pad * 2) / 3;
      stats.forEach(([v, l], i) => {
        ctx.fillStyle = T.text;
        ctx.font = font(800, 60);
        ctx.fillText(v, pad + i * sw, sy);
        ctx.fillStyle = T.sub;
        ctx.font = font(600, 24);
        ctx.fillText(l.toUpperCase(), pad + i * sw, sy + 36);
      });
    } else {
      let sy = y + 320;
      for (const [v, l] of stats) {
        ctx.fillStyle = T.text;
        ctx.font = font(800, 58);
        ctx.fillText(v, pad, sy);
        ctx.fillStyle = T.sub;
        ctx.font = font(600, 22);
        ctx.fillText(l.toUpperCase(), pad, sy + 32);
        sy += 112;
      }
    }
    // level + badges
    const by = story ? 1640 : CH - 250;
    ctx.font = font(800, 26);
    const lv = `${ins.level.e} ${ins.level.name.toUpperCase()}`;
    const lw = ctx.measureText(lv).width + 40;
    ctx.fillStyle = T.visited;
    ctx.beginPath();
    ctx.roundRect(pad, by, lw, 50, 25);
    ctx.fill();
    ctx.fillStyle = theme === "paper" ? "#f4ead3" : "#120a2a";
    ctx.fillText(lv, pad + 20, by + 35);
    ctx.font = font(400, 44);
    ctx.fillStyle = T.text;
    const maxB = story ? 10 : 6;
    ins.earned.slice(0, maxB).forEach((b, i) => ctx.fillText(b.e, pad + i * 58, by + 112));

    ctx.fillStyle = T.sub;
    ctx.font = font(600, 24);
    ctx.fillText("MAKE YOUR OWN ZILA MAP", pad, CH - 50);
    ctx.fillStyle = T.text;
    ctx.font = font(800, 32);
    const brand = "visapoint.net/bangladesh-map";
    ctx.fillText(brand, CW - pad - ctx.measureText(brand).width, CH - 50);
    return new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
  };

  const download = async (story: boolean) => {
    setBusy(true);
    try {
      const blob = await render(story);
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `my-bangladesh-map-${story ? "story" : "post"}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    setBusy(true);
    try {
      const blob = await render(false);
      const file = blob ? new File([blob], "my-bangladesh-map.png", { type: "image/png" }) : null;
      const data: ShareData = { title: "My Bangladesh map", text: `I've explored ${ins.count} of 64 districts of Bangladesh! Make yours:`, url: shareUrl() };
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ ...data, files: [file] });
      else if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(shareUrl());
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
    } finally {
      setBusy(false);
    }
  };

  const homeC = geo?.cen.get(home);
  const homeXY = homeC && proj ? proj(homeC) : null;
  const list = div === "ALL" ? NAMES : NAMES.filter((n) => DATA[n].div === div);

  return (
    <div className="tm bd" ref={root}>
      <div className="tm-grid">
        <div className={`tm-map tm-${theme}`}>
          <div className="tm-map-head">
            <div>
              <b>{ins.count}/64</b>
              <span>districts</span>
            </div>
            <div>
              <b>{ins.areaPct}%</b>
              <span>of the land</span>
            </div>
            <div>
              <b>{ins.divs}/8</b>
              <span>divisions</span>
            </div>
            <div className="tm-level">
              <b>
                {ins.level.e} {ins.level.name}
              </b>
              <span>{ins.level.next ? `${ins.level.next.min - ins.count} more to ${ins.level.next.name}` : "Top level!"}</span>
            </div>
          </div>
          <div className="bd-lang" role="radiogroup" aria-label="Label language">
            {(["bn", "en"] as const).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={lang === l} className={lang === l ? "on" : ""} onClick={() => setLang(l)}>
                {l === "bn" ? "বাংলা" : "English"}
              </button>
            ))}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Map of the 64 districts of Bangladesh — tap the ones you have visited">
            <defs>
              <filter id="bd-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {geo && path
              ? geo.feats.map((f) => {
                  const n = f.properties.name;
                  const isH = n === home;
                  const isV = all.has(n);
                  return (
                    <path
                      key={n}
                      d={path(f) || ""}
                      fill={isH ? T.home : isV ? T.visited : T.land}
                      stroke={T.line}
                      strokeWidth={0.8}
                      filter={T.glow && isV ? "url(#bd-glow)" : undefined}
                      className="tm-c"
                      onClick={() => toggle(n)}
                      onMouseMove={(e) => {
                        const b = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                        setTip({ x: e.clientX - b.left, y: e.clientY - b.top, n });
                      }}
                      onMouseLeave={() => setTip(null)}
                    />
                  );
                })
              : null}
            {homeXY && geo && proj
              ? visited
                  .filter((v) => v !== home)
                  .map((v) => {
                    const c = geo.cen.get(v);
                    const xy = c ? proj(c) : null;
                    if (!xy) return null;
                    const mx = (homeXY[0] + xy[0]) / 2;
                    const my = Math.min(homeXY[1], xy[1]) - 30;
                    return <path key={`a-${v}`} d={`M${homeXY[0]},${homeXY[1]} Q${mx},${my} ${xy[0]},${xy[1]}`} className="tm-arc" fill="none" stroke={T.arc} strokeWidth={1.6} />;
                  })
              : null}
            {geo && proj
              ? geo.feats.map((f) => {
                  const n = f.properties.name;
                  const xy = proj(geo.cen.get(n)!);
                  return xy ? (
                    <text key={`l-${n}`} x={xy[0]} y={xy[1] + 3} className={`tm-label bd-label${all.has(n) ? " on" : ""}`} fill={T.text} stroke={T.bg[0]}>
                      {label(n)}
                    </text>
                  ) : null;
                })
              : null}
            {homeXY ? (
              <g className="tm-home-pin">
                <circle cx={homeXY[0]} cy={homeXY[1]} r={10} fill="none" stroke={T.arc} strokeWidth={1.6} className="tm-pulse" />
                <circle cx={homeXY[0]} cy={homeXY[1]} r={4.5} fill={T.arc} />
              </g>
            ) : null}
          </svg>
          {!geo ? <div className="tm-loading">Loading Bangladesh map…</div> : null}
          {tip && DATA[tip.n] ? (
            <div className="tm-tip" style={{ left: tip.x + 14, top: tip.y + 14 }}>
              <b>
                {en(tip.n)} · {DATA[tip.n].bn}
                {tip.n === home ? " · home" : all.has(tip.n) ? " ✓" : ""}
              </b>
              <span>{DATA[tip.n].div} division</span>
              <span>{DATA[tip.n].fam}</span>
            </div>
          ) : null}
          <p className="tm-hint">Tap a district, or pick from the list. The pin is your home district; lines show your trips from home.</p>
        </div>

        <aside className="tm-panel">
          <label className="tm-field">
            <span>Your name (shown on the image)</span>
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahim Uddin" />
          </label>
          <div className="tm-photo">
            {photo ? <img src={photo} alt="" /> : <span aria-hidden="true">📷</span>}
            <label className="vp-btn vp-btn-outline">
              {photo ? "Change photo" : "Add your photo"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => setPhoto(String(r.result || ""));
                  r.readAsDataURL(f);
                }}
              />
            </label>
            {photo ? (
              <button type="button" className="tm-link" onClick={() => setPhoto("")}>
                Remove
              </button>
            ) : null}
          </div>
          <p className="tm-privacy">Your photo stays on your device — it is never uploaded.</p>
          <label className="tm-field">
            <span>Home district (নিজ জেলা)</span>
            <select value={home} onChange={(e) => setHome(e.target.value)}>
              {NAMES.map((n) => (
                <option key={n} value={n}>
                  {en(n)} — {DATA[n].bn}
                </option>
              ))}
            </select>
          </label>
          <label className="tm-field">
            <span>Add a district — all 64</span>
            <select
              value=""
              onChange={(e) => {
                toggle(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Select a district…</option>
              {DIVS.map((d) => (
                <optgroup key={d} label={`${d} division · ${DIV_BN[d]}`}>
                  {NAMES.filter((n) => DATA[n].div === d && n !== home).map((n) => (
                    <option key={n} value={n}>
                      {all.has(n) ? "✓ " : ""}
                      {en(n)} — {DATA[n].bn}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="tm-theme" role="radiogroup" aria-label="Map style">
            {(Object.keys(THEMES) as Theme[]).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={theme === t} className={`tm-sw-${t}${theme === t ? " on" : ""}`} onClick={() => setTheme(t)}>
                {THEME_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="tm-actions">
            <button type="button" className="vp-btn vp-btn-primary" disabled={busy || !geo} onClick={() => download(false)}>
              Download post (1080×1080)
            </button>
            <button type="button" className="vp-btn vp-btn-primary" disabled={busy || !geo} onClick={() => download(true)}>
              Download story (1080×1920)
            </button>
            <button type="button" className="vp-btn vp-btn-outline" disabled={busy} onClick={share}>
              {copied ? "Link copied!" : "Share"}
            </button>
            {visited.length ? (
              <button type="button" className="tm-link" onClick={() => setVisited([])}>
                Clear all
              </button>
            ) : null}
          </div>
        </aside>
      </div>

      <section className="tm-browse" aria-label="All 64 districts">
        <div className="tm-tabs" role="tablist">
          {["ALL", ...DIVS].map((d) => (
            <button key={d} type="button" role="tab" aria-selected={div === d} className={div === d ? "on" : ""} onClick={() => setDiv(d)}>
              {d === "ALL" ? "All 64" : d}
              <small>{d === "ALL" ? `${ins.count}/64` : `${ins.perDiv.find((p) => p.d === d)?.n}/${DIV_TOTAL[d]}`}</small>
            </button>
          ))}
        </div>
        <ul>
          {list.map((n) => {
            const on = all.has(n);
            return (
              <li key={n}>
                <button type="button" className={on ? "on" : ""} disabled={n === home} onClick={() => toggle(n)} aria-pressed={on}>
                  <span>
                    {en(n)} <small className="bd-bn">{DATA[n].bn}</small>
                  </span>
                  <i aria-hidden="true">{n === home ? "home" : on ? "✓" : "+"}</i>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="tm-sec2">
        <h2 className="tm-h2">Your Bangladesh story</h2>
        <div className="tm-facts">
          <div className="tm-fact">
            <span>Land seen</span>
            <b>{ins.areaPct}%</b>
            <small>{fmt(ins.seenArea)} km² of Bangladesh (incl. home)</small>
          </div>
          <div className="tm-fact">
            <span>Travelled</span>
            <b>{fmt(ins.totalKm)} km</b>
            <small>straight-line, home to each district</small>
          </div>
          <div className="tm-fact">
            <span>Farthest trip</span>
            <b>{ins.farthest ? label(ins.farthest.n) : "—"}</b>
            <small>{ins.farthest ? `${fmt(ins.farthest.km)} km from ${en(home)}` : "add a district"}</small>
          </div>
          <div className="tm-fact">
            <span>Coast & hills</span>
            <b>
              {ins.beaches} · {ins.hills}
            </b>
            <small>coastal districts · hill districts</small>
          </div>
        </div>
        <div className="tm-ext">
          {(
            [
              ["Northernmost", ins.north],
              ["Southernmost", ins.south],
              ["Easternmost", ins.east],
              ["Westernmost", ins.west],
            ] as const
          ).map(([k, n]) => (
            <div key={k} className="bd-ext">
              <span>{k}</span>
              <b>
                {en(n)} · {DATA[n]?.bn}
              </b>
            </div>
          ))}
        </div>

        <div className="tm-visa-box">
          <h3>Divisions</h3>
          <div className="tm-conts bd-divs">
            {ins.perDiv.map((p) => (
              <div key={p.d}>
                <span>
                  {p.d} <small>{DIV_BN[p.d]}</small>
                </span>
                <i>
                  <i style={{ width: `${(p.n / p.total) * 100}%` }} />
                </i>
                <b>
                  {p.n}/{p.total}
                </b>
              </div>
            ))}
          </div>
        </div>

        <div className="tm-visa-box">
          <h3>
            Badges — {ins.earned.length}/{BADGES.length} earned
          </h3>
          <div className="bd-badges">
            {BADGES.map((b) => {
              const on = ins.earned.includes(b);
              return (
                <div key={b.id} className={`bd-badge${on ? " on" : ""}`} title={b.hint}>
                  <span aria-hidden="true">{b.e}</span>
                  <b>{b.name}</b>
                  <small>{on ? "Unlocked" : b.hint}</small>
                </div>
              );
            })}
          </div>
        </div>

        {ins.next.length ? (
          <div className="tm-visa-box">
            <h3>Next door — districts bordering where you&apos;ve been</h3>
            <div className="tm-next">
              {ins.next.map((n) => (
                <button key={n} type="button" onClick={() => toggle(n)}>
                  {en(n)} <span className="bd-bn">{DATA[n].bn}</span>
                  <em>+ add</em>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {visited.filter((v) => v !== home).length ? (
        <section className="tm-sec2">
          <h2 className="tm-h2">Your districts, and what they&apos;re famous for</h2>
          <div className="tm-cards">
            {[...visited]
              .reverse()
              .filter((v) => v !== home)
              .map((n) => (
                <article key={n} className="tm-card">
                  <header>
                    <div>
                      <h3>
                        {en(n)} <span className="bd-bn">{DATA[n].bn}</span>
                      </h3>
                      <span>{DATA[n].div} division</span>
                    </div>
                    <button type="button" className="tm-x" onClick={() => toggle(n)} aria-label={`Remove ${en(n)}`}>
                      ×
                    </button>
                  </header>
                  <p className="bd-fam">{DATA[n].fam}</p>
                  <dl>
                    <div>
                      <dt>From home</dt>
                      <dd>{fmt(dist(geo, home, n))} km</dd>
                    </div>
                    <div>
                      <dt>Area</dt>
                      <dd>{fmt(Math.round(geo?.area.get(n) || 0))} km²</dd>
                    </div>
                  </dl>
                </article>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

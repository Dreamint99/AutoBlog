"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoGraticule10, geoNaturalEarth1, geoPath, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import { BY_ISO, CONT, CONT_ORDER, F, LIST, TOTAL, compact, computeInsights, fmt, kmBetween, lonlat, type Insights } from "./insights";

/* "Countries I've visited" map maker. Everything stays in the browser: the photo is
   read locally and never uploaded; selections are kept in localStorage and can be
   shared as a link (?c=bd.in.np). Exports a 1080×1080 post or 1080×1920 story PNG
   with flight arcs, travel stats and the bold display face (--tm-font). */

const ATLAS = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const STORE = "vp-travel-map-v1";

type Theme = "neon" | "paper" | "sunset";
interface Palette {
  bg: [string, string];
  ocean: string;
  land: string;
  visited: string;
  home: string;
  arc: string;
  text: string;
  sub: string;
  line: string;
  grat: string;
  glow: boolean;
}
const THEMES: Record<Theme, Palette> = {
  neon: { bg: ["#05071a", "#1c0b44"], ocean: "rgba(40,60,160,0.16)", land: "#1e2656", visited: "#22d3ee", home: "#f472b6", arc: "#fde047", text: "#ffffff", sub: "rgba(255,255,255,0.72)", line: "rgba(255,255,255,0.10)", grat: "rgba(140,160,255,0.13)", glow: true },
  paper: { bg: ["#f4ead3", "#e6d8b8"], ocean: "rgba(255,255,255,0.35)", land: "#d8c9a3", visited: "#1f3a5f", home: "#c2410c", arc: "#c2410c", text: "#1b1a17", sub: "#5b5346", line: "rgba(27,26,23,0.28)", grat: "rgba(27,26,23,0.12)", glow: false },
  sunset: { bg: ["#ff7a3d", "#6d28d9"], ocean: "rgba(255,255,255,0.07)", land: "rgba(255,255,255,0.24)", visited: "#fff1a8", home: "#22103d", arc: "#ffffff", text: "#ffffff", sub: "rgba(255,255,255,0.86)", line: "rgba(255,255,255,0.22)", grat: "rgba(255,255,255,0.12)", glow: true },
};
const THEME_LABEL: Record<Theme, string> = { neon: "Neon", paper: "Paper", sunset: "Sunset" };

type Atlas = FeatureCollection<Geometry, { name: string }>;
let atlasP: Promise<Atlas> | null = null;
const loadAtlas = () =>
  (atlasP ??= fetch(ATLAS)
    .then((r) => r.json())
    .then((t) => feature(t, t.objects.countries) as unknown as Atlas));

const byNum = new Map(LIST.filter((c) => c.numeric).map((c) => [String(Number(c.numeric)), c]));
const ALPHA = [...LIST].sort((a, b) => a.name.localeCompare(b.name));
const flag = (iso: string, w = 80) => `https://flagcdn.com/w${w}/${iso.toLowerCase()}.png`;
const nameOf = (iso: string | null | undefined) => (iso ? BY_ISO.get(iso)?.name || iso : "—");

type Visa = "free" | "arrival" | "evisa" | "required";
const VISA_LABEL: Record<Visa, string> = { free: "Visa-free", arrival: "On arrival", evisa: "e-Visa / eTA", required: "Visa needed" };
const visaOf = (code?: string): Visa | null => {
  if (!code) return null;
  const c = code[0];
  return c === "F" ? "free" : c === "A" ? "arrival" : c === "E" || c === "T" ? "evisa" : c === "V" || c === "X" ? "required" : null;
};

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

/** Great-circle line from home to a destination ([lng, lat] pairs). */
const arc = (a: string, b: string) => {
  const pa = lonlat(a);
  const pb = lonlat(b);
  return pa && pb ? ({ type: "LineString", coordinates: [pa, pb] } as GeoPermissibleObjects) : null;
};

export default function TravelMap() {
  const [visited, setVisited] = useState<string[]>([]);
  const [home, setHome] = useState("BD");
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [theme, setTheme] = useState<Theme>("neon");
  const [q, setQ] = useState("");
  const [fc, setFc] = useState<Atlas | null>(null);
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; iso: string | null; t: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [visa, setVisa] = useState<Record<string, string> | null>(null);
  const [browse, setBrowse] = useState(false);
  const [bc, setBc] = useState<string>("ALL");
  const [focus, setFocus] = useState<string | null>(null);
  const ready = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  // restore: URL (?c=..&h=..&n=..) wins over localStorage
  useEffect(() => {
    loadAtlas().then(setFc).catch(() => {});
    const u = new URL(window.location.href);
    const fromUrl = u.searchParams.get("c");
    if (fromUrl) {
      setVisited(fromUrl.split(".").map((s) => s.toUpperCase()).filter((s) => BY_ISO.has(s)));
      const h = (u.searchParams.get("h") || "").toUpperCase();
      if (BY_ISO.has(h)) setHome(h);
      setName((u.searchParams.get("n") || "").slice(0, 40));
    } else {
      try {
        const s = JSON.parse(localStorage.getItem(STORE) || "{}");
        if (Array.isArray(s.v)) setVisited(s.v.filter((x: string) => BY_ISO.has(x)));
        if (s.h && BY_ISO.has(s.h)) setHome(s.h);
        if (typeof s.n === "string") setName(s.n);
        const t = s.t === "night" ? "neon" : s.t === "day" ? "paper" : s.t;
        if (t in THEMES) setTheme(t);
      } catch {}
    }
    ready.current = true;
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ v: visited, h: home, n: name, t: theme }));
    } catch {}
  }, [visited, home, name, theme]);

  // home passport → visa requirement per destination (Passport Index data)
  useEffect(() => {
    let live = true;
    setVisa(null);
    fetch(`/api/passport?iso=${home}&dest=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { codes?: string[]; dest?: string[] } | null) => {
        if (!live || !d?.codes || !d.dest) return;
        const m: Record<string, string> = {};
        d.dest.forEach((iso, i) => (m[iso] = d.codes![i]));
        setVisa(m);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [home]);

  const set = useMemo(() => new Set(visited), [visited]);
  const away = useMemo(() => visited.filter((v) => v !== home), [visited, home]);
  const toggle = useCallback(
    (iso: string) => {
      if (iso === home) return;
      setVisited((v) => (v.includes(iso) ? v.filter((x) => x !== iso) : [...v, iso]));
    },
    [home],
  );
  const add = (iso: string) => {
    if (iso && iso !== home && !set.has(iso)) setVisited((v) => [...v, iso]);
  };

  const ins = useMemo(() => computeInsights(visited, home), [visited, home]);

  const visaStats = useMemo(() => {
    if (!visa) return null;
    const c: Record<Visa, number> = { free: 0, arrival: 0, evisa: 0, required: 0 };
    for (const v of away) {
      const k = visaOf(visa[v]);
      if (k) c[k]++;
    }
    const easy = Object.entries(visa)
      .filter(([iso, code]) => iso !== home && !set.has(iso) && (visaOf(code) === "free" || visaOf(code) === "arrival") && F[iso])
      .sort((a, b) => kmBetween(home, a[0]) - kmBetween(home, b[0]))
      .slice(0, 8)
      .map(([iso, code]) => ({ iso, code }));
    const totalEasy = Object.entries(visa).filter(([iso, code]) => iso !== home && (visaOf(code) === "free" || visaOf(code) === "arrival")).length;
    return { c, easy, totalEasy };
  }, [visa, away, set, home]);

  const W = 960;
  const H = 500;
  const proj = useMemo<GeoProjection>(() => geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], { type: "Sphere" }), []);
  const path = useMemo(() => geoPath(proj), [proj]);
  const grat = useMemo(() => path(geoGraticule10()) || "", [path]);
  const sphere = useMemo(() => path({ type: "Sphere" }) || "", [path]);
  const homeXY = useMemo(() => {
    const p = lonlat(home);
    return p ? proj(p) : null;
  }, [home, proj]);

  const found = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? ALPHA.filter((c) => c.name.toLowerCase().includes(t) || c.iso2.toLowerCase() === t).slice(0, 8) : [];
  }, [q]);

  const onPhoto = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result || ""));
    r.readAsDataURL(f);
  };

  const shareUrl = () => {
    const u = new URL(window.location.href);
    u.search = "";
    u.searchParams.set("c", visited.map((v) => v.toLowerCase()).join("."));
    u.searchParams.set("h", home.toLowerCase());
    if (name.trim()) u.searchParams.set("n", name.trim());
    return u.toString();
  };

  /** Draws the share card on a canvas and returns it as a PNG blob. */
  const render = async (story: boolean): Promise<Blob | null> => {
    const atlas = fc ?? (await loadAtlas());
    const T = THEMES[theme];
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
    const font = (w: number, s: number) => `${w} ${s}px ${fam}`;
    const pad = 70;

    // background + soft light blobs
    const g = ctx.createLinearGradient(0, 0, CW, CH);
    g.addColorStop(0, T.bg[0]);
    g.addColorStop(1, T.bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CW, CH);
    const blob = (x: number, y: number, r: number, c: string) => {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, c);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, CW, CH);
    };
    if (T.glow) {
      blob(CW * 0.85, CH * 0.1, 520, theme === "neon" ? "rgba(34,211,238,0.18)" : "rgba(255,240,170,0.25)");
      blob(CW * 0.1, CH * 0.9, 600, theme === "neon" ? "rgba(244,114,182,0.16)" : "rgba(40,10,90,0.25)");
    }

    // header: avatar + name + big number
    let y = story ? 140 : 70;
    const av = 128;
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
      }
    }
    const tx = photo ? pad + av + 32 : pad;
    ctx.fillStyle = T.sub;
    ctx.font = font(600, 30);
    ctx.fillText((name.trim() ? `${name.trim()} has explored` : "I have explored").toUpperCase(), tx, y + 38);
    ctx.fillStyle = T.text;
    ctx.font = font(800, 104);
    const big = `${ins.count} ${ins.count === 1 ? "country" : "countries"}`;
    ctx.fillText(big, tx, y + 128);

    // level pill (top right)
    const lv = `${ins.level.emoji} ${ins.level.name.toUpperCase()}`;
    ctx.font = font(800, 26);
    const lw = ctx.measureText(lv).width + 40;
    const lx = CW - pad - lw;
    const ly = story ? 72 : 22;
    ctx.fillStyle = T.visited;
    ctx.beginPath();
    ctx.roundRect(lx, ly, lw, 48, 24);
    ctx.fill();
    ctx.fillStyle = theme === "paper" ? "#f4ead3" : "#120a2a";
    ctx.fillText(lv, lx + 20, ly + 34);

    // stats row
    y += story ? 200 : 168;
    const stats: [string, string][] = [
      [`${ins.pct}%`, "of the world"],
      [`${ins.continents}/6`, "continents"],
      [compact(ins.totalKm), "km flown"],
      [`${ins.popPct}%`, "of humanity"],
    ];
    const sw = (CW - pad * 2) / stats.length;
    stats.forEach(([v, l], i) => {
      const x = pad + i * sw;
      ctx.fillStyle = T.text;
      ctx.font = font(800, story ? 56 : 48);
      ctx.fillText(v, x, y);
      ctx.fillStyle = T.sub;
      ctx.font = font(600, 22);
      ctx.fillText(l.toUpperCase(), x, y + 32);
    });

    // map
    const mapTop = y + (story ? 80 : 58);
    const mapH = story ? 700 : 470;
    const pj = geoNaturalEarth1().fitExtent([[pad, mapTop], [CW - pad, mapTop + mapH]], { type: "Sphere" });
    const p = geoPath(pj, ctx);
    ctx.beginPath();
    p({ type: "Sphere" });
    ctx.fillStyle = T.ocean;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = T.line;
    ctx.stroke();
    ctx.beginPath();
    p(geoGraticule10());
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = T.grat;
    ctx.stroke();
    for (const f of atlas.features) {
      const c = byNum.get(String(Number(f.id)));
      const isHome = c?.iso2 === home;
      const isV = !!c && set.has(c.iso2);
      ctx.beginPath();
      p(f);
      ctx.fillStyle = isHome ? T.home : isV ? T.visited : T.land;
      if (T.glow && (isHome || isV)) {
        ctx.shadowColor = isHome ? T.home : T.visited;
        ctx.shadowBlur = 14;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = T.line;
      ctx.stroke();
    }
    // flight arcs from home
    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = T.arc;
    ctx.setLineDash([7, 6]);
    if (T.glow) {
      ctx.shadowColor = T.arc;
      ctx.shadowBlur = 8;
    }
    for (const v of away) {
      const a = arc(home, v);
      if (!a) continue;
      ctx.beginPath();
      p(a);
      ctx.stroke();
    }
    ctx.restore();
    const hp = lonlat(home);
    const hxy = hp ? pj(hp) : null;
    if (hxy) {
      ctx.fillStyle = T.arc;
      ctx.beginPath();
      ctx.arc(hxy[0], hxy[1], 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // story: continent bars + superlatives
    let fy = mapTop + mapH + (story ? 60 : 30);
    if (story) {
      for (const pc of ins.perCont) {
        ctx.fillStyle = T.text;
        ctx.font = font(600, 28);
        ctx.fillText(CONT[pc.k], pad, fy + 24);
        ctx.fillText(`${pc.n}/${pc.total}`, CW - pad - ctx.measureText(`${pc.n}/${pc.total}`).width, fy + 24);
        const bx = pad + 270;
        const bw = CW - pad * 2 - 380;
        ctx.fillStyle = T.line;
        ctx.beginPath();
        ctx.roundRect(bx, fy + 6, bw, 20, 10);
        ctx.fill();
        if (pc.n) {
          ctx.fillStyle = T.visited;
          ctx.beginPath();
          ctx.roundRect(bx, fy + 6, Math.max(20, (bw * pc.n) / pc.total), 20, 10);
          ctx.fill();
        }
        fy += 50;
      }
      fy += 24;
      const sup: [string, string][] = [];
      if (ins.farthest) sup.push(["Farthest", `${nameOf(ins.farthest.iso)} · ${fmt(ins.farthest.km)} km`]);
      if (ins.laps >= 0.1) sup.push(["Around Earth", `${ins.laps}× the equator`]);
      sup.push(["Languages heard", `${ins.languages}  ·  Currencies: ${ins.currencies}`]);
      for (const [k, v] of sup) {
        ctx.fillStyle = T.sub;
        ctx.font = font(600, 24);
        ctx.fillText(k.toUpperCase(), pad, fy + 22);
        ctx.fillStyle = T.text;
        ctx.font = font(800, 32);
        ctx.fillText(v, pad + 270, fy + 24);
        fy += 52;
      }
      fy += 16;
    }
    const flags = away.slice(0, story ? 26 : 13);
    const fw = 60;
    const fh = 40;
    const gap = 14;
    const perRow = Math.floor((CW - pad * 2 + gap) / (fw + gap));
    const imgs = await Promise.all(flags.map((f) => loadImg(flag(f, 80))));
    imgs.forEach((img, i) => {
      if (!img) return;
      const r = Math.floor(i / perRow);
      const col = i % perRow;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pad + col * (fw + gap), fy + r * (fh + gap), fw, fh, 6);
      ctx.clip();
      ctx.drawImage(img, pad + col * (fw + gap), fy + r * (fh + gap), fw, fh);
      ctx.restore();
    });
    if (away.length > flags.length) {
      ctx.fillStyle = T.sub;
      ctx.font = font(800, 26);
      const r = Math.floor(flags.length / perRow);
      const col = flags.length % perRow;
      ctx.fillText(`+${away.length - flags.length}`, pad + col * (fw + gap) + 6, fy + r * (fh + gap) + 30);
    }

    // footer brand
    ctx.fillStyle = T.sub;
    ctx.font = font(600, 26);
    ctx.fillText("MAKE YOUR OWN TRAVEL MAP", pad, CH - 56);
    ctx.fillStyle = T.text;
    ctx.font = font(800, 34);
    const brand = "visapoint.net/travel-map";
    ctx.fillText(brand, CW - pad - ctx.measureText(brand).width, CH - 56);

    return new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
  };

  const download = async (story: boolean) => {
    setBusy(true);
    try {
      const blob = await render(story);
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `my-travel-map-${story ? "story" : "post"}.png`;
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
      const file = blob ? new File([blob], "my-travel-map.png", { type: "image/png" }) : null;
      const data: ShareData = { title: "My travel map", text: `I've explored ${ins.count} countries — ${ins.pct}% of the world! Make yours:`, url: shareUrl() };
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ ...data, files: [file] });
      else if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(shareUrl());
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      /* user cancelled */
    } finally {
      setBusy(false);
    }
  };

  const T = THEMES[theme];
  const browseList = bc === "ALL" ? ALPHA : ALPHA.filter((c) => c.cont === bc);

  return (
    <div className="tm" ref={root}>
      <div className="tm-grid">
        <div className={`tm-map tm-${theme}`}>
          <div className="tm-map-head">
            <div>
              <b>{ins.count}</b>
              <span>{ins.count === 1 ? "country" : "countries"}</span>
            </div>
            <div>
              <b>{ins.pct}%</b>
              <span>of the world</span>
            </div>
            <div>
              <b>{ins.continents}/6</b>
              <span>continents</span>
            </div>
            <div className="tm-level">
              <b>
                {ins.level.emoji} {ins.level.name}
              </b>
              <span>{ins.level.next ? `${ins.level.next.min - ins.count} more to ${ins.level.next.name}` : "Top level reached"}</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="World map — click countries you have visited">
            <defs>
              <filter id="tm-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path d={sphere} fill={T.ocean} stroke={T.line} strokeWidth={1.2} />
            <path d={grat} fill="none" stroke={T.grat} strokeWidth={0.5} />
            {fc
              ? fc.features.map((f, i) => {
                  const c = byNum.get(String(Number(f.id)));
                  const isHome = c?.iso2 === home;
                  const isV = !!c && set.has(c.iso2);
                  const fill = isHome ? T.home : isV ? T.visited : focus && c?.iso2 === focus ? T.arc : T.land;
                  return (
                    <path
                      key={`${f.id}-${i}`}
                      d={path(f) || ""}
                      fill={fill}
                      stroke={T.line}
                      strokeWidth={0.4}
                      filter={T.glow && (isHome || isV) ? "url(#tm-glow)" : undefined}
                      className={c ? "tm-c" : ""}
                      onClick={() => c && toggle(c.iso2)}
                      onMouseMove={(e) => {
                        const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                        setTip({ x: e.clientX - box.left, y: e.clientY - box.top, iso: c?.iso2 ?? null, t: c?.name || f.properties?.name || "" });
                      }}
                      onMouseLeave={() => setTip(null)}
                    />
                  );
                })
              : null}
            {away.map((v) => {
              const a = arc(home, v);
              const d = a ? path(a) : null;
              return d ? <path key={`arc-${v}`} d={d} className="tm-arc" fill="none" stroke={T.arc} strokeWidth={1.4} filter={T.glow ? "url(#tm-glow)" : undefined} /> : null;
            })}
            {away.length <= 40
              ? away.map((v) => {
                  const p = lonlat(v);
                  const xy = p ? proj(p) : null;
                  return xy ? (
                    <text key={`lb-${v}`} x={xy[0]} y={xy[1] - 6} className="tm-label" fill={T.text} stroke={T.bg[0]}>
                      {nameOf(v)}
                    </text>
                  ) : null;
                })
              : null}
            {homeXY ? (
              <g className="tm-home-pin">
                <circle cx={homeXY[0]} cy={homeXY[1]} r={9} fill="none" stroke={T.arc} strokeWidth={1.5} className="tm-pulse" />
                <circle cx={homeXY[0]} cy={homeXY[1]} r={4} fill={T.arc} />
              </g>
            ) : null}
          </svg>
          {!fc ? <div className="tm-loading">Loading world map…</div> : null}
          {tip ? <MapTip tip={tip} home={home} visited={set} visa={visa} /> : null}
          <p className="tm-hint">Tap a country on the map, pick it from the list, or search. Home is pink-pinned; lines show your flights from home.</p>
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
              <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} hidden />
            </label>
            {photo ? (
              <button type="button" className="tm-link" onClick={() => setPhoto("")}>
                Remove
              </button>
            ) : null}
          </div>
          <p className="tm-privacy">Your photo stays on your device — it is never uploaded.</p>
          <label className="tm-field">
            <span>Home country</span>
            <select value={home} onChange={(e) => setHome(e.target.value)}>
              {ALPHA.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="tm-field">
            <span>Add a country — pick from all {LIST.length}</span>
            <select
              value=""
              onChange={(e) => {
                toggle(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Select a country…</option>
              {CONT_ORDER.map((k) => (
                <optgroup key={k} label={CONT[k]}>
                  {ALPHA.filter((c) => c.cont === k && c.iso2 !== home).map((c) => (
                    <option key={c.iso2} value={c.iso2}>
                      {set.has(c.iso2) ? "✓ " : ""}
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="tm-field">
            <span>…or search</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Malaysia, Saudi Arabia…" />
          </label>
          {found.length ? (
            <ul className="tm-found">
              {found.map((c) => (
                <li key={c.iso2}>
                  <button
                    type="button"
                    onClick={() => {
                      add(c.iso2);
                      setQ("");
                    }}
                  >
                    <img src={flag(c.iso2, 40)} alt="" width={22} height={15} />
                    {c.name}
                    {set.has(c.iso2) ? <em>added</em> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button type="button" className="vp-btn vp-btn-outline tm-browse-btn" onClick={() => setBrowse((b) => !b)} aria-expanded={browse}>
            {browse ? "Hide country list" : `Browse all ${LIST.length} countries A–Z`}
          </button>
          <div className="tm-theme" role="radiogroup" aria-label="Map style">
            {(Object.keys(THEMES) as Theme[]).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={theme === t} className={`tm-sw-${t}${theme === t ? " on" : ""}`} onClick={() => setTheme(t)}>
                {THEME_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="tm-actions">
            <button type="button" className="vp-btn vp-btn-primary" disabled={busy || !fc} onClick={() => download(false)}>
              Download post (1080×1080)
            </button>
            <button type="button" className="vp-btn vp-btn-primary" disabled={busy || !fc} onClick={() => download(true)}>
              Download story (1080×1920)
            </button>
            <button type="button" className="vp-btn vp-btn-outline" disabled={busy} onClick={share}>
              {copied ? "Link copied!" : "Share"}
            </button>
          </div>
        </aside>
      </div>

      {browse ? (
        <section className="tm-browse" aria-label="All countries">
          <div className="tm-tabs" role="tablist">
            {["ALL", ...CONT_ORDER].map((k) => (
              <button key={k} type="button" role="tab" aria-selected={bc === k} className={bc === k ? "on" : ""} onClick={() => setBc(k)}>
                {k === "ALL" ? "All" : CONT[k]}
                <small>{k === "ALL" ? `${ins.count}/${LIST.length}` : `${ins.perCont.find((p) => p.k === k)?.n ?? 0}/${LIST.filter((c) => c.cont === k).length}`}</small>
              </button>
            ))}
          </div>
          <ul>
            {browseList.map((c) => {
              const on = set.has(c.iso2) || c.iso2 === home;
              return (
                <li key={c.iso2}>
                  <button
                    type="button"
                    className={on ? "on" : ""}
                    disabled={c.iso2 === home}
                    onClick={() => toggle(c.iso2)}
                    onMouseEnter={() => setFocus(c.iso2)}
                    onMouseLeave={() => setFocus(null)}
                    aria-pressed={on}
                  >
                    <img src={flag(c.iso2, 40)} alt="" width={20} height={14} loading="lazy" />
                    <span>{c.name}</span>
                    <i aria-hidden="true">{c.iso2 === home ? "home" : on ? "✓" : "+"}</i>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {visited.length ? (
        <div className="tm-chips" aria-label="Visited countries">
          {away.map((v) => (
            <button key={v} type="button" onClick={() => toggle(v)} title="Remove">
              <img src={flag(v, 40)} alt="" width={20} height={14} />
              {nameOf(v)} <span aria-hidden="true">×</span>
            </button>
          ))}
          <button type="button" className="tm-link" onClick={() => setVisited([])}>
            Clear all
          </button>
        </div>
      ) : null}

      <Story ins={ins} home={home} visaStats={visaStats} onAdd={add} />

      {away.length ? (
        <section className="tm-sec2">
          <h2 className="tm-h2">
            Your {away.length} {away.length === 1 ? "country" : "countries"}, in facts
          </h2>
          <div className="tm-cards">
            {[...away].reverse().map((v) => {
              const f = F[v];
              if (!f) return null;
              const code = visa?.[v];
              const vk = visaOf(code);
              return (
                <article key={v} className="tm-card">
                  <header>
                    <img src={flag(v, 160)} alt="" width={56} height={38} loading="lazy" />
                    <div>
                      <h3>{nameOf(v)}</h3>
                      <span>{CONT[BY_ISO.get(v)?.cont || ""]}</span>
                    </div>
                    <button type="button" className="tm-x" onClick={() => toggle(v)} aria-label={`Remove ${nameOf(v)}`}>
                      ×
                    </button>
                  </header>
                  <dl>
                    <div>
                      <dt>Capital</dt>
                      <dd>{f.cap || "—"}</dd>
                    </div>
                    <div>
                      <dt>People</dt>
                      <dd>{compact(f.pop)}</dd>
                    </div>
                    <div>
                      <dt>Speaks</dt>
                      <dd>{f.lang.slice(0, 2).join(", ") || "—"}</dd>
                    </div>
                    <div>
                      <dt>Money</dt>
                      <dd>{f.cur[0] || "—"}</dd>
                    </div>
                    <div>
                      <dt>From home</dt>
                      <dd>{fmt(kmBetween(home, v))} km</dd>
                    </div>
                    <div>
                      <dt>Size</dt>
                      <dd>{F[home]?.area ? `${(f.area / F[home].area).toFixed(f.area / F[home].area < 10 ? 1 : 0)}× ${nameOf(home)}` : `${compact(f.area)} km²`}</dd>
                    </div>
                  </dl>
                  {vk ? <p className={`tm-visa tm-visa-${vk}`}>{nameOf(home)} passport: {VISA_LABEL[vk]}{code && code.length > 1 && code[0] === "F" ? ` · ${code.slice(1)} days` : ""}</p> : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MapTip({ tip, home, visited, visa }: { tip: { x: number; y: number; iso: string | null; t: string }; home: string; visited: Set<string>; visa: Record<string, string> | null }) {
  const f = tip.iso ? F[tip.iso] : null;
  const vk = tip.iso && tip.iso !== home ? visaOf(visa?.[tip.iso]) : null;
  return (
    <div className="tm-tip" style={{ left: tip.x + 14, top: tip.y + 14 }}>
      <b>
        {tip.t}
        {tip.iso === home ? " · home" : tip.iso && visited.has(tip.iso) ? " ✓" : ""}
      </b>
      {f ? (
        <span>
          {f.cap ? `${f.cap} · ` : ""}
          {compact(f.pop)} people
          {tip.iso !== home && tip.iso ? ` · ${fmt(kmBetween(home, tip.iso))} km` : ""}
        </span>
      ) : null}
      {vk ? <span className={`tm-visa-${vk}`}>{VISA_LABEL[vk]}</span> : null}
    </div>
  );
}

function Story({ ins, home, visaStats, onAdd }: { ins: Insights; home: string; visaStats: { c: Record<Visa, number>; easy: { iso: string; code: string }[]; totalEasy: number } | null; onAdd: (iso: string) => void }) {
  if (!ins.count) {
    return (
      <section className="tm-sec2 tm-empty">
        <h2 className="tm-h2">Your travel story appears here</h2>
        <p>Add the countries you have been to and see how far you have flown, how many languages you have heard, your northern-most stop, which countries your passport opens next — and more.</p>
      </section>
    );
  }
  const facts: { k: string; v: string; s: string }[] = [
    { k: "Land seen", v: `${ins.landPct}%`, s: "of Earth's land area (incl. home)" },
    { k: "People", v: `${ins.popPct}%`, s: `of humanity lives where you've been — ${compact(ins.pop)}` },
    { k: "Flown", v: `${fmt(ins.totalKm)} km`, s: ins.laps >= 1 ? `that's ${ins.laps}× around the equator` : `${Math.round(ins.laps * 100)}% of the way around Earth` },
    ins.farthest ? { k: "Farthest", v: nameOf(ins.farthest.iso), s: `${fmt(ins.farthest.km)} km from ${nameOf(home)}` } : null,
    ins.closest && ins.count > 1 ? { k: "Closest", v: nameOf(ins.closest.iso), s: `just ${fmt(ins.closest.km)} km away` } : null,
    { k: "Languages", v: String(ins.languages), s: "official languages across your countries" },
    { k: "Currencies", v: String(ins.currencies), s: "different money you could have spent" },
    { k: "Time zones", v: String(ins.timezones), s: "time zones inside your countries" },
    { k: "Hemispheres", v: `${ins.hemispheres.length}/4`, s: ins.hemispheres.join(" · ") },
  ].filter(Boolean) as { k: string; v: string; s: string }[];
  const ext: [string, string | null][] = [
    ["Northernmost", ins.north],
    ["Southernmost", ins.south],
    ["Easternmost", ins.east],
    ["Westernmost", ins.west],
  ];
  return (
    <section className="tm-sec2">
      <h2 className="tm-h2">Your travel story</h2>
      <div className="tm-facts">
        {facts.map((f) => (
          <div key={f.k} className="tm-fact">
            <span>{f.k}</span>
            <b>{f.v}</b>
            <small>{f.s}</small>
          </div>
        ))}
      </div>
      <div className="tm-ext">
        {ext.map(([k, iso]) =>
          iso ? (
            <div key={k}>
              <img src={flag(iso, 40)} alt="" width={24} height={16} />
              <span>{k}</span>
              <b>{nameOf(iso)}</b>
            </div>
          ) : null,
        )}
      </div>

      {visaStats ? (
        <div className="tm-visa-box">
          <h3>Your trips by visa type ({nameOf(home)} passport)</h3>
          <div className="tm-stamps">
            {(Object.keys(VISA_LABEL) as Visa[]).map((k) => (
              <div key={k} className={`tm-stamp tm-visa-${k}`}>
                <b>{visaStats.c[k]}</b>
                <span>{VISA_LABEL[k]}</span>
              </div>
            ))}
          </div>
          {visaStats.easy.length ? (
            <>
              <p className="tm-sub">
                Your passport opens <strong>{visaStats.totalEasy}</strong> countries visa-free or on arrival. Closest ones you haven&apos;t visited yet:
              </p>
              <div className="tm-next">
                {visaStats.easy.map(({ iso, code }) => (
                  <button key={iso} type="button" onClick={() => onAdd(iso)} title="Add to my map">
                    <img src={flag(iso, 40)} alt="" width={22} height={15} />
                    {nameOf(iso)}
                    <em>{code[0] === "F" ? (code.length > 1 ? `${code.slice(1)}d free` : "visa-free") : "on arrival"}</em>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <p className="tm-note">
            Visa rules change — always confirm with the embassy. <a href="/passport-index">See the full Passport Index →</a>
          </p>
        </div>
      ) : null}

      {ins.next.length ? (
        <div className="tm-visa-box">
          <h3>Next door to where you&apos;ve been</h3>
          <div className="tm-next">
            {ins.next.map((iso) => (
              <button key={iso} type="button" onClick={() => onAdd(iso)} title="Add to my map">
                <img src={flag(iso, 40)} alt="" width={22} height={15} />
                {nameOf(iso)}
                <em>+ add</em>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="tm-progress-note">
        {ins.level.emoji} You are a <strong>{ins.level.name}</strong>
        {ins.level.next ? ` — visit ${ins.level.next.min - ins.count} more to become ${ins.level.next.emoji} ${ins.level.next.name}.` : "."} {TOTAL - ins.count} countries still to go.
      </p>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import COUNTRIES from "@/data/world-countries.json";

/* "Countries I've visited" map maker. Everything stays in the browser: the photo is
   read locally and never uploaded; selections are kept in localStorage and can be
   shared as a link (?c=bd.in.np). Exports a 1080×1080 post or 1080×1920 story PNG. */

type C = { iso2: string; name: string; numeric: string | null; cont: string };
const LIST = COUNTRIES as C[];
const TOTAL = 195; // UN members + observers — the usual "countries of the world" count
const CONT: Record<string, string> = { AF: "Africa", AS: "Asia", EU: "Europe", NA: "North America", SA: "South America", OC: "Oceania" };
const CONT_ORDER = ["AS", "EU", "AF", "NA", "SA", "OC"];
const ATLAS = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const STORE = "vp-travel-map-v1";

type Theme = "night" | "day";
const THEMES: Record<Theme, { bg: [string, string]; land: string; visited: string; home: string; text: string; sub: string; line: string }> = {
  night: { bg: ["#0b2440", "#0f6e6a"], land: "rgba(255,255,255,0.16)", visited: "#f4c95d", home: "#ff7a59", text: "#ffffff", sub: "rgba(255,255,255,0.75)", line: "rgba(255,255,255,0.18)" },
  day: { bg: ["#f6f1e7", "#e3efec"], land: "#d6dbe1", visited: "#0f6e6a", home: "#d9480f", text: "#13202e", sub: "#556170", line: "rgba(19,32,46,0.12)" },
};

let atlasP: Promise<FeatureCollection<Geometry, { name: string }>> | null = null;
const loadAtlas = () =>
  (atlasP ??= fetch(ATLAS)
    .then((r) => r.json())
    .then((t) => feature(t, t.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>));

const byNum = new Map(LIST.filter((c) => c.numeric).map((c) => [String(Number(c.numeric)), c]));
const byIso = new Map(LIST.map((c) => [c.iso2, c]));
const flag = (iso: string, w = 80) => `https://flagcdn.com/w${w}/${iso.toLowerCase()}.png`;

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

export default function TravelMap() {
  const [visited, setVisited] = useState<string[]>([]);
  const [home, setHome] = useState("BD");
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [theme, setTheme] = useState<Theme>("night");
  const [q, setQ] = useState("");
  const [fc, setFc] = useState<FeatureCollection<Geometry, { name: string }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; t: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const ready = useRef(false);

  // restore: URL (?c=..&h=..&n=..) wins over localStorage
  useEffect(() => {
    loadAtlas().then(setFc).catch(() => {});
    const u = new URL(window.location.href);
    const fromUrl = u.searchParams.get("c");
    if (fromUrl) {
      setVisited(fromUrl.split(".").map((s) => s.toUpperCase()).filter((s) => byIso.has(s)));
      const h = (u.searchParams.get("h") || "").toUpperCase();
      if (byIso.has(h)) setHome(h);
      setName((u.searchParams.get("n") || "").slice(0, 40));
    } else {
      try {
        const s = JSON.parse(localStorage.getItem(STORE) || "{}");
        if (Array.isArray(s.v)) setVisited(s.v.filter((x: string) => byIso.has(x)));
        if (s.h && byIso.has(s.h)) setHome(s.h);
        if (typeof s.n === "string") setName(s.n);
        if (s.t === "day" || s.t === "night") setTheme(s.t);
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

  const set = useMemo(() => new Set(visited), [visited]);
  const toggle = useCallback((iso: string) => {
    setVisited((v) => (v.includes(iso) ? v.filter((x) => x !== iso) : [...v, iso]));
  }, []);

  const all = useMemo(() => new Set([...visited, home]), [visited, home]);
  const count = visited.filter((v) => v !== home).length;
  const pct = Math.min(100, Math.round((count / TOTAL) * 1000) / 10);
  const perCont = CONT_ORDER.map((k) => ({
    k,
    total: LIST.filter((c) => c.cont === k).length,
    n: [...all].filter((i) => byIso.get(i)?.cont === k).length,
  }));
  const contCount = perCont.filter((c) => c.n > 0).length;

  const W = 960;
  const H = 500;
  const path = useMemo(() => {
    const proj = geoNaturalEarth1().fitSize([W, H], (fc ?? { type: "Sphere" }) as GeoPermissibleObjects);
    return geoPath(proj);
  }, [fc]);

  const found = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? LIST.filter((c) => c.name.toLowerCase().includes(t)).slice(0, 8) : [];
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
    const serif = "Georgia, 'Times New Roman', serif";
    const sans = "'Segoe UI', Roboto, Arial, sans-serif";

    const g = ctx.createLinearGradient(0, 0, CW, CH);
    g.addColorStop(0, T.bg[0]);
    g.addColorStop(1, T.bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CW, CH);

    // header: avatar + name + headline number
    const pad = 72;
    let y = story ? 150 : 80;
    const av = 132;
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
        ctx.arc(pad + av / 2, y + av / 2, av / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const tx = photo ? pad + av + 34 : pad;
    ctx.fillStyle = T.sub;
    ctx.font = `600 30px ${sans}`;
    ctx.fillText(name.trim() ? `${name.trim()} has explored` : "I have explored", tx, y + 44);
    ctx.fillStyle = T.text;
    ctx.font = `700 96px ${serif}`;
    ctx.fillText(`${count} ${count === 1 ? "country" : "countries"}`, tx, y + 128);

    y += story ? 230 : 190;
    ctx.fillStyle = T.sub;
    ctx.font = `600 32px ${sans}`;
    ctx.fillText(`${pct}% of the world  ·  ${contCount} of 6 continents`, pad, y);

    // map
    const mapTop = y + (story ? 70 : 34);
    const mapH = story ? 760 : 560;
    const proj = geoNaturalEarth1().fitSize([CW - pad * 2, mapH], atlas as GeoPermissibleObjects);
    const tr = proj.translate();
    proj.translate([tr[0] + pad, tr[1] + mapTop]);
    const p = geoPath(proj, ctx);
    for (const f of atlas.features) {
      if (f.properties?.name === "Antarctica") continue;
      const c = byNum.get(String(Number(f.id)));
      ctx.beginPath();
      p(f);
      ctx.fillStyle = c && c.iso2 === home ? T.home : c && set.has(c.iso2) ? T.visited : T.land;
      ctx.fill();
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = T.line;
      ctx.stroke();
    }

    // continent bars (story) / flags strip (both)
    let fy = mapTop + mapH + (story ? 50 : 26);
    if (story) {
      ctx.font = `600 28px ${sans}`;
      for (const pc of perCont) {
        ctx.fillStyle = T.sub;
        ctx.fillText(`${CONT[pc.k]}`, pad, fy + 26);
        ctx.fillText(`${pc.n}/${pc.total}`, CW - pad - 90, fy + 26);
        ctx.fillStyle = T.line;
        ctx.fillRect(pad + 260, fy + 8, CW - pad * 2 - 380, 20);
        ctx.fillStyle = T.visited;
        ctx.fillRect(pad + 260, fy + 8, ((CW - pad * 2 - 380) * pc.n) / pc.total, 20);
        fy += 52;
      }
      fy += 30;
    }
    const flags = visited.filter((v) => v !== home).slice(0, story ? 32 : 16);
    const fw = 60;
    const fh = 40;
    const gap = 14;
    const perRow = Math.floor((CW - pad * 2 + gap) / (fw + gap));
    const imgs = await Promise.all(flags.map((f) => loadImg(flag(f, 80))));
    imgs.forEach((img, i) => {
      if (!img) return;
      const r = Math.floor(i / perRow);
      const col = i % perRow;
      ctx.drawImage(img, pad + col * (fw + gap), fy + r * (fh + gap), fw, fh);
    });

    // footer brand
    ctx.fillStyle = T.sub;
    ctx.font = `600 28px ${sans}`;
    ctx.fillText("Make your travel map", pad, CH - 70);
    ctx.fillStyle = T.text;
    ctx.font = `700 34px ${serif}`;
    const brand = "visapoint.net/travel-map";
    ctx.fillText(brand, CW - pad - ctx.measureText(brand).width, CH - 70);

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
      const data: ShareData = { title: "My travel map", text: `I've explored ${count} countries! Make yours:`, url: shareUrl() };
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
  return (
    <div className="tm">
      <div className="tm-grid">
        <div className={`tm-map tm-${theme}`}>
          <div className="tm-map-head">
            <div>
              <b>{count}</b>
              <span>{count === 1 ? "country" : "countries"} visited</span>
            </div>
            <div>
              <b>{pct}%</b>
              <span>of the world</span>
            </div>
            <div>
              <b>{contCount}/6</b>
              <span>continents</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Click countries you have visited">
            {fc
              ? fc.features
                  .filter((f) => f.properties?.name !== "Antarctica")
                  .map((f, i) => {
                    const c = byNum.get(String(Number(f.id)));
                    const fill = c && c.iso2 === home ? T.home : c && set.has(c.iso2) ? T.visited : T.land;
                    return (
                      <path
                        key={`${f.id}-${i}`}
                        d={path(f) || ""}
                        fill={fill}
                        stroke={T.line}
                        strokeWidth={0.4}
                        className={c ? "tm-c" : ""}
                        onClick={() => c && c.iso2 !== home && toggle(c.iso2)}
                        onMouseMove={(e) => {
                          const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                          setTip({ x: e.clientX - box.left, y: e.clientY - box.top, t: c ? `${c.name}${c.iso2 === home ? " (home)" : set.has(c.iso2) ? " ✓" : ""}` : f.properties?.name || "" });
                        }}
                        onMouseLeave={() => setTip(null)}
                      />
                    );
                  })
              : null}
          </svg>
          {!fc ? <div className="tm-loading">Loading world map…</div> : null}
          {tip ? (
            <div className="tm-tip" style={{ left: tip.x + 12, top: tip.y + 12 }}>
              {tip.t}
            </div>
          ) : null}
          <p className="tm-hint">Tap countries on the map, or search below. Your home country is shown in orange.</p>
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
              {LIST.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="tm-field">
            <span>Add a country</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search — e.g. Malaysia, Saudi Arabia…" />
          </label>
          {found.length ? (
            <ul className="tm-found">
              {found.map((c) => (
                <li key={c.iso2}>
                  <button
                    type="button"
                    onClick={() => {
                      if (c.iso2 !== home && !set.has(c.iso2)) toggle(c.iso2);
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
          <div className="tm-conts">
            {perCont.map((pc) => (
              <div key={pc.k}>
                <span>{CONT[pc.k]}</span>
                <i>
                  <i style={{ width: `${(pc.n / pc.total) * 100}%` }} />
                </i>
                <b>
                  {pc.n}/{pc.total}
                </b>
              </div>
            ))}
          </div>
          <div className="tm-theme" role="radiogroup" aria-label="Image style">
            {(["night", "day"] as Theme[]).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={theme === t} className={theme === t ? "on" : ""} onClick={() => setTheme(t)}>
                {t === "night" ? "Night" : "Day"}
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

      {visited.length ? (
        <div className="tm-chips" aria-label="Visited countries">
          {visited.map((v) => {
            const c = byIso.get(v);
            if (!c) return null;
            return (
              <button key={v} type="button" onClick={() => toggle(v)} title="Remove">
                <img src={flag(v, 40)} alt="" width={20} height={14} />
                {c.name} <span aria-hidden="true">×</span>
              </button>
            );
          })}
          <button type="button" className="tm-link" onClick={() => setVisited([])}>
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}

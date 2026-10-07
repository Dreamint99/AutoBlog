"use client";

import { useEffect, useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";

/* Choropleth world map (Natural Earth 110m from jsDelivr, drawn as SVG).
   `colors` maps ISO numeric codes ("050") → fill. Countries fade in with a
   staggered animation; hover shows the name + label. */

type Props = {
  colors: Record<string, string>;
  labels?: Record<string, string>;
  highlight?: string;
  ariaLabel: string;
};

const URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
let shapes: Promise<FeatureCollection<Geometry, { name: string }>> | null = null;

function loadShapes() {
  if (!shapes) {
    shapes = fetch(URL)
      .then((r) => r.json())
      .then((topo) => feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>);
  }
  return shapes;
}

const norm = (id: string | number | undefined) => (id == null ? "" : String(Number(id)));

export default function WorldMap({ colors, labels = {}, highlight, ariaLabel }: Props) {
  const [fc, setFc] = useState<FeatureCollection<Geometry, { name: string }> | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  useEffect(() => {
    loadShapes().then(setFc).catch(() => {});
  }, []);

  const byId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(colors)) m[norm(k)] = v;
    return m;
  }, [colors]);
  const labelById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(labels)) m[norm(k)] = v;
    return m;
  }, [labels]);

  const W = 960;
  const H = 500;
  const path = useMemo(() => {
    const proj = geoNaturalEarth1().fitSize([W, H], fc ?? { type: "Sphere" } as never);
    return geoPath(proj);
  }, [fc]);

  return (
    <div className="vp-map" aria-label={ariaLabel} role="img">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {fc
          ? fc.features
              .filter((f) => f.properties?.name !== "Antarctica")
              .map((f: Feature<Geometry, { name: string }>, i) => {
                const id = norm(f.id as string);
                const fill = byId[id] || "#dfe4ea";
                const isHi = highlight && norm(highlight) === id;
                return (
                  <path
                    key={`${id}-${i}`}
                    d={path(f) || ""}
                    fill={isHi ? "#13202e" : fill}
                    className="vp-map-c"
                    style={{ animationDelay: `${(i % 40) * 18}ms` }}
                    onMouseMove={(e) => {
                      const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                      setTip({
                        x: e.clientX - box.left,
                        y: e.clientY - box.top,
                        text: `${f.properties?.name ?? ""}${labelById[id] ? ` — ${labelById[id]}` : isHi ? " — passport" : ""}`,
                      });
                    }}
                    onMouseLeave={() => setTip(null)}
                  />
                );
              })
          : null}
      </svg>
      {!fc ? <div className="vp-map-loading">Loading map…</div> : null}
      {tip ? (
        <div className="vp-map-tip" style={{ left: tip.x + 12, top: tip.y + 12 }}>
          {tip.text}
        </div>
      ) : null}
    </div>
  );
}

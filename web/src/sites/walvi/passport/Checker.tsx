"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Opt = { iso2: string; name: string; slug: string };
type Res = { iso2: string; name: string; slug: string; rank: number; score: number; codes: string[] };

const LABEL: Record<string, string> = {
  F: "Visa-free",
  A: "Visa on arrival",
  T: "eTA required",
  E: "e-Visa",
  V: "Visa required",
  X: "No admission",
  S: "Your own country",
};
const NOTE: Record<string, string> = {
  F: "You can enter without applying for a visa in advance (tourist/business stays).",
  A: "You get the visa at the border on arrival — fees and documents may apply.",
  T: "Apply online for an electronic travel authorisation before you fly.",
  E: "Apply online for an e-Visa before travelling.",
  V: "Apply for a visa at the embassy or its official visa centre before travelling.",
  X: "Entry is not permitted for holders of this passport under current rules.",
  S: "No visa needed to enter your own country.",
};

/** Passport → destination requirement checker. State lives in the URL
 *  (?from=bd&to=pl) so results are shareable and bookmarkable. */
export default function Checker({
  siteId,
  passports,
  dest,
  guides,
  initialFrom,
  initialTo,
}: {
  siteId: string;
  passports: Opt[];
  dest: Opt[];
  /** destination iso2 → VisaPoint country slug (work-permit guide exists) */
  guides: Record<string, string>;
  initialFrom: string;
  initialTo: string;
}) {
  const [from, setFrom] = useState(initialFrom || "BD");
  const [to, setTo] = useState(initialTo || "PL");
  const [res, setRes] = useState<Res | null>(null);
  const [err, setErr] = useState("");
  const idx = useMemo(() => Object.fromEntries(dest.map((d, i) => [d.iso2, i])), [dest]);

  useEffect(() => {
    let alive = true;
    setErr("");
    fetch(`/api/passport?iso=${from}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Res) => alive && setRes(j))
      .catch(() => alive && setErr("Could not load visa data. Please try again."));
    return () => {
      alive = false;
    };
  }, [from]);

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("from", from.toLowerCase());
    u.searchParams.set("to", to.toLowerCase());
    window.history.replaceState(null, "", u.toString());
  }, [from, to]);

  const code = res && res.iso2 === from ? res.codes[idx[to]] || "V" : "";
  const req = code ? code[0] : "";
  const days = req === "F" && code.length > 1 ? code.slice(1) : "";
  const fromName = passports.find((p) => p.iso2 === from)?.name || from;
  const toName = dest.find((d) => d.iso2 === to)?.name || to;

  return (
    <div className="vp-chk">
      <div className="vp-chk-form">
        <label>
          <span>My passport</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {passports.map((p) => (
              <option key={p.iso2} value={p.iso2}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="vp-chk-swap"
          aria-label="Swap passport and destination"
          onClick={() => {
            if (passports.some((p) => p.iso2 === to)) {
              setFrom(to);
              setTo(from);
            }
          }}
        >
          ⇄
        </button>
        <label>
          <span>Travelling to</span>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {dest
              .filter((d) => d.iso2 !== from)
              .map((d) => (
                <option key={d.iso2} value={d.iso2}>
                  {d.name}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className={`vp-chk-result r-${req || "load"}`} aria-live="polite">
        {err ? (
          <p>{err}</p>
        ) : !req ? (
          <p className="vp-chk-wait">Checking…</p>
        ) : (
          <>
            <div className="vp-chk-flags">
              <img className="vp-flag" src={`https://flagcdn.com/w80/${from.toLowerCase()}.png`} alt="" width={48} height={32} />
              <span>→</span>
              <img className="vp-flag" src={`https://flagcdn.com/w80/${to.toLowerCase()}.png`} alt="" width={48} height={32} />
            </div>
            <span className="vp-chk-kicker">
              {fromName} passport → {toName}
            </span>
            <b className="vp-chk-label">
              {LABEL[req]}
              {days ? ` · up to ${days} days` : ""}
            </b>
            <p>{NOTE[req]}</p>
            <p className="vp-chk-warn">Tourist/business entry only. Working always needs a work permit and the right visa.</p>
            <div className="vp-chk-actions">
              {guides[to] ? (
                <Link className="vp-btn vp-btn-primary" href={`/s/${siteId}/countries/${guides[to]}`}>
                  Work permit &amp; salaries in {toName}
                </Link>
              ) : null}
              {res ? (
                <Link className="vp-btn vp-btn-outline" href={`/s/${siteId}/passport/${res.slug}`}>
                  Everywhere a {fromName} passport can go
                </Link>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

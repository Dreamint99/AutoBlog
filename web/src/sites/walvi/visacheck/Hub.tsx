import Link from "next/link";
import type { Site, Article } from "@/lib/types";
import { Masthead, Footer } from "../Chrome";
import { fontVars } from "../fonts";
import { VC, VC_REGIONS, VC_VERIFIED, flagFor, vcFor, type VcEntry } from "./data";

export const VC_FAQ = [
  {
    q: "How can I check if my visa is real?",
    a: "Check it only on the destination country's official government portal (listed on this page) using your visa or passport number. If the visa does not appear there, or the agent only sends you a PDF or a link to a different website, treat it as fake until the embassy confirms it.",
  },
  {
    q: "What do I need to check my visa status online?",
    a: "Usually your passport number and nationality, plus the visa, application or reference number on your receipt. Work visas are often issued to the employer, so ask your sponsor for the visa number.",
  },
  {
    q: "Is it free to check my visa status?",
    a: "Yes. Official government visa-check services are free. A website or agent that charges to 'check' or 'verify' a visa is not an official service.",
  },
  {
    q: "My visa does not show online — what should I do?",
    a: "Re-type the number exactly as printed, try the passport-number option, and wait a few days if the visa was just issued. If it still does not appear, contact the embassy or the official portal's helpdesk before you travel or pay anything more.",
  },
];

const STEPS = [
  { h: "Find the official portal", p: "Use the government address listed below — never a link sent by an agent." },
  { h: "Enter your details", p: "Visa or application number, passport number and nationality." },
  { h: "Check the result", p: "Name, passport number, visa type, employer and validity must match exactly." },
  { h: "Save a copy", p: "Download or print the result and keep it with your passport when you travel." },
];

const FAKE = [
  "The visa is not found on the official portal of that country.",
  "Your name, passport number or date of birth is spelled differently.",
  "You were sent a website that is not a government (.gov) domain to 'verify' it.",
  "The employer or sponsor shown is different from your job offer.",
  "You are asked to pay again to “activate” or “stamp” an e-visa.",
];

function Icon({ i }: { i: number }) {
  const paths = [
    "M4 5h16v14H4zM8 9h8M8 13h5",
    "M5 4h14v16H5zM9 8h6M9 12h6M9 16h3",
    "M5 12l4 4 10-10",
    "M12 4v10m0 0l-4-4m4 4l4-4M5 18h14",
  ];
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
      <path d={paths[i]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Card({ e, siteId }: { e: VcEntry; siteId: string }) {
  return (
    <article className="vc-card" id={e.slug}>
      <header>
        <img className="vp-flag" src={flagFor(e)} alt="" width={40} height={27} loading="lazy" />
        <h3>
          <Link href={`/s/${siteId}/visa-check/${e.slug}`}>How to check {e.country.replace(/ \(.*\)$/, "")} visa</Link>
        </h3>
      </header>
      <p className="vc-portal">{e.portal}</p>
      <ul>
        {e.need.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      {e.app ? <p className="vc-app">Also: {e.app}</p> : null}
      <div className="vc-actions">
        <a className="vp-btn vp-btn-primary" href={e.url} target="_blank" rel="noopener noreferrer nofollow">
          Check on official site ↗
        </a>
        <Link className="vp-btn vp-btn-outline" href={`/s/${siteId}/visa-check/${e.slug}`}>
          Step-by-step guide
        </Link>
      </div>
      <p className="vc-url">{e.url.replace(/^https?:\/\//, "")}</p>
    </article>
  );
}

export default function VisaCheckHub({ site, guides }: { site: Site; guides: Article[] }) {
  const b = `/s/${site.id}`;
  return (
    <div className={fontVars}>
      <Masthead site={site} />
      <main>
        <section className="vp-pi-hero vc-hero">
          <div className="vp-wrap">
            <nav className="vp-crumbs" aria-label="Breadcrumb">
              <Link href={b}>Home</Link>
              <span aria-hidden="true">›</span>
              <span>Visa status check</span>
            </nav>
            <span className="vp-eyebrow light">Visa Check</span>
            <h1>Check your visa online — the official way, country by country.</h1>
            <p className="vp-lede light">
              Qatar, Saudi Arabia, UAE, Kuwait, Oman, Malaysia, Romania and more: the official government portal to check
              your visa, what you need, and how to spot a fake visa before you pay or travel.
            </p>
            <nav className="vc-jump" aria-label="Jump to country">
              {VC.map((e) => (
                <a key={e.slug} href={`${b}/visa-check/${e.slug}`}>
                  <img className="vp-flag" src={flagFor(e, 40)} alt="" width={20} height={14} />
                  {e.country.replace(/ \(.*\)$/, "")}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <section className="vp-sec">
          <div className="vp-wrap">
            <h2 className="vp-h2">How a visa check works</h2>
            <ol className="vc-steps">
              {STEPS.map((s, i) => (
                <li key={s.h}>
                  <span className="vc-ico">
                    <Icon i={i} />
                  </span>
                  <span className="vp-step-n">{i + 1}</span>
                  <b>{s.h}</b>
                  <p>{s.p}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {VC_REGIONS.map((r) => {
          const list = VC.filter((e) => e.region === r);
          if (!list.length) return null;
          return (
            <section className="vp-sec vp-sec-alt" key={r}>
              <div className="vp-wrap">
                <h2 className="vp-h2">{r === "Gulf" ? "Gulf countries" : r}</h2>
                <div className="vc-grid">
                  {list.map((e) => (
                    <Card key={e.slug} e={e} siteId={site.id} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        <section className="vp-sec">
          <div className="vp-wrap vp-split">
            <div className="vp-alert">
              <div className="vp-alert-head">
                <span aria-hidden="true">!</span>
                <h2>How to spot a fake visa</h2>
              </div>
              <ul>
                {FAKE.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p>
                <b>A real visa is always visible on the official portal.</b> If it is not, do not travel and do not pay more —
                contact the embassy.
              </p>
            </div>
            <div>
              <h2 className="vp-h2">Visa check questions</h2>
              <div className="vp-faq">
                {VC_FAQ.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
              <p className="vp-credit">
                Official portals compiled by VisaPoint from publicly available government sources; last reviewed{" "}
                {new Date(VC_VERIFIED).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Always
                type the address yourself — scammers build look-alike sites.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer site={site} />
    </div>
  );
}

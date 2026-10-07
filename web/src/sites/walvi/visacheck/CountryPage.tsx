import Link from "next/link";
import type { Site, Article } from "@/lib/types";
import type { TocItem } from "@/lib/types";
import { Masthead, Footer } from "../Chrome";
import { fontVars } from "../fonts";
import { VC, VC_VERIFIED, flagFor, type VcEntry } from "./data";

export function vcName(e: VcEntry): string {
  return e.country.replace(/ \(.*\)$/, "");
}

export function vcTitle(e: VcEntry, year = new Date().getFullYear()): string {
  return e.slug === "schengen-vfs"
    ? `How to Check Schengen Visa Status Online (${year})`
    : `How to Check ${vcName(e)} Visa Online (${year})`;
}

/** Country-specific FAQ (also emitted as FAQPage JSON-LD by the route). */
export function vcFaq(e: VcEntry) {
  const n = vcName(e);
  const host = e.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return [
    {
      q: `How can I check my ${n} visa online?`,
      a: `Use the official portal — ${e.portal} (${host}). Enter ${e.need.join(", ").toLowerCase()} and check that the details shown match your passport.`,
    },
    {
      q: `How do I know if my ${n} visa is real or fake?`,
      a: `A genuine ${n} visa can be found on the official government portal with your details. If it is not found, the name or passport number differs, or you were sent to a non-government website to "verify" it, treat it as fake and contact the embassy before travelling or paying anything more.`,
    },
    {
      q: `Is ${n} visa checking free?`,
      a: "Yes. Checking a visa on the official government portal is free. Anyone charging a fee just to check or 'activate' a visa is not an official service.",
    },
    { q: `What do I need to check a ${n} visa?`, a: `${e.need.join(", ")}.` },
  ];
}

export default function VisaCheckCountry({
  site,
  e,
  guide,
  bodyHtml,
  toc,
  others,
}: {
  site: Site;
  e: VcEntry;
  guide?: Article;
  bodyHtml?: string;
  toc?: TocItem[];
  others: VcEntry[];
}) {
  const b = `/s/${site.id}`;
  const n = vcName(e);
  const host = e.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const faq = vcFaq(e);
  const updated = guide?.created_at && guide.created_at > VC_VERIFIED ? guide.created_at : VC_VERIFIED;

  return (
    <div className={fontVars}>
      <Masthead site={site} />
      <main>
        <section className="vp-pi-hero vc-hero">
          <div className="vp-wrap vc-c-hero">
            <div>
              <nav className="vp-crumbs" aria-label="Breadcrumb">
                <Link href={b}>Home</Link>
                <span aria-hidden="true">›</span>
                <Link href={`${b}/visa-check`}>Visa check</Link>
                <span aria-hidden="true">›</span>
                <span>{n}</span>
              </nav>
              <span className="vp-eyebrow light">Visa Check · {e.region}</span>
              <h1>{vcTitle(e)}</h1>
              <p className="vp-lede light">
                The official way to check a {n} visa: where to check, what you need, step by step — and how to spot a fake
                visa before you travel or pay.
              </p>
              <div className="vp-pagehead-meta">
                <span>
                  <b>Official portal:</b> {host}
                </span>
                <span>
                  <b>Cost:</b> free
                </span>
                <span>
                  <b>Last reviewed:</b>{" "}
                  {new Date(updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>
            <div className="vc-c-card">
              <img className="vp-flag" src={flagFor(e, 160)} alt={`${n} flag`} width={96} height={64} />
              <span>Check your visa on</span>
              <b>{e.portal}</b>
              <a className="vp-btn vp-btn-primary vp-btn-block" href={e.url} target="_blank" rel="noopener noreferrer nofollow">
                Open {host} ↗
              </a>
              <small>Type the address yourself — beware look-alike sites.</small>
            </div>
          </div>
        </section>

        <div className="vp-wrap vp-art-grid">
          <aside className="vp-art-left">
            {toc && toc.length ? (
              <details className="vp-toc vp-toc-rail" open>
                <summary>On this page</summary>
                <ol>
                  <li className="l2">
                    <a href="#steps">Step by step</a>
                  </li>
                  <li className="l2">
                    <a href="#fake">Spot a fake visa</a>
                  </li>
                  {toc.map((it) => (
                    <li className={it.level >= 3 ? "l3" : "l2"} key={it.id}>
                      <a href={`#${it.id}`}>{it.text}</a>
                    </li>
                  ))}
                  <li className="l2">
                    <a href="#faq">FAQ</a>
                  </li>
                </ol>
              </details>
            ) : null}
          </aside>

          <div className="vp-art-main">
            <section className="vc-now" id="steps">
              <div className="vc-now-head">
                <img className="vp-flag" src={flagFor(e)} alt="" width={44} height={30} />
                <div>
                  <span>Step by step</span>
                  <b>Check a {n} visa in 4 steps</b>
                </div>
              </div>
              <ol className="vc-c-steps">
                <li>
                  <b>Open the official portal</b>
                  <p>
                    Go to <a href={e.url} target="_blank" rel="noopener noreferrer nofollow">{host}</a> — {e.portal}.
                  </p>
                </li>
                <li>
                  <b>Enter your details</b>
                  <p>{e.need.join(" · ")}</p>
                </li>
                <li>
                  <b>Check every detail</b>
                  <p>Name, passport number, nationality, visa type, sponsor/employer and validity dates must match exactly.</p>
                </li>
                <li>
                  <b>Save the result</b>
                  <p>Download or print it and carry it with your passport.</p>
                </li>
              </ol>
              {e.app ? <p className="vc-app">Also: {e.app}</p> : null}
              <p className="vc-tip">{e.tip}</p>
            </section>

            <section className="vp-alert" id="fake" style={{ marginBottom: 26 }}>
              <div className="vp-alert-head">
                <span aria-hidden="true">!</span>
                <h2>Is your {n} visa fake? Warning signs</h2>
              </div>
              <ul>
                <li>It cannot be found on {host} with your passport number.</li>
                <li>Your name, date of birth or passport number is spelled differently.</li>
                <li>You were given a different website or a PDF only, and no official reference.</li>
                <li>The sponsor/employer shown is not the one in your job offer.</li>
                <li>You are asked to pay again to “activate”, “stamp” or “verify” the visa.</li>
              </ul>
            </section>

            {bodyHtml ? <div id="article-body" className="article-content" dangerouslySetInnerHTML={{ __html: bodyHtml }} /> : null}

            <section className="vc-faq" id="faq">
              <h2 className="vp-h2">{n} visa check — FAQ</h2>
              <div className="vp-faq">
                {faq.map((f) => (
                  <details key={f.q} open>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="vp-art-right">
            <section className="vp-panel">
              <h2 className="vp-panel-h">Check another country</h2>
              <ul className="vc-c-others">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link href={`${b}/visa-check/${o.slug}`}>
                      <img className="vp-flag" src={flagFor(o, 40)} alt="" width={22} height={15} loading="lazy" />
                      {vcName(o)}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link className="vp-more" href={`${b}/visa-check`}>
                All visa checks →
              </Link>
            </section>
            <section className="vp-panel">
              <h2 className="vp-panel-h">Planning to work abroad?</h2>
              <ul className="vp-links">
                <li>
                  <Link href={`${b}/visa-checker`}>Do I need a visa? (checker)</Link>
                </li>
                <li>
                  <Link href={`${b}/passport-index`}>Passport Index</Link>
                </li>
                <li>
                  <Link href={`${b}/countries`}>Work permits by country</Link>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </main>
      <Footer site={site} />
    </div>
  );
}

export { VC };

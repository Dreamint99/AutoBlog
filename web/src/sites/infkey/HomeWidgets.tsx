import Link from "next/link";
import type { Site } from "@/lib/types";
import { getStatuses, statusWord } from "@/lib/aidata";
import { getDayChanges, getNewModels } from "@/lib/models";
import { fmtUsd, fmtDate } from "./data-ui";

/* Server components for the InfKey home page data widgets. */

/** Status strip: all services as colored pills */
export async function StatusStrip({ site }: { site: Site }) {
  const list = await getStatuses();
  if (!list.length) return null;
  const b = `/s/${site.id}`;
  const dotClass = (ind: string) =>
    ind === "none" ? "ok" : ind === "minor" || ind === "maintenance" ? "warn" : "bad";
  return (
    <section className="status-strip" aria-label="AI service status">
      {list.map((s) => (
        <Link href={`${b}/status/${s.service}`} className="status-pill" key={s.service}>
          <span className={`dot ${dotClass(s.indicator)}`} aria-hidden="true" />
          <span>{s.name}</span>
        </Link>
      ))}
    </section>
  );
}

/** Today's price changes summary (compact for home) */
export async function ChangesSummary({ site }: { site: Site }) {
  const today = new Date().toISOString().slice(0, 10);
  const c = await getDayChanges(today);
  const n = c.up.length + c.down.length + c.added.length;
  if (n === 0 && !c.first) return null;
  const b = `/s/${site.id}`;
  return (
    <section className="ai-sec" id="changes-today">
      <div className="section-head">
        <h2>Price changes today</h2>
        <span className="rule" />
        <span className="count">{n} change{n !== 1 ? "s" : ""}</span>
      </div>
      {c.first ? (
        <p className="src-note">Tracking started today — changes will appear tomorrow.</p>
      ) : n === 0 ? (
        <p className="src-note">No price changes detected today.</p>
      ) : (
        <>
          <div className="vs-links" style={{ marginBottom: "16px" }}>
            {c.down.slice(0, 4).map((ch) => (
              <Link className="vs-link" href={`${b}/models/${ch.model.id}`} key={ch.model.id}>
                <span className="change-chip down">
                  <span className="arrow">▼</span>
                  {Math.abs(Math.round(((((ch.newIn ?? 0) + (ch.newOut ?? 0)) - ((ch.oldIn ?? 0) + (ch.oldOut ?? 0))) / ((ch.oldIn ?? 1) + (ch.oldOut ?? 1))) * 100))}%
                </span>
                {ch.model.name}
              </Link>
            ))}
            {c.up.slice(0, 3).map((ch) => (
              <Link className="vs-link" href={`${b}/models/${ch.model.id}`} key={ch.model.id}>
                <span className="change-chip up">
                  <span className="arrow">▲</span>
                  +{Math.round(((((ch.newIn ?? 0) + (ch.newOut ?? 0)) - ((ch.oldIn ?? 0) + (ch.oldOut ?? 0))) / ((ch.oldIn ?? 1) + (ch.oldOut ?? 1))) * 100)}%
                </span>
                {ch.model.name}
              </Link>
            ))}
          </div>
          <Link className="btn btn-ghost" href={`${b}/changes`}>
            See all changes →
          </Link>
        </>
      )}
    </section>
  );
}

/** New models this week */
export async function NewModels({ site }: { site: Site }) {
  const models = await getNewModels(7);
  if (!models.length) return null;
  const b = `/s/${site.id}`;
  return (
    <section className="ai-sec" id="new-models">
      <div className="section-head">
        <h2>New this week</h2>
        <span className="rule" />
        <span className="count">{models.length} model{models.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="vs-links">
        {models.slice(0, 8).map((m) => (
          <Link className="vs-link" href={`${b}/models/${m.id}`} key={m.id}>
            <b>{m.name}</b>
            <span style={{ color: "var(--faint)", marginLeft: "8px" }}>{fmtUsd(m.input_per_m, 3)} in / {fmtUsd(m.output_per_m, 2)} out</span>
          </Link>
        ))}
      </div>
      <Link className="btn btn-ghost" href={`${b}/new`} style={{ marginTop: "16px" }}>
        See all new models →
      </Link>
    </section>
  );
}

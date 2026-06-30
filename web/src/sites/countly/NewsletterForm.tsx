"use client";

import { useState } from "react";

// Subscriptions are stored in our OWN Supabase `subscribers` table (RLS: anon may
// insert only — emails are private). View them in the Supabase dashboard → Table
// Editor → subscribers. Uses the public anon key (safe to expose client-side).
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    if (!SB_URL || !SB_KEY) { setState("err"); return; }
    setState("loading");
    try {
      const r = await fetch(`${SB_URL}/rest/v1/subscribers`, {
        method: "POST",
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ email: email.trim(), site: "countly", source: "newsletter" }),
      });
      setState(r.ok ? "ok" : "err");
      if (r.ok) setEmail("");
    } catch {
      setState("err");
    }
  }

  return (
    <section className="cn-news" aria-label="Newsletter">
      <div className="cn-wrap">
        <div className="cn-news-card">
          <div className="cn-news-copy">
            <h2>Get the numbers, weekly</h2>
            <p>New rankings, live data and stats — straight to your inbox. No spam.</p>
          </div>
          {state === "ok" ? (
            <p className="cn-news-ok">✅ Thanks — you&apos;re subscribed!</p>
          ) : (
            <form className="cn-news-form" onSubmit={submit}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                aria-label="Email address"
              />
              <button type="submit" disabled={state === "loading"}>
                {state === "loading" ? "…" : "Subscribe"}
              </button>
            </form>
          )}
          {state === "err" ? <p className="cn-news-err">Couldn&apos;t subscribe right now — please try again later.</p> : null}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";

// Free email capture via Web3Forms (no backend needed). Get a free access key at
// https://web3forms.com (just enter your email — no account) and set it here or in
// NEXT_PUBLIC_WEB3FORMS_KEY. Until a key is set, the form shows a gentle notice.
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    if (!ACCESS_KEY) { setState("err"); return; }
    setState("loading");
    try {
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: ACCESS_KEY, email, subject: "New Countly subscriber", from_name: "Countly" }),
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

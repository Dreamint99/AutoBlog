"use client";

import { useState } from "react";

// Contact messages are stored in our own Supabase `messages` table (RLS: anon
// insert only). View them in the Supabase dashboard → Table Editor → messages.
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    if (!SB_URL || !SB_KEY) { setState("err"); return; }
    setState("loading");
    try {
      const r = await fetch(`${SB_URL}/rest/v1/messages`, {
        method: "POST",
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), site: "countly" }),
      });
      setState(r.ok ? "ok" : "err");
      if (r.ok) { setName(""); setEmail(""); setMessage(""); }
    } catch {
      setState("err");
    }
  }

  if (state === "ok") {
    return <p className="cn-news-ok" style={{ fontSize: "1.05rem" }}>✅ Thanks — your message has been sent. We&apos;ll get back to you.</p>;
  }

  return (
    <form className="cn-contact" onSubmit={submit}>
      <div className="cn-contact-grid">
        <label className="cn-tool-field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </label>
        <label className="cn-tool-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </label>
      </div>
      <label className="cn-tool-field">
        <span>Message</span>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
        />
      </label>
      <button type="submit" className="cn-contact-btn" disabled={state === "loading"}>
        {state === "loading" ? "Sending…" : "Send message"}
      </button>
      {state === "err" ? <p className="cn-news-err" style={{ color: "#dc2626" }}>Couldn&apos;t send right now — please try again.</p> : null}
    </form>
  );
}

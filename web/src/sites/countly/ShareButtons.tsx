"use client";

import { useState } from "react";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const links = [
    { name: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    }
  }

  return (
    <div className="cn-share" aria-label="Share this page">
      <span className="cn-share-label">Share:</span>
      {links.map((l) => (
        <a key={l.name} className={`cn-share-btn cn-share-${l.name.toLowerCase()}`} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${l.name}`}>
          {l.name}
        </a>
      ))}
      <button type="button" className="cn-share-btn cn-share-copy" onClick={copy}>
        {copied ? "✓ Copied" : "Copy link"}
      </button>
      <button type="button" className="cn-share-btn cn-share-native" onClick={nativeShare} aria-label="Share">
        ⇪ Share
      </button>
    </div>
  );
}

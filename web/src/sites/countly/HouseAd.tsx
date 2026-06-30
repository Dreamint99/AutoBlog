import Link from "next/link";

// House ad / cross-promo for our own sister site. Uses rel="nofollow sponsored"
// so it reads as a promo (not an editorial link) and avoids link-scheme signals.
export default function HouseAd() {
  return (
    <a
      className="cn-housead"
      href="https://ninetymins.com/"
      target="_blank"
      rel="nofollow sponsored noopener"
      aria-label="Visit ninetymins.com — live football scores and news"
    >
      <span className="cn-housead-badge" aria-hidden="true">⚽</span>
      <span className="cn-housead-copy">
        <b>ninetymins.com</b>
        <small>Live football scores, fixtures &amp; news — fast.</small>
      </span>
      <span className="cn-housead-cta">Visit site →</span>
    </a>
  );
}

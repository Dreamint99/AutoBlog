import { flagUrl } from "./guide-meta";

/** Real flag image (flagcdn.com) with the emoji as fallback text. */
export default function Flag({ emoji, size = 28, className = "" }: { emoji?: string; size?: number; className?: string }) {
  const src = flagUrl(emoji, size > 40 ? 160 : 80);
  if (!src) return <span className={`vp-flag ${className}`} aria-hidden="true">{emoji || "🧭"}</span>;
  return (
    <img
      className={`vp-flag ${className}`}
      src={src}
      alt=""
      width={size}
      height={Math.round(size * 0.68)}
      loading="lazy"
      style={{ width: size, height: Math.round(size * 0.68) }}
    />
  );
}

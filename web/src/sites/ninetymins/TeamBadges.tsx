/* Small presentational pieces shared by the server-rendered football pages.
   Every image is lazy, has fixed width/height (no layout shift) and an initials fallback. */
const initials = (name: string) => name.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 3).toUpperCase() || "?";

export function Crest({ url, name, size = 22, color, eager = false }: { url?: string; name: string; size?: number; color?: string; eager?: boolean }) {
  return url
    ? <img className="nm-crest" src={url} alt={`${name} logo`} width={size} height={size} loading={eager ? "eager" : "lazy"} decoding="async" />
    : <span className="nm-crest nm-crest-ph" style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.36)), background: color ? (color.startsWith("#") ? color : `#${color}`) : undefined }} aria-hidden="true">{initials(name)}</span>;
}

export function Avatar({ url, name, size = 32 }: { url?: string; name: string; size?: number }) {
  return url
    ? <img className="nm-avatar" src={url} alt={name} width={size} height={size} loading="lazy" decoding="async" />
    : <span className="nm-avatar nm-avatar-ph" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">{initials(name)}</span>;
}

export function Flag({ url, country, w = 20 }: { url?: string; country: string; w?: number }) {
  return url ? <img className="nm-flag-sm" src={url} alt={`${country} flag`} width={w} height={Math.round(w * 0.75)} loading="lazy" decoding="async" /> : null;
}

/** Team name with crest, linked to its team page when we have one. */
export function TeamLink({ slug, name, url, size = 22, color }: { slug?: string; name: string; url?: string; size?: number; color?: string }) {
  const inner = <><Crest url={url} name={name} size={size} color={color} /><span>{name}</span></>;
  return slug ? <a className="nm-team-link" href={`/team/${slug}`}>{inner}</a> : <span className="nm-team-link">{inner}</span>;
}

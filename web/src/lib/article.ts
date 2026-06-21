import type { TocItem } from "./types";

export function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "section";
}

/**
 * Server-side body processing shared by every site design:
 *  - give <h2>/<h3> stable ids (for the table-of-contents anchors)
 *  - wrap <table> in .table-wrap for horizontal scroll on mobile
 * Returns the rewritten HTML and the extracted table of contents.
 */
export function processBody(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  let out = html.replace(/<(h2|h3)>([\s\S]*?)<\/\1>/gi, (_m, tag: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const id = slugifyHeading(text);
    toc.push({ id, text, level: tag.toLowerCase() === "h2" ? 2 : 3 });
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
  out = out
    .replace(/<table/gi, '<div class="table-wrap"><table')
    .replace(/<\/table>/gi, "</table></div>");
  return { html: out, toc };
}

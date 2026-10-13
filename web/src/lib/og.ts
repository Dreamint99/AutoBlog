import { activeSite } from "@/lib/site-context";

/** The site's default 1200×630 share card, for pages without an image of their own. */
export function defaultOgImages() {
  return [{ url: `/og/${activeSite().id}.png`, width: 1200, height: 630 }];
}

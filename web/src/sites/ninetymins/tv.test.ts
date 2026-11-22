/* Home "Live now" reads the same feed as Live TV. These lock the filter:
 * only official YouTube rows, paired matches before everything else, then viewers.
 *
 * Run: cd web && node --test src/sites/ninetymins/tv.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanStreamTitle, liveYoutube, youtubeWatchUrl, type TvFeed } from "./tv.ts";

test("youtube watch url is a video link, never a non-youtube row", () => {
  assert.equal(youtubeWatchUrl({ id: "48T15_Q28ZE", kind: "youtube" }), "https://www.youtube.com/watch?v=48T15_Q28ZE");
  assert.equal(youtubeWatchUrl({ id: "_Dl3ijj3M-U", kind: "youtube" }), "https://www.youtube.com/watch?v=_Dl3ijj3M-U");
  assert.equal(
    youtubeWatchUrl({ id: "channel-only", kind: "youtube", url: "https://www.youtube.com/watch?v=abcdefghijk" }),
    "https://www.youtube.com/watch?v=abcdefghijk",
  );
  assert.equal(youtubeWatchUrl({ id: "48T15_Q28ZE", kind: "twitch" }), null);
  assert.equal(youtubeWatchUrl({ id: "short", kind: "youtube" }), null);
  assert.equal(youtubeWatchUrl({ id: "short", kind: "youtube", url: "https://example.com/stream" }), null);
});

test("live list prefers paired matches, then viewers, and drops non-youtube", () => {
  const feed: TvFeed = {
    t: 1,
    upcoming: [{ id: "eeeeeeeeeee", kind: "youtube", title: "later", channel: "x", sport: "football", state: "upcoming", start: "" }],
    live: [
      { id: "aaaaaaaaaaa", kind: "youtube", title: "court", channel: "WTT", sport: "tabletennis", state: "live", start: "", viewers: 9000 },
      { id: "bbbbbbbbbbb", kind: "youtube", title: "small match", channel: "CSA", sport: "cricket", state: "live", start: "", viewers: 10, match: { sport: "cricket", league: "1", id: "2", name: "A v B" } },
      { id: "ccccccccccc", kind: "youtube", title: "big match", channel: "T Sports", sport: "cricket", state: "live", start: "", viewers: 7000, match: { sport: "cricket", league: "1", id: "3", name: "C v D" } },
      { id: "ddddddddddd", kind: "hls", title: "other", channel: "x", sport: "football", state: "live", start: "" },
    ],
  };
  assert.deepEqual(
    liveYoutube(feed).map((s) => s.id),
    ["ccccccccccc", "bbbbbbbbbbb", "aaaaaaaaaaa"],
  );
  assert.deepEqual(liveYoutube(null), []);
});

test("cleanStreamTitle drops emoji and tidy pipes", () => {
  assert.equal(cleanStreamTitle("  LIVE 🔥 |  Match  "), "LIVE | Match");
});

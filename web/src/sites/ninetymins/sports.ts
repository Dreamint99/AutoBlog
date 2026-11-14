/* Shared by the server home and the client scoreboard (no "use client"). */

export const LS_SPORTS: Array<{ key: string; label: string; leagues: string[] }> = [
  {
    key: "football",
    label: "Football",
    leagues: ["eng.1", "uefa.champions", "esp.1", "ita.1", "ger.1", "fra.1", "uefa.europa", "afc.saff.championship", "fifa.worldq.afc", "afc.asian.cupq", "fifa.friendly", "ind.1", "usa.1"],
  },
  { key: "cricket", label: "Cricket", leagues: ["cricket"] },
  { key: "basketball", label: "Basketball", leagues: ["nba", "wnba"] },
  { key: "tennis", label: "Tennis", leagues: ["atp", "wta"] },
  { key: "hockey", label: "Hockey", leagues: ["nhl"] },
  { key: "american-football", label: "NFL", leagues: ["nfl"] },
  { key: "baseball", label: "Baseball", leagues: ["mlb"] },
  { key: "mma", label: "MMA", leagues: ["ufc"] },
  { key: "f1", label: "F1", leagues: ["f1"] },
];

export const PLAY_URL = (medium: string) =>
  `https://play.google.com/store/apps/details?id=com.ninetymins.app&referrer=${encodeURIComponent(`utm_source=ninetymins.com&utm_medium=${medium}`)}`;

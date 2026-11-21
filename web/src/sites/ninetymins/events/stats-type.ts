export type Rate = { matches?: number; wins?: number; rate: number | null; chosen?: number };
export type TossSide = { chosen: number; wins: number; rate: number | null };
export type LeagueStats = {
  label: string;
  file: string;
  license: string;
  source: string;
  retrieved: string;
  matches: number;
  from: string | null;
  to: string | null;
  notes: string[];
  all: { chase: { matches: number; wins: number; rate: number | null }; toss: { bat: TossSide; field: TossSide } };
  latest: {
    season: string;
    matches: number;
    from: string;
    to: string;
    teams: { name: string; p: number; w: number; l: number; nr: number; form: string }[];
    venues: { name: string; city: string; matches: number; firstInningsAvg: number | null; chaseMatches: number; chaseWins: number; chaseRate: number | null }[];
    h2h: { a: string; b: string; matches: number; aWins: number; bWins: number }[];
    chase: { matches: number; wins: number; rate: number | null };
    toss: { bat: TossSide; field: TossSide };
  };
};

import type {
  MatchDataProvider,
  MatchStatus,
  ProviderMatch,
  Stage,
} from "./types";

const KNOWN_STAGES: readonly string[] = [
  "GROUP_STAGE",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

const KNOWN_STATUSES: readonly string[] = [
  "SCHEDULED",
  "TIMED",
  "IN_PLAY",
  "PAUSED",
  "FINISHED",
  "SUSPENDED",
  "POSTPONED",
  "CANCELLED",
  "AWARDED",
];

interface FdTeam {
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

interface FdScorePart {
  home: number | null;
  away: number | null;
}

interface FdScore {
  winner: string | null;
  duration: string;
  fullTime: FdScorePart;
  halfTime: FdScorePart;
  /** Present when the match went beyond 90 minutes: the score at full time. */
  regularTime?: FdScorePart;
}

export interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: FdScore;
}

/**
 * The competition scores against the 90-minute result only. For matches that
 * went to extra time the provider moves the 90' score to `regularTime`; when
 * it is absent on such a match we return null rather than guess, leaving the
 * result for an admin to confirm.
 */
export function score90(score: FdScore, status: string): FdScorePart | null {
  if (status !== "FINISHED" && status !== "AWARDED") return null;
  if (score.regularTime && score.regularTime.home !== null) return score.regularTime;
  if (score.duration === "REGULAR" && score.fullTime.home !== null) {
    return score.fullTime;
  }
  return null;
}

export function mapFdMatch(m: FdMatch): ProviderMatch {
  const result = score90(m.score, m.status);
  return {
    providerMatchId: String(m.id),
    stage: m.stage as Stage,
    homeTeam: m.homeTeam.shortName ?? m.homeTeam.name,
    awayTeam: m.awayTeam.shortName ?? m.awayTeam.name,
    homeTeamCode: m.homeTeam.tla,
    awayTeamCode: m.awayTeam.tla,
    homeCrestUrl: m.homeTeam.crest,
    awayCrestUrl: m.awayTeam.crest,
    kickoffUtc: new Date(m.utcDate),
    status: (KNOWN_STATUSES.includes(m.status) ? m.status : "SCHEDULED") as MatchStatus,
    homeScore90: result?.home ?? null,
    awayScore90: result?.away ?? null,
  };
}

export const footballDataProvider: MatchDataProvider = {
  name: "football-data",
  async fetchMatches() {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) throw new Error("FOOTBALL_DATA_TOKEN is not set");

    const res = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches",
      { headers: { "X-Auth-Token": token }, cache: "no-store" },
    );
    if (!res.ok) {
      throw new Error(`football-data.org responded ${res.status}`);
    }
    // Which matches the competition actually uses is sync's decision
    // (knockout stages + allowlisted extras) — the provider just provides.
    const body = (await res.json()) as { matches: FdMatch[] };
    return body.matches
      .filter((m) => KNOWN_STAGES.includes(m.stage))
      .map(mapFdMatch);
  },
};

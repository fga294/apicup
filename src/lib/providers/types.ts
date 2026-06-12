import type { matchStatusEnum, providerEnum, stageEnum } from "@/db/schema";

export type Stage = (typeof stageEnum.enumValues)[number];
export type MatchStatus = (typeof matchStatusEnum.enumValues)[number];
export type ProviderName = (typeof providerEnum.enumValues)[number];

/** A match in provider-neutral form, ready to upsert into the matches table. */
export interface ProviderMatch {
  providerMatchId: string;
  stage: Stage;
  homeTeam: string | null;
  awayTeam: string | null;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  homeCrestUrl: string | null;
  awayCrestUrl: string | null;
  kickoffUtc: Date;
  status: MatchStatus;
  homeScore90: number | null;
  awayScore90: number | null;
}

export interface MatchDataProvider {
  name: ProviderName;
  /** Fetch all competition matches in scope (knockout stages only). */
  fetchMatches(): Promise<ProviderMatch[]>;
}

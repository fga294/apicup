import { describe, expect, it } from "vitest";

import { mapFdMatch, score90, type FdMatch } from "@/lib/providers/footballData";

import fixture from "../providers/__fixtures__/wc-sample.json";

const matches = fixture.matches as unknown as FdMatch[];
const tbdMatch = matches.find((m) => m.stage === "LAST_32" && !m.homeTeam.name)!;
const etMatch = matches.find((m) => m.id === 999001)!;

describe("mapFdMatch", () => {
  it("maps a knockout match with undetermined teams to null team fields", () => {
    const mapped = mapFdMatch(tbdMatch);
    expect(mapped.stage).toBe("LAST_32");
    expect(mapped.homeTeam).toBeNull();
    expect(mapped.awayTeam).toBeNull();
    expect(mapped.homeScore90).toBeNull();
    expect(mapped.kickoffUtc).toBeInstanceOf(Date);
    expect(mapped.status).toBe("TIMED");
  });

  it("uses the regularTime score for a match decided in extra time", () => {
    const mapped = mapFdMatch(etMatch);
    // Full time was 3-2 after ET, but the competition scores the 90' result.
    expect(mapped.homeScore90).toBe(2);
    expect(mapped.awayScore90).toBe(2);
    expect(mapped.status).toBe("FINISHED");
  });
});

describe("score90", () => {
  it("returns fullTime for a regular-duration finished match", () => {
    const result = score90(
      {
        winner: "HOME_TEAM",
        duration: "REGULAR",
        fullTime: { home: 2, away: 0 },
        halfTime: { home: 1, away: 0 },
      },
      "FINISHED",
    );
    expect(result).toEqual({ home: 2, away: 0 });
  });

  it("returns null while a match is still in play", () => {
    const result = score90(
      {
        winner: null,
        duration: "REGULAR",
        fullTime: { home: 1, away: 0 },
        halfTime: { home: 1, away: 0 },
      },
      "IN_PLAY",
    );
    expect(result).toBeNull();
  });

  it("returns null for an ET match missing regularTime rather than guessing", () => {
    const result = score90(
      {
        winner: "AWAY_TEAM",
        duration: "PENALTY_SHOOTOUT",
        fullTime: { home: 1, away: 1 },
        halfTime: { home: 0, away: 0 },
      },
      "FINISHED",
    );
    expect(result).toBeNull();
  });
});

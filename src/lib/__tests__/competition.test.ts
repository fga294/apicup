import { describe, expect, it } from "vitest";

import { isOpenForPredictions, predictionCutoff } from "@/lib/competition";

const kickoff = new Date("2026-06-28T19:00:00Z");
const baseMatch = {
  kickoffUtc: kickoff,
  homeTeam: "Argentina",
  awayTeam: "England",
  status: "TIMED",
};

describe("predictionCutoff", () => {
  it("is exactly one hour before kickoff", () => {
    expect(predictionCutoff(kickoff).toISOString()).toBe("2026-06-28T18:00:00.000Z");
  });
});

describe("isOpenForPredictions", () => {
  it("is open just before the cutoff", () => {
    const now = new Date("2026-06-28T17:59:59.999Z");
    expect(isOpenForPredictions(baseMatch, now)).toBe(true);
  });

  it("closes exactly at the cutoff instant", () => {
    const now = new Date("2026-06-28T18:00:00.000Z");
    expect(isOpenForPredictions(baseMatch, now)).toBe(false);
  });

  it("is closed while teams are undetermined, even far before kickoff", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    expect(
      isOpenForPredictions({ ...baseMatch, homeTeam: null, awayTeam: null }, now),
    ).toBe(false);
  });

  it("is closed for postponed and in-play matches regardless of time", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    expect(isOpenForPredictions({ ...baseMatch, status: "POSTPONED" }, now)).toBe(false);
    expect(isOpenForPredictions({ ...baseMatch, status: "IN_PLAY" }, now)).toBe(false);
  });
});

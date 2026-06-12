import { describe, expect, it } from "vitest";

import { computePoints } from "@/lib/scoring";

// Examples straight from the competition rules in docs/Plan_APICUP.md.
describe("computePoints", () => {
  it("awards 10 for the exact scoreline", () => {
    expect(computePoints({ homeScore: 2, awayScore: 0 }, { homeScore: 2, awayScore: 0 })).toBe(10);
  });

  it("awards 10 for an exact draw", () => {
    expect(computePoints({ homeScore: 3, awayScore: 3 }, { homeScore: 3, awayScore: 3 })).toBe(10);
  });

  it("awards 5 for the correct winner with the wrong score", () => {
    expect(computePoints({ homeScore: 4, awayScore: 3 }, { homeScore: 2, awayScore: 0 })).toBe(5);
  });

  it("awards 5 for a draw with the wrong score", () => {
    expect(computePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 3, awayScore: 3 })).toBe(5);
  });

  it("awards 5 for the correct away win with the wrong score", () => {
    expect(computePoints({ homeScore: 0, awayScore: 3 }, { homeScore: 1, awayScore: 2 })).toBe(5);
  });

  it("awards 0 for the wrong outcome", () => {
    expect(computePoints({ homeScore: 0, awayScore: 1 }, { homeScore: 2, awayScore: 0 })).toBe(0);
  });

  it("awards 0 when a draw was predicted but a team won", () => {
    expect(computePoints({ homeScore: 4, awayScore: 0 }, { homeScore: 3, awayScore: 3 })).toBe(0);
  });

  it("awards 0 when a win was predicted but it was a draw", () => {
    expect(computePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 1, awayScore: 1 })).toBe(0);
  });
});

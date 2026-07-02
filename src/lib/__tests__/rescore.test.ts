import { describe, expect, it } from "vitest";

import { reconcilePoints, type ScorablePrediction } from "@/lib/rescore";

// The 90' result of the Belgium v Senegal bug: a 2-2 draw.
const results = new Map([[9, { homeScore90: 2, awayScore90: 2 }]]);

const pred = (over: Partial<ScorablePrediction>): ScorablePrediction => ({
  id: 1,
  matchId: 9,
  homeScore: 0,
  awayScore: 0,
  points: null,
  ...over,
});

describe("reconcilePoints", () => {
  it("scores an unscored prediction on a finished match", () => {
    const out = reconcilePoints(results, [pred({ id: 1, homeScore: 2, awayScore: 2, points: null })]);
    expect(out).toEqual([{ id: 1, points: 10 }]);
  });

  it("leaves a correctly-scored prediction untouched", () => {
    // 1-1 predicted, true result 2-2: correct outcome (draw), wrong score → 5.
    const out = reconcilePoints(results, [pred({ id: 2, homeScore: 1, awayScore: 1, points: 5 })]);
    expect(out).toEqual([]);
  });

  it("corrects points scored against a stale result (the extra-time bug)", () => {
    // These were all scored while the match wrongly read 3-2 (a Belgium win).
    const out = reconcilePoints(results, [
      pred({ id: 10, homeScore: 2, awayScore: 1, points: 5 }), // home win → now wrong → 0
      pred({ id: 11, homeScore: 1, awayScore: 1, points: 0 }), // draw → now correct outcome → 5
      pred({ id: 12, homeScore: 2, awayScore: 2, points: 0 }), // exact draw → now bullseye → 10
    ]);
    expect(out).toEqual([
      { id: 10, points: 0 },
      { id: 11, points: 5 },
      { id: 12, points: 10 },
    ]);
  });

  it("ignores predictions whose match has no finished 90' result", () => {
    const out = reconcilePoints(results, [pred({ id: 3, matchId: 99, homeScore: 1, awayScore: 0, points: null })]);
    expect(out).toEqual([]);
  });
});

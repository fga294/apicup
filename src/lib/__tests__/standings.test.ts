import { describe, expect, it } from "vitest";

import { rankStandings, type StandingInput } from "@/lib/standings";

const row = (
  userId: number,
  displayName: string,
  points: number,
  exactCount: number,
): StandingInput => ({ userId, displayName, points, exactCount });

describe("rankStandings", () => {
  it("breaks a points tie by exact-score count (more exact ranks higher)", () => {
    const result = rankStandings([row(1, "Alice", 5, 1), row(2, "Bob", 5, 3)]);
    expect(result).toEqual([
      { userId: 2, rank: 1, points: 5 },
      { userId: 1, rank: 2, points: 5 },
    ]);
  });

  it("assigns distinct ranks across a points tie split by exact count", () => {
    const result = rankStandings([
      row(1, "Alice", 5, 0),
      row(2, "Bob", 5, 3),
      row(3, "Cara", 5, 1),
    ]);
    expect(result.map((r) => [r.userId, r.rank])).toEqual([
      [2, 1],
      [3, 2],
      [1, 3],
    ]);
  });

  it("shares a rank only when points and exact count are both equal", () => {
    const result = rankStandings([
      row(1, "Alice", 5, 2),
      row(2, "Bob", 5, 2),
      row(3, "Cara", 3, 9),
    ]);
    // Alice & Bob tie completely → share rank 1; the next rank skips to 3.
    expect(result).toEqual([
      { userId: 1, rank: 1, points: 5 },
      { userId: 2, rank: 1, points: 5 },
      { userId: 3, rank: 3, points: 3 },
    ]);
  });

  it("orders by points before exact count", () => {
    const result = rankStandings([row(1, "Alice", 3, 9), row(2, "Bob", 5, 0)]);
    expect(result).toEqual([
      { userId: 2, rank: 1, points: 5 },
      { userId: 1, rank: 2, points: 3 },
    ]);
  });

  it("falls back to alphabetical order when points and exact count both tie", () => {
    const result = rankStandings([row(1, "Bob", 5, 1), row(2, "Alice", 5, 1)]);
    // Identical points & exact → both rank 1, displayed alphabetically (Alice first).
    expect(result).toEqual([
      { userId: 2, rank: 1, points: 5 },
      { userId: 1, rank: 1, points: 5 },
    ]);
  });
});

// Pure scoring rules — no database, no IO. Keep it that way: this module is
// imported by unit tests and must stay loadable without an environment.

export interface Scoreline {
  homeScore: number;
  awayScore: number;
}

/**
 * The heart of the competition — awards points for one prediction against
 * the 90-minute result:
 *
 *   10 — exact result: correct outcome AND correct scoreline
 *    5 — correct outcome (home win / draw / away win) but wrong scoreline
 *    0 — incorrect outcome
 *
 * Examples from the competition rules:
 *   actual France 2-0 Japan, predicted 2-0 → 10
 *   actual France 2-0 Japan, predicted 4-3 → 5  (home win, wrong score)
 *   actual Canada 3-3 Turkey, predicted 1-1 → 5  (draw, wrong score)
 *   actual France 2-0 Japan, predicted 0-1 → 0
 */
export function computePoints(prediction: Scoreline, result: Scoreline): 0 | 5 | 10 {
  if (
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore
  ) {
    return 10;
  }
  const outcome = (s: Scoreline) => Math.sign(s.homeScore - s.awayScore);
  return outcome(prediction) === outcome(result) ? 5 : 0;
}

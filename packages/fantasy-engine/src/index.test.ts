import { describe, expect, it } from "vitest";
import { calculatePlayerScore } from "./index.js";

describe("fantasy-engine rules", () => {
  it("calculates points correctly for a MID scoring 1 goal and 1 assist with 90 mins played", () => {
    const score = calculatePlayerScore("MID", {
      minutesPlayed: 90,
      goals: 1,
      assists: 1,
      cleanSheet: true,
      saves: 0,
      penaltiesSaved: 0,
      penaltiesMissed: 0,
      yellowCards: 0,
      redCards: 0,
      ownGoals: 0,
      goalsConceded: 0,
    });

    // 2 (mins) + 5 (goal) + 3 (assist) + 1 (clean sheet MID) = 11 pts
    expect(score.totalPoints).toBe(11);
    expect(score.breakdown).toHaveLength(4);
  });

  it("calculates points correctly for a DEF with a yellow card and 2 goals conceded in 90 mins", () => {
    const score = calculatePlayerScore("DEF", {
      minutesPlayed: 90,
      goals: 0,
      assists: 0,
      cleanSheet: false,
      saves: 0,
      penaltiesSaved: 0,
      penaltiesMissed: 0,
      yellowCards: 1,
      redCards: 0,
      ownGoals: 0,
      goalsConceded: 2,
    });

    // 2 (mins) - 1 (yellow) - 1 (2 conceded) = 0 pts
    expect(score.totalPoints).toBe(0);
  });
});

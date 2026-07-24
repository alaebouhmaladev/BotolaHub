import { describe, it, expect } from "vitest";
import {
  validateSquad,
  validateStartingLineup,
  validateBench,
  validateCaptaincy,
  calculateSquadCost,
  calculateRemainingBudget,
  deriveFormation,
  isDeadlineLocked,
  PlayerData,
  SquadPlayerInput,
} from "./index";

describe("Pure Fantasy Engine Rules", () => {
  // Helper dataset for testing
  const clubA = "club-a";
  const clubB = "club-b";
  const clubC = "club-c";
  const clubD = "club-d";
  const clubE = "club-e";

  const createMockPlayerMap = (): Map<string, PlayerData> => {
    const map = new Map<string, PlayerData>();
    // 2 GK
    map.set("gk-1", { playerSeasonId: "gk-1", position: "GK", clubId: clubA });
    map.set("gk-2", { playerSeasonId: "gk-2", position: "GK", clubId: clubB });

    // 5 DEF
    map.set("def-1", {
      playerSeasonId: "def-1",
      position: "DEF",
      clubId: clubA,
    });
    map.set("def-2", {
      playerSeasonId: "def-2",
      position: "DEF",
      clubId: clubA,
    });
    map.set("def-3", {
      playerSeasonId: "def-3",
      position: "DEF",
      clubId: clubB,
    });
    map.set("def-4", {
      playerSeasonId: "def-4",
      position: "DEF",
      clubId: clubB,
    });
    map.set("def-5", {
      playerSeasonId: "def-5",
      position: "DEF",
      clubId: clubC,
    });

    // 5 MID
    map.set("mid-1", {
      playerSeasonId: "mid-1",
      position: "MID",
      clubId: clubC,
    });
    map.set("mid-2", {
      playerSeasonId: "mid-2",
      position: "MID",
      clubId: clubC,
    });
    map.set("mid-3", {
      playerSeasonId: "mid-3",
      position: "MID",
      clubId: clubD,
    });
    map.set("mid-4", {
      playerSeasonId: "mid-4",
      position: "MID",
      clubId: clubD,
    });
    map.set("mid-5", {
      playerSeasonId: "mid-5",
      position: "MID",
      clubId: clubD,
    });

    // 3 FWD
    map.set("fwd-1", {
      playerSeasonId: "fwd-1",
      position: "FWD",
      clubId: clubE,
    });
    map.set("fwd-2", {
      playerSeasonId: "fwd-2",
      position: "FWD",
      clubId: clubE,
    });
    map.set("fwd-3", {
      playerSeasonId: "fwd-3",
      position: "FWD",
      clubId: clubE,
    });

    return map;
  };

  const createValidSquadMembers = (): SquadPlayerInput[] => [
    { playerSeasonId: "gk-1", pricePoints: 50 },
    { playerSeasonId: "gk-2", pricePoints: 45 },
    { playerSeasonId: "def-1", pricePoints: 60 },
    { playerSeasonId: "def-2", pricePoints: 55 },
    { playerSeasonId: "def-3", pricePoints: 50 },
    { playerSeasonId: "def-4", pricePoints: 45 },
    { playerSeasonId: "def-5", pricePoints: 40 },
    { playerSeasonId: "mid-1", pricePoints: 80 },
    { playerSeasonId: "mid-2", pricePoints: 75 },
    { playerSeasonId: "mid-3", pricePoints: 70 },
    { playerSeasonId: "mid-4", pricePoints: 65 },
    { playerSeasonId: "mid-5", pricePoints: 60 },
    { playerSeasonId: "fwd-1", pricePoints: 100 },
    { playerSeasonId: "fwd-2", pricePoints: 95 },
    { playerSeasonId: "fwd-3", pricePoints: 90 },
  ]; // Total cost: 980 tenths (98.0 credits)

  describe("Squad Validation (validateSquad)", () => {
    it("approves a perfectly valid 15-player squad within budget", () => {
      const members = createValidSquadMembers();
      const map = createMockPlayerMap();
      const res = validateSquad(members, map, 1000);
      expect(res.isValid).toBe(true);
      expect(res.issues).toHaveLength(0);
    });

    it("fails an empty squad", () => {
      const map = createMockPlayerMap();
      const res = validateSquad([], map, 1000);
      expect(res.isValid).toBe(false);
      expect(res.issues.some((i) => i.code === "SQUAD_SIZE_INVALID")).toBe(
        true,
      );
    });

    it("fails 14 or 16 players", () => {
      const members = createValidSquadMembers();
      const map = createMockPlayerMap();

      const squad14 = members.slice(0, 14);
      const res14 = validateSquad(squad14, map, 1000);
      expect(res14.isValid).toBe(false);
      expect(res14.issues.some((i) => i.code === "SQUAD_SIZE_INVALID")).toBe(
        true,
      );

      const squad16 = [
        ...members,
        { playerSeasonId: "extra", pricePoints: 40 },
      ];
      map.set("extra", {
        playerSeasonId: "extra",
        position: "MID",
        clubId: clubA,
      });
      const res16 = validateSquad(squad16, map, 1000);
      expect(res16.isValid).toBe(false);
      expect(res16.issues.some((i) => i.code === "SQUAD_SIZE_INVALID")).toBe(
        true,
      );
    });

    it("passes exact budget equality (1000 tenths)", () => {
      const members = createValidSquadMembers();
      members[0].pricePoints += 20; // 980 -> 1000
      const map = createMockPlayerMap();
      const res = validateSquad(members, map, 1000);
      expect(res.isValid).toBe(true);
      expect(calculateSquadCost(members)).toBe(1000);
      expect(calculateRemainingBudget(1000, 1000)).toBe(0);
    });

    it("fails budget exceeded by 1 tenth (1001 tenths)", () => {
      const members = createValidSquadMembers();
      members[0].pricePoints += 21; // 980 -> 1001
      const map = createMockPlayerMap();
      const res = validateSquad(members, map, 1000);
      expect(res.isValid).toBe(false);
      expect(res.issues.some((i) => i.code === "BUDGET_EXCEEDED")).toBe(true);
    });

    it("passes exactly 3 players from a single club", () => {
      const members = createValidSquadMembers();
      const map = createMockPlayerMap();
      // clubD has mid-3, mid-4, mid-5 (3 players)
      const res = validateSquad(members, map, 1000);
      expect(res.isValid).toBe(true);
    });

    it("fails 4 players from a single club", () => {
      const members = createValidSquadMembers();
      const map = createMockPlayerMap();
      // change fwd-1 club to clubD so clubD has 4 players
      map.set("fwd-1", {
        playerSeasonId: "fwd-1",
        position: "FWD",
        clubId: clubD,
      });
      const res = validateSquad(members, map, 1000);
      expect(res.isValid).toBe(false);
      expect(res.issues.some((i) => i.code === "CLUB_LIMIT_EXCEEDED")).toBe(
        true,
      );
    });

    it("fails duplicate players in squad", () => {
      const members = createValidSquadMembers();
      members[1] = { playerSeasonId: "gk-1", pricePoints: 45 }; // duplicate gk-1
      const map = createMockPlayerMap();
      const res = validateSquad(members, map, 1000);
      expect(res.isValid).toBe(false);
      expect(res.issues.some((i) => i.code === "DUPLICATE_PLAYER")).toBe(true);
    });

    it("fails position count violations", () => {
      const members = createValidSquadMembers();
      const map = createMockPlayerMap();
      // swap a GK for a MID -> 1 GK, 6 MID
      map.set("gk-2", {
        playerSeasonId: "gk-2",
        position: "MID",
        clubId: clubB,
      });
      const res = validateSquad(members, map, 1000);
      expect(res.isValid).toBe(false);
      expect(res.issues.some((i) => i.code === "POSITION_COUNT_INVALID")).toBe(
        true,
      );
    });
  });

  describe("Starting Lineup Validation & Formation (validateStartingLineup, deriveFormation)", () => {
    it("validates 4-4-2 formation", () => {
      const map = createMockPlayerMap();
      const squadIds = Array.from(map.keys());
      const starters = [
        "gk-1",
        "def-1",
        "def-2",
        "def-3",
        "def-4",
        "mid-1",
        "mid-2",
        "mid-3",
        "mid-4",
        "fwd-1",
        "fwd-2",
      ];
      const res = validateStartingLineup(starters, squadIds, map);
      expect(res.isValid).toBe(true);
      expect(deriveFormation(starters, map)).toBe("4-4-2");
    });

    it("validates 3-5-2 formation", () => {
      const map = createMockPlayerMap();
      const squadIds = Array.from(map.keys());
      const starters = [
        "gk-1",
        "def-1",
        "def-2",
        "def-3",
        "mid-1",
        "mid-2",
        "mid-3",
        "mid-4",
        "mid-5",
        "fwd-1",
        "fwd-2",
      ];
      const res = validateStartingLineup(starters, squadIds, map);
      expect(res.isValid).toBe(true);
      expect(deriveFormation(starters, map)).toBe("3-5-2");
    });

    it("fails invalid formation with 2 defenders", () => {
      const map = createMockPlayerMap();
      const squadIds = Array.from(map.keys());
      const starters = [
        "gk-1",
        "def-1",
        "def-2",
        "mid-1",
        "mid-2",
        "mid-3",
        "mid-4",
        "mid-5",
        "fwd-1",
        "fwd-2",
        "fwd-3",
      ]; // 2 DEF, 5 MID, 3 FWD -> invalid (minimum 3 DEF)
      const res = validateStartingLineup(starters, squadIds, map);
      expect(res.isValid).toBe(false);
      expect(res.issues.some((i) => i.code === "FORMATION_INVALID")).toBe(true);
    });

    it("fails missing goalkeeper in starting 11", () => {
      const map = createMockPlayerMap();
      const squadIds = Array.from(map.keys());
      const starters = [
        "def-1",
        "def-2",
        "def-3",
        "def-4",
        "def-5",
        "mid-1",
        "mid-2",
        "mid-3",
        "mid-4",
        "fwd-1",
        "fwd-2",
      ]; // 0 GK -> invalid
      const res = validateStartingLineup(starters, squadIds, map);
      expect(res.isValid).toBe(false);
      expect(res.issues.some((i) => i.code === "FORMATION_INVALID")).toBe(true);
    });

    it("fails when a starter is not in the saved squad", () => {
      const map = createMockPlayerMap();
      const squadIds = Array.from(map.keys());
      const starters = [
        "gk-1",
        "def-1",
        "def-2",
        "def-3",
        "def-4",
        "mid-1",
        "mid-2",
        "mid-3",
        "mid-4",
        "fwd-1",
        "outsider-999",
      ];
      map.set("outsider-999", {
        playerSeasonId: "outsider-999",
        position: "FWD",
        clubId: clubA,
      });
      const res = validateStartingLineup(starters, squadIds, map);
      expect(res.isValid).toBe(false);
      expect(res.issues.some((i) => i.code === "PLAYER_NOT_IN_SQUAD")).toBe(
        true,
      );
    });
  });

  describe("Bench & Captaincy Validation (validateBench, validateCaptaincy)", () => {
    it("validates correct bench order and players", () => {
      const map = createMockPlayerMap();
      const squadIds = Array.from(map.keys());
      const starters = [
        "gk-1",
        "def-1",
        "def-2",
        "def-3",
        "def-4",
        "mid-1",
        "mid-2",
        "mid-3",
        "mid-4",
        "fwd-1",
        "fwd-2",
      ];
      const bench = ["gk-2", "def-5", "mid-5", "fwd-3"];
      const res = validateBench(bench, squadIds, starters);
      expect(res.isValid).toBe(true);
    });

    it("fails bench containing starting player or incorrect count", () => {
      const map = createMockPlayerMap();
      const squadIds = Array.from(map.keys());
      const starters = [
        "gk-1",
        "def-1",
        "def-2",
        "def-3",
        "def-4",
        "mid-1",
        "mid-2",
        "mid-3",
        "mid-4",
        "fwd-1",
        "fwd-2",
      ];
      const badBench = ["gk-1", "def-5", "mid-5", "fwd-3"]; // gk-1 is starter!
      const res = validateBench(badBench, squadIds, starters);
      expect(res.isValid).toBe(false);
      expect(res.issues.some((i) => i.code === "BENCH_ORDER_INVALID")).toBe(
        true,
      );
    });

    it("validates captain and vice-captain from starting lineup", () => {
      const starters = [
        "gk-1",
        "def-1",
        "def-2",
        "def-3",
        "def-4",
        "mid-1",
        "mid-2",
        "mid-3",
        "mid-4",
        "fwd-1",
        "fwd-2",
      ];
      const res = validateCaptaincy("mid-1", "fwd-1", starters);
      expect(res.isValid).toBe(true);
    });

    it("fails captain not in starting lineup", () => {
      const starters = [
        "gk-1",
        "def-1",
        "def-2",
        "def-3",
        "def-4",
        "mid-1",
        "mid-2",
        "mid-3",
        "mid-4",
        "fwd-1",
        "fwd-2",
      ];
      const benchPlayer = "gk-2";
      const res = validateCaptaincy(benchPlayer, "fwd-1", starters);
      expect(res.isValid).toBe(false);
      expect(res.issues.some((i) => i.code === "CAPTAIN_NOT_STARTER")).toBe(
        true,
      );
    });

    it("fails when captain equals vice-captain", () => {
      const starters = [
        "gk-1",
        "def-1",
        "def-2",
        "def-3",
        "def-4",
        "mid-1",
        "mid-2",
        "mid-3",
        "mid-4",
        "fwd-1",
        "fwd-2",
      ];
      const res = validateCaptaincy("mid-1", "mid-1", starters);
      expect(res.isValid).toBe(false);
      expect(
        res.issues.some((i) => i.code === "CAPTAIN_EQUALS_VICE_CAPTAIN"),
      ).toBe(true);
    });
  });

  describe("Deadline Locking (isDeadlineLocked)", () => {
    const deadline = "2026-08-01T18:00:00.000Z";

    it("returns false immediately before deadline", () => {
      const currentTime = "2026-08-01T17:59:59.999Z";
      expect(isDeadlineLocked(deadline, currentTime)).toBe(false);
    });

    it("returns true at exact deadline", () => {
      const currentTime = "2026-08-01T18:00:00.000Z";
      expect(isDeadlineLocked(deadline, currentTime)).toBe(true);
    });

    it("returns true immediately after deadline", () => {
      const currentTime = "2026-08-01T18:00:00.001Z";
      expect(isDeadlineLocked(deadline, currentTime)).toBe(true);
    });
  });
});

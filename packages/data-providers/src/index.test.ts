import { describe, expect, it } from "vitest";
import { MockFootballDataProvider } from "./index.js";

describe("data-providers", () => {
  it("returns mock data correctly", async () => {
    const provider = new MockFootballDataProvider();
    expect(provider.getProviderName()).toBe("mock");

    const clubs = await provider.fetchClubs();
    expect(clubs).toHaveLength(2);
    expect(clubs[0].name).toBe("Casablanca Athletic");

    const fixtures = await provider.fetchFixtures(1);
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0].gameweekNumber).toBe(1);
  });
});

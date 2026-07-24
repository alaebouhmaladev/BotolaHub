import { describe, expect, it, vi } from "vitest";
import { BotolaHubApiClient } from "./index.js";

describe("api-client", () => {
  it("fetches health status correctly", async () => {
    const mockHealth = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: 120,
      version: "0.1.0",
      services: {
        database: "up",
        redis: "up",
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    });

    const client = new BotolaHubApiClient({
      baseUrl: "http://localhost:3001/api/v1",
      fetch: mockFetch as unknown as typeof fetch,
    });

    const health = await client.getHealth();
    expect(health.status).toBe("ok");
    expect(health.services.database).toBe("up");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/health",
    );
  });
});

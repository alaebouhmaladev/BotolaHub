import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./index.js";

describe("contracts", () => {
  it("validates a correct health response payload", () => {
    const validPayload = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: 120,
      version: "0.1.0",
      services: {
        database: "up",
        redis: "up",
      },
    };

    const result = HealthResponseSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid health response payload", () => {
    const invalidPayload = {
      status: "unknown",
      timestamp: "now",
    };

    const result = HealthResponseSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});

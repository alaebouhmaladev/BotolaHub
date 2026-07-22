import { describe, expect, it, vi } from "vitest";
import { initWorker } from "./main.js";

vi.mock("ioredis", () => ({
  Redis: vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockResolvedValue("PONG"),
    quit: vi.fn().mockResolvedValue("OK"),
  })),
}));

describe("Worker Shell", () => {
  it("initializes worker successfully", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    await initWorker();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[BotolaHub Worker] Starting background worker shell...",
      ),
    );
  });
});

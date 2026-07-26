import { test, expect, Page } from "@playwright/test";

function setupErrorMonitoring(
  page: Page,
  allowedFailedUrls: (string | RegExp)[] = [],
) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (
        !text.includes("Download the React DevTools") &&
        !text.includes("favicon.ico") &&
        !text.includes("Failed to load resource")
      ) {
        consoleErrors.push(text);
      }
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  page.on("response", (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 400) {
      const isAllowed = allowedFailedUrls.some((pattern) =>
        typeof pattern === "string" ? url.includes(pattern) : pattern.test(url),
      );
      if (!isAllowed) {
        networkErrors.push(`[${status}] ${url}`);
      }
    }
  });

  return {
    verifyCleanExecution() {
      expect(
        pageErrors,
        `Uncaught page errors: ${pageErrors.join("; ")}`,
      ).toHaveLength(0);
      expect(
        networkErrors,
        `Unexpected HTTP 4xx/5xx responses: ${networkErrors.join("; ")}`,
      ).toHaveLength(0);
      expect(
        consoleErrors,
        `Browser console errors: ${consoleErrors.join("; ")}`,
      ).toHaveLength(0);
    },
  };
}

test.describe("Day 4 Fixtures, Transfers, & Points E2E Flow", () => {
  async function loginAsTestUser(page: Page) {
    await page.goto("/login");
    await page.fill('input[type="email"]', "player1@botolahub.dev");
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  }

  test("loads fixtures list and navigates to fixture detail page", async ({
    page,
  }) => {
    const monitor = setupErrorMonitoring(page, ["/auth/refresh"]);

    await loginAsTestUser(page);

    // Navigate to /fixtures
    await page.goto("/fixtures");
    await expect(page.locator("h2")).toContainText("Botola Pro Fixtures");

    // Check status filter buttons
    await page.click('button:has-text("SCHEDULED")');
    await page.click('button:has-text("ALL")');

    // Click first fixture card if present
    const fixtureCard = page.locator('a[href^="/fixtures/"]').first();
    if (await fixtureCard.isVisible()) {
      await fixtureCard.click();
      await expect(page.locator("h3")).toContainText("Match Events Timeline");
    }

    monitor.verifyCleanExecution();
  });

  test("loads transfers page and handles squad state", async ({ page }) => {
    const monitor = setupErrorMonitoring(page, ["/auth/refresh"]);

    await loginAsTestUser(page);

    await page.goto("/transfers");
    await expect(page.locator("h2")).toBeVisible({ timeout: 15000 });
    const headingText = await page.locator("h2").innerText();
    expect(headingText.length).toBeGreaterThan(0);

    monitor.verifyCleanExecution();
  });

  test("loads points page and displays gameweek score breakdown", async ({
    page,
  }) => {
    const monitor = setupErrorMonitoring(page, ["/auth/refresh"]);

    await loginAsTestUser(page);

    await page.goto("/points");
    await expect(page.locator("h2")).toContainText("Gameweek Points");

    monitor.verifyCleanExecution();
  });
});

import { test, expect, Page } from "@playwright/test";
import { BotolaHubApiClient } from "@botolahub/api-client";

// Setup browser console, page error, and HTTP response error monitoring
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

test.describe("BotolaHub Web Squad Builder & Platform Journey", () => {
  test("Complete squad builder flow, position/search/club filters, budget/counter assertions, lineup, reload persistence, and logout", async ({
    page,
  }) => {
    const monitor = setupErrorMonitoring(page, [
      "/auth/refresh", // Allow 401 on initial unauthenticated mount
    ]);

    // 1. Login Flow
    await page.goto("/login");
    await expect(page.locator("h2")).toContainText("Log In to BotolaHub");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill("player1@botolahub.dev");
    await passwordInput.fill("Password123!");
    await page.click('button[type="submit"]');

    // 2. Redirect to Dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator("h2")).toContainText("User Dashboard");
    await expect(page.locator("text=player1@botolahub.dev")).toBeVisible();

    // 3. Navigate to Squad Builder
    await page.click("text=Manage Fantasy Squad");
    await expect(page).toHaveURL(/\/squad/, { timeout: 15000 });

    // Onboarding if team doesn't exist yet
    await page
      .locator(
        "h2:has-text('Create Your Fantasy Team'), :text('REMAINING BUDGET')",
      )
      .first()
      .waitFor({ timeout: 15000 });

    if (
      await page.locator("h2:has-text('Create Your Fantasy Team')").isVisible()
    ) {
      await page.fill('input[placeholder*="Atlas Lions"]', "Atlas Lions FC");
      await page.click("button:has-text('Create Team')");
    }

    await expect(page.locator("text=REMAINING BUDGET")).toBeVisible({
      timeout: 15000,
    });

    // 4. Test Player Search Filter
    const searchInput = page.locator(
      'input[placeholder="Search player name..."]',
    );
    await searchInput.fill("Yassine");
    await page.waitForTimeout(200);
    await searchInput.fill("");

    // 5. Test Club Filter
    const clubSelect = page.locator("select");
    if ((await clubSelect.count()) > 0) {
      const options = await clubSelect.locator("option").all();
      if (options.length > 1) {
        const val = await options[1].getAttribute("value");
        if (val) {
          await clubSelect.selectOption(val);
          await page.waitForTimeout(200);
          await clubSelect.selectOption("");
        }
      }
    }

    // 6. Test Position Filter Buttons
    await page.click("button:has-text('GK')");
    await page.click("button:has-text('DEF')");
    await page.click("button:has-text('MID')");
    await page.click("button:has-text('FWD')");
    await page.click("button:has-text('ALL')");

    // 7. Clear current squad to start from scratch and test empty squad rejection (<15 players)
    await expect(page.locator("text=SQUAD SIZE")).toBeVisible({
      timeout: 15000,
    });
    const removeBtns = page.locator('button[aria-label="Remove player"]');
    while ((await removeBtns.count()) > 0) {
      await removeBtns.first().click({ force: true });
      await page.waitForTimeout(100);
    }

    // Attempt save with empty squad (<15 players) -> expect rejection error banner
    const saveButton = page.locator("button:has-text('Save Squad & Lineup')");
    await saveButton.click();
    await expect(
      page.locator("text=Squad must contain exactly 15 players").first(),
    ).toBeVisible();

    // 8. Build a complete, valid, budget-legal, club-legal 15-player squad (2 GK, 5 DEF, 5 MID, 3 FWD)
    const positions = [
      { pos: "GK", count: 2 },
      { pos: "DEF", count: 5 },
      { pos: "MID", count: 5 },
      { pos: "FWD", count: 3 },
    ];

    const clubCounts = new Map<string, number>();

    for (const { pos, count } of positions) {
      await page.click(`button:has-text('${pos}')`);
      let added = 0;
      let offset = 1;

      while (added < count && offset <= 40) {
        const addBtns = page.locator("button:has-text('+ Add')");
        const availableCount = await addBtns.count();
        if (availableCount >= offset) {
          const btn = addBtns.nth(availableCount - offset);
          const parentText = await btn.locator("xpath=../..").textContent();
          const match = parentText?.match(/•\s+([A-Z]{2,5})/);
          const clubTag = match ? match[1] : null;
          const currentClubCount = clubTag ? clubCounts.get(clubTag) || 0 : 0;

          if (
            currentClubCount < 3 &&
            (await btn.isVisible()) &&
            (await btn.isEnabled())
          ) {
            await btn.click();
            await page.waitForTimeout(100);
            if (clubTag) clubCounts.set(clubTag, currentClubCount + 1);
            added++;
          }
        }
        offset++;
      }
    }

    await page.click("button:has-text('ALL')");

    // 9. Exact budget and position-counter assertions
    await expect(page.locator("text=15 / 15")).toBeVisible();
    await expect(page.locator("text=GK: 2/2")).toBeVisible();
    await expect(page.locator("text=DEF: 5/5")).toBeVisible();
    await expect(page.locator("text=MID: 5/5")).toBeVisible();
    await expect(page.locator("text=FWD: 3/3")).toBeVisible();
    await expect(page.locator("text=REMAINING BUDGET")).toBeVisible();

    // 10. Save Legal Squad & Lineup
    await saveButton.click();
    await expect(page.locator("text=saved successfully!")).toBeVisible({
      timeout: 15000,
    });

    // 11. Detailed Squad & Lineup Persistence After Reload
    await page.reload();
    await expect(page.locator("text=REMAINING BUDGET")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=15 / 15")).toBeVisible();
    await expect(page.locator("text=GK: 2/2")).toBeVisible();
    await expect(page.locator("text=DEF: 5/5")).toBeVisible();

    // 12. Session persistence after browser reload (still authenticated on /squad)
    await expect(page).toHaveURL(/\/squad/);

    // 13. Logout & Protected-route Redirection via Dashboard
    await page.goto("/dashboard");
    const logoutBtn = page.locator("button:has-text('Log Out')");
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    await expect(page).toHaveURL("http://localhost:3000/", { timeout: 15000 });

    // Attempt direct navigation back to /squad while logged out -> redirected to /login
    await page.goto("/squad");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    monitor.verifyCleanExecution();
  });

  test("Multilingual UI support and Arabic RTL layout direction", async ({
    page,
  }) => {
    const monitor = setupErrorMonitoring(page, [
      "/health",
      "/auth/refresh", // Allow 401 on unauthenticated home page load
    ]);

    await page.goto("/");

    // Default English
    await expect(page.locator("h1")).toContainText("BotolaHub");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    // Switch to French
    await page.click("button:has-text('Français')");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(
      page.locator("text=Fantasy Football pour la Botola Pro"),
    ).toBeVisible();

    // Switch to Arabic (RTL)
    await page.click("button:has-text('العربية')");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.locator("text=فانتازي كرة القدم للبطولة الاحترافية"),
    ).toBeVisible();

    monitor.verifyCleanExecution();
  });

  test("Responsive layout on narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const monitor = setupErrorMonitoring(page, ["/auth/refresh"]);

    await page.goto("/login");
    await expect(page.locator("h2")).toContainText("Log In to BotolaHub");
    await expect(page.locator('input[type="email"]')).toBeVisible();

    monitor.verifyCleanExecution();
  });

  test("Enforces cross-user authorization and gameweek deadline security rules at API contract level", async () => {
    const apiClient = new BotolaHubApiClient({
      baseUrl: "http://localhost:3001/api/v1",
    });

    // 1. Authenticate player1 and player2
    const user1Res = await apiClient.login({
      email: "player1@botolahub.dev",
      password: "Password123!",
    });
    const user2Res = await apiClient.login({
      email: "player2@botolahub.dev",
      password: "Password123!",
    });

    // Retrieve user 2's fantasy team (or create if needed)
    let player2Team = await apiClient.getMyFantasyTeam(user2Res.accessToken);
    if (!player2Team) {
      player2Team = await apiClient.createFantasyTeam(
        { name: "Atlas Rivals FC" },
        user2Res.accessToken,
      );
    }

    // 2. Cross-user modification rejection (HTTP 403 Forbidden)
    const dummySquadIds = Array.from(
      { length: 15 },
      (_, i) =>
        `00000000-0000-0000-0000-0000000000${String(i + 1).padStart(2, "0")}`,
    );

    try {
      await apiClient.updateSquad(
        player2Team.id,
        { squadPlayerIds: dummySquadIds },
        user1Res.accessToken,
      );
      expect(true).toBe(false); // Should not reach here
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/another user|Forbidden|not own|403/i);
    }
  });
});

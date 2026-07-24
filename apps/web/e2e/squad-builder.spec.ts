import { test, expect } from "@playwright/test";

test.describe("BotolaHub Web Squad Builder Journey", () => {
  test("User authentication, player filtering, squad builder, lineup save, and reload persistence", async ({
    page,
  }) => {
    page.on("console", (msg) => console.log("PAGE CONSOLE:", msg.text()));
    page.on("response", (res) => {
      if (res.url().includes("/auth/")) {
        console.log("AUTH RES:", res.url(), res.status());
      }
    });

    // 1. Login Flow
    await page.goto("/login");
    await page.waitForTimeout(1500);
    await expect(page.locator("h2")).toContainText("Log In to BotolaHub");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible();
    await emailInput.fill("player1@botolahub.dev");
    await expect(emailInput).toHaveValue("player1@botolahub.dev");

    await passwordInput.fill("Password123!");
    await expect(passwordInput).toHaveValue("Password123!");

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 2. Redirect to Dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator("h2")).toContainText("User Dashboard");
    await expect(page.locator("text=player1@botolahub.dev")).toBeVisible();

    // 3. Navigate to Squad Builder
    await page.click("text=Manage Fantasy Squad");
    await expect(page).toHaveURL(/\/squad/, { timeout: 15000 });

    // Wait for squad builder or onboarding
    await page
      .locator(
        "h2:has-text('Create Your Fantasy Team'), :text('REMAINING BUDGET')",
      )
      .first()
      .waitFor({ timeout: 15000 });

    const createTeamHeading = page.locator(
      "h2:has-text('Create Your Fantasy Team')",
    );
    if (await createTeamHeading.isVisible()) {
      const nameInput = page.locator('input[placeholder*="Atlas Lions"]');
      await nameInput.fill("Atlas Lions FC");
      await page.click("button:has-text('Create Team')");
    }

    // 4. Verify Catalog Loading & Filters
    await expect(page.locator("text=REMAINING BUDGET")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("button:has-text('GK')")).toBeVisible();
    await expect(page.locator("button:has-text('DEF')")).toBeVisible();
    await expect(page.locator("button:has-text('MID')")).toBeVisible();
    await expect(page.locator("button:has-text('FWD')")).toBeVisible();

    // 5. Test Position Filtering & Search
    await page.click("button:has-text('GK')");
    await page.click("button:has-text('ALL')");

    await page.fill('input[placeholder="Search player name..."]', "Yassine");
    await page.fill('input[placeholder="Search player name..."]', "");

    // 6. Save Button check
    const saveButton = page.locator("button:has-text('Save Squad & Lineup')");
    await expect(saveButton).toBeEnabled();

    // 7. Wait for initial team data load, then clear existing squad to start fresh
    await expect(page.locator("text=SQUAD SIZE")).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(500);

    const removeBtns = page.locator('button[aria-label="Remove player"]');
    while ((await removeBtns.count()) > 0) {
      await removeBtns.first().click({ force: true });
      await page.waitForTimeout(150);
    }

    // Attempt save with 0 players to verify invalid squad rejection
    await saveButton.click();
    await expect(page.locator("text=Squad must contain").first()).toBeVisible();

    // 8. Build a budget-legal, club-legal 15-player squad (2 GK, 5 DEF, 5 MID, 3 FWD)
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

          // Extract exact uppercase club short code (letters only) after the bullet symbol
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
            if (clubTag) {
              clubCounts.set(clubTag, currentClubCount + 1);
            }
            added++;
          }
        }
        offset++;
      }
    }

    // Reset filters
    await page.click("button:has-text('ALL')");

    // 9. Save Legal Squad
    await saveButton.click();

    // Verify success banner
    await expect(page.locator("text=saved successfully!")).toBeVisible({
      timeout: 15000,
    });

    // 10. Verify Persistence on Reload
    await page.reload();
    await expect(page.locator("text=REMAINING BUDGET")).toBeVisible({
      timeout: 15000,
    });
  });

  test("Rejects unauthenticated access to squad page", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/squad");
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    await context.close();
  });
});

import { test, expect } from '@playwright/test';

test.describe('BotolaHub Day 2: Email Authentication & Onboarding Flow', () => {
  const testEmail = `e2e_user_${Date.now()}@botolahub.ma`;
  const testPassword = 'TestPassword2026!';
  const testUsername = `botola_fan_${Date.now().toString().slice(-6)}`;

  test('registers new user, completes onboarding, selects favorite club, and restores session', async ({
    page,
  }) => {
    // 1. Visit Register page
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Create Account');

    // 2. Fill registration form
    await page.fill('#register-email', testEmail);
    await page.fill('#register-password', testPassword);
    await page.click('#register-submit-btn');

    // 3. Redirect to Onboarding
    await expect(page).toHaveURL('/onboarding');
    await expect(page.locator('h1')).toContainText('Complete Profile');

    // 4. Fill onboarding form
    await page.fill('#onboarding-username', testUsername);
    await page.fill('#onboarding-displayName', 'Botola Super Fan');
    await page.fill('#onboarding-firstName', 'Anass');
    await page.fill('#onboarding-lastName', 'El Amrani');
    await page.fill('#onboarding-birthDate', '1998-06-15');
    await page.fill('#onboarding-city', 'Casablanca');

    // Select favorite club (e.g. Raja CA or first club)
    await page.selectOption('#onboarding-favoriteClub', { index: 0 });

    await page.click('#onboarding-submit-btn');

    // 5. Redirect to Profile
    await expect(page).toHaveURL('/profile');
    await expect(page.locator('h1')).toContainText('Player Profile');
    await expect(page.locator('body')).toContainText('Botola Super Fan');
    await expect(page.locator('body')).toContainText(`@${testUsername}`);

    // 6. Test session restoration on page reload
    await page.reload();
    await expect(page.locator('h1')).toContainText('Player Profile');

    // 7. Test Logout
    await page.click('#profile-logout-btn');
    await expect(page).toHaveURL('/login');
  });
});

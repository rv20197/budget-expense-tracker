import { test, expect } from "@playwright/test";
import { generateTestUser } from "./helpers/auth";

test.describe("Onboarding Flow", () => {
  test("should require household name when creating household", async ({ page }) => {
    const user = generateTestUser();
    await page.goto("/register");
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname.includes("/onboarding"));
    await expect(page).toHaveURL(/\/onboarding/);

    // Try submitting without name
    await page.click('form button[type="submit"]');
    await expect(page.getByText(/enter a household name/i)).toBeVisible();

    // Create household with valid name
    await page.fill('input[name="name"]', "New Household 123");
    await page.click('form button[type="submit"]');

    await page.waitForURL((url) => url.pathname.includes("/dashboard"));
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

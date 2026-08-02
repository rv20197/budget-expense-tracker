import { test, expect } from "@playwright/test";
import { registerTestUser } from "./helpers/auth";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await registerTestUser(page);
  });

  test("should render profile and account settings", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Currency format", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Change password", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Family members", exact: true })).toBeVisible();
  });

  test("should update user profile name", async ({ page }) => {
    await page.goto("/settings");

    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill("Updated Name E2E");
    await page.getByRole("button", { name: /save profile/i }).click();

    await expect(page.getByText(/profile updated/i)).toBeVisible();
  });

  test("should navigate to household settings page", async ({ page }) => {
    await page.goto("/settings");

    await page.click('a[href="/settings/household"]');
    await expect(page).toHaveURL(/\/settings\/household/);
    await expect(page.getByRole("heading", { name: /household settings/i })).toBeVisible();
  });
});

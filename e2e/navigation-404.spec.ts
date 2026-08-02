import { test, expect } from "@playwright/test";
import { registerTestUser } from "./helpers/auth";

test.describe("Navigation & 404 Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await registerTestUser(page);
  });

  test("should navigate through sidebar links seamlessly", async ({ page }) => {
    await page.goto("/dashboard");

    // Transactions
    await page.locator('aside nav a[href="/transactions"]').click();
    await expect(page).toHaveURL(/\/transactions/);

    // Categories
    await page.locator('aside nav a[href="/categories"]').click();
    await expect(page).toHaveURL(/\/categories/);

    // Reports
    await page.locator('aside nav a[href="/reports"]').click();
    await expect(page).toHaveURL(/\/reports/);

    // Debt
    await page.locator('aside nav a[href="/debt"]').click();
    await expect(page).toHaveURL(/\/debt/);

    // Statements
    await page.locator('aside nav a[href="/statements"]').click();
    await expect(page).toHaveURL(/\/statements/);

    // Settings
    await page.locator('aside nav a[href="/settings"]').click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test("should display 404 page for unknown routes", async ({ page }) => {
    await page.goto("/some-non-existent-route-path-xyz");

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByRole("link", { name: /go to dashboard/i })).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { registerTestUser } from "./helpers/auth";

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await registerTestUser(page);
  });

  test("should render summary metrics and period controls", async ({ page }) => {
    await page.goto("/dashboard");

    // Check summary metric titles
    await expect(page.locator("article p", { hasText: "Income" }).first()).toBeVisible();
    await expect(page.locator("article p", { hasText: "Expense" }).first()).toBeVisible();
    await expect(page.locator("article p", { hasText: "Period" }).first()).toBeVisible();
    await expect(page.locator("article p", { hasText: "Net Inhand" }).first()).toBeVisible();

    // Check range filter button
    const applyButton = page.getByRole("button", { name: /apply range/i });
    await expect(applyButton).toBeVisible();
    await applyButton.click();

    // Check Debt overview block
    await expect(page.getByRole("heading", { name: /debt overview/i })).toBeVisible();
    await expect(page.getByText("Total I Owe")).toBeVisible();
    await expect(page.getByText("Total Owed to Me")).toBeVisible();
  });
});

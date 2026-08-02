import { test, expect } from "@playwright/test";
import { registerTestUser } from "./helpers/auth";

test.describe("Debt Page", () => {
  test.beforeEach(async ({ page }) => {
    await registerTestUser(page);
  });

  test("should display debt summary and tab controls", async ({ page }) => {
    await page.goto("/debt");

    await expect(page.getByRole("heading", { name: /debt management/i })).toBeVisible();
    await expect(page.getByText("My Debts")).toBeVisible();
    await expect(page.getByText("My Loans")).toBeVisible();

    await page.getByText("My Loans").click();
    await page.getByText("My Debts").click();

    await expect(page.getByRole("button", { name: /add debt/i })).toBeVisible();
  });

  test("should open create debt modal", async ({ page }) => {
    await page.goto("/debt");

    await page.getByRole("button", { name: /add debt/i }).click();

    await expect(page.getByRole("heading", { name: /add debt or loan/i })).toBeVisible();
  });
});

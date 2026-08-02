import { test, expect } from "@playwright/test";
import { registerTestUser } from "./helpers/auth";

test.describe("Statements Page", () => {
  test.beforeEach(async ({ page }) => {
    await registerTestUser(page);
  });

  test("should display statements list page and upload trigger", async ({ page }) => {
    await page.goto("/statements");

    await expect(page.getByRole("heading", { name: "Statements", exact: true })).toBeVisible();
    await expect(page.getByText("Import and review bank statement PDFs")).toBeVisible();
  });
});

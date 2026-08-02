import { test, expect } from "@playwright/test";
import { registerTestUser } from "./helpers/auth";

test.describe("Reports Page", () => {
  test.beforeEach(async ({ page }) => {
    await registerTestUser(page);
  });

  test("should display financial reports and charts", async ({ page }) => {
    await page.goto("/reports");

    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
    await expect(page.getByText("Monthly summary")).toBeVisible();
    await expect(page.getByText("Top spending categories")).toBeVisible();
    await expect(page.getByText("6-month trend")).toBeVisible();
  });
});

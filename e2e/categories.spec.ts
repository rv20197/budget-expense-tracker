import { test, expect } from "@playwright/test";
import { registerTestUser } from "./helpers/auth";

test.describe("Categories Page", () => {
  test.beforeEach(async ({ page }) => {
    await registerTestUser(page);
  });

  test("should render category page layout and toggle expense/income tabs", async ({ page }) => {
    await page.goto("/categories");

    await expect(page.getByRole("heading", { name: "Categories", exact: true })).toBeVisible();

    const expenseTab = page.getByRole("button", { name: /expense/i }).first();
    const incomeTab = page.getByRole("button", { name: /income/i }).first();

    await expect(expenseTab).toBeVisible();
    await expect(incomeTab).toBeVisible();

    await incomeTab.click();
    await expenseTab.click();
  });

  test("should open modal and create a new custom category", async ({ page }) => {
    await page.goto("/categories");

    await page.getByRole("button", { name: /add category/i }).click();
    await expect(page.getByRole("heading", { name: /add category/i })).toBeVisible();

    await page.fill('input[name="name"]', "Entertainment E2E");
    await page.click('button[type="submit"]:has-text("Create category")');

    await expect(page.getByText("Entertainment E2E")).toBeVisible();
  });
});

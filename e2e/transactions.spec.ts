import { test, expect } from "@playwright/test";
import { registerTestUser } from "./helpers/auth";

test.describe("Transactions Page", () => {
  test.beforeEach(async ({ page }) => {
    await registerTestUser(page);
  });

  test("should display transaction page title, filters and action buttons", async ({ page }) => {
    await page.goto("/transactions");

    await expect(page.getByRole("heading", { name: "Transactions", exact: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder("Search description")).toBeVisible();
    await expect(page.getByRole("button", { name: /add transaction/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /import statement/i })).toBeVisible();
    await expect(page.getByText("Export CSV")).toBeVisible();
  });

  test("should open modal and create a new transaction", async ({ page }) => {
    // Ensure an expense category exists first
    await page.goto("/categories");
    await page.getByRole("button", { name: /add category/i }).click();
    await page.fill('input[name="name"]', "Groceries E2E");
    await page.click('button[type="submit"]:has-text("Create category")');
    await expect(page.getByText("Groceries E2E").first()).toBeVisible();

    // Now go to transactions
    await page.goto("/transactions");

    await page.getByRole("button", { name: /add transaction/i }).click();
    await expect(page.getByRole("heading", { name: /add transaction/i })).toBeVisible();

    await page.fill('input[name="description"]', "Test Grocery Purchase");
    await page.fill('input[name="amount"]', "45.50");

    // Select category via MUI Select dropdown
    const categoryCombobox = page.getByRole("combobox", { name: /category/i });
    await categoryCombobox.click();
    await page.getByRole("option", { name: "Groceries E2E" }).click();

    await page.click('button[type="submit"]:has-text("Create transaction")');

    await expect(page.getByRole("table").getByText("Test Grocery Purchase")).toBeVisible();
  });

  test("should filter transactions using search and filter buttons", async ({ page }) => {
    await page.goto("/transactions");

    await page.fill('input[name="search"]', "Grocery");
    await page.click('button[type="submit"]:has-text("Apply filters")');

    await expect(page).toHaveURL(/search=Grocery/);
  });

  test("should toggle Group by Category view", async ({ page }) => {
    await page.goto("/transactions");

    const groupBtn = page.getByRole("button", { name: /group by category/i });
    await groupBtn.click();
    await expect(page).toHaveURL(/groupBy=category/);
  });
});

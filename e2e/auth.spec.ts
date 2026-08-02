import { test, expect } from "@playwright/test";
import { generateTestUser, registerTestUser } from "./helpers/auth";

test.describe("Authentication Flow", () => {
  test("should display login page by default for unauthenticated users accessing protected routes", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("should show validation errors on registration form", async ({ page }) => {
    await page.goto("/register");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Name must be at least 2 characters/i)).toBeVisible();
  });

  test("should show error on login with invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "nonexistent_user_9999@example.com");
    await page.fill('input[name="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid email or password/i).or(page.getByText(/unable to sign in/i))).toBeVisible();
  });

  test("should register a new user and navigate through onboarding to dashboard", async ({ page }) => {
    const user = generateTestUser();
    await page.goto("/register");
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname.includes("/onboarding") || url.pathname.includes("/dashboard"));

    if (page.url().includes("/onboarding")) {
      await expect(page.getByRole("heading", { name: /start sharing one family budget space/i })).toBeVisible();
      await page.fill('input[name="name"]', "My E2E Family");
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname.includes("/dashboard"));
    }

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: new RegExp(`Welcome back, ${user.name}`, "i") })).toBeVisible();
  });

  test("should sign in successfully and log out", async ({ page }) => {
    const user = generateTestUser();
    await registerTestUser(page, user);

    // Logout
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForURL((url) => url.pathname.includes("/login"));
    await expect(page).toHaveURL(/\/login/);

    // Login again
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname.includes("/dashboard"));
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

import { Page, expect } from "@playwright/test";

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

export function generateTestUser(): TestUser {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return {
    name: `Test User ${random}`,
    email: `e2e_user_${timestamp}_${random}@example.com`,
    password: "Password123!",
  };
}

export async function registerTestUser(
  page: Page,
  user?: TestUser,
  householdName: string = "E2E Test Household",
): Promise<TestUser> {
  const newUser = user || generateTestUser();
  await page.goto("/register");
  await page.fill('input[name="name"]', newUser.name);
  await page.fill('input[name="email"]', newUser.email);
  await page.fill('input[name="password"]', newUser.password);
  await page.fill('input[name="confirmPassword"]', newUser.password);
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => url.pathname.includes("/onboarding") || url.pathname.includes("/dashboard"));

  if (page.url().includes("/onboarding")) {
    await page.fill('input[name="name"]', householdName);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.includes("/dashboard"));
  }

  return newUser;
}

export async function loginTestUser(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname.includes("/dashboard"));
}

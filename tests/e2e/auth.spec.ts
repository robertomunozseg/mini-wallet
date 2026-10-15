import { expect, test } from "@playwright/test";
import { alertWithText, retryUntilHydrated } from "./helpers";

test.describe("auth flow", () => {
  test("redirects an anonymous user from /home to /login", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("validates the field on blur", async ({ page }) => {
    await page.goto("/login");

    await retryUntilHydrated(async () => {
      await page.getByLabel("Email or phone").fill("not-valid");
      await page.getByLabel("Email or phone").blur();
      await expect(
        alertWithText(page, "Enter a valid email or a 10-digit phone number"),
      ).toBeVisible({ timeout: 2_000 });
    });
  });

  test("shows an accessible error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await retryUntilHydrated(async () => {
      await page.getByLabel("Email or phone").fill("fail@test.com");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(alertWithText(page, "Invalid credentials")).toBeVisible({ timeout: 2_000 });
    });
    await expect(page).toHaveURL(/\/login$/);
  });

  test("signs in, reaches /home and signs out", async ({ page }) => {
    await page.goto("/login");

    await retryUntilHydrated(async () => {
      await page.getByLabel("Email or phone").fill("5512345678");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/home$/, { timeout: 4_000 });
    });
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

    // A signed-in user is sent away from /login.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/home$/);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // The session is gone: protected pages redirect again.
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login$/);
  });
});

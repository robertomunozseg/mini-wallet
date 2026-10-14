import { expect, test, type Page } from "@playwright/test";

// Next.js adds its own role="alert" route announcer, so alerts are matched by their text.
function alertWithText(page: Page, text: string) {
  return page.getByRole("alert").filter({ hasText: text });
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill("5512345678");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

test.describe("home", () => {
  test("shows the balance, the user and the movements", async ({ page }) => {
    await signIn(page);

    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await expect(page.getByText("Welcome back, Demo User")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Available balance" })).toBeVisible();
    // The exact balance can change if transfers were made, so only the format is checked.
    await expect(page.getByText(/^\$[\d,]+\.\d{2}$/).first()).toBeVisible();

    await expect(page.getByRole("heading", { name: "Recent movements" })).toBeVisible();
    await expect(page.getByRole("listitem").first()).toBeVisible();
    expect(await page.getByRole("listitem").count()).toBeGreaterThanOrEqual(8);
  });

  test("has a New transfer link", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("link", { name: "New transfer" })).toHaveAttribute(
      "href",
      "/transfer",
    );
  });

  test("?scenario=empty shows the empty state", async ({ page }) => {
    await signIn(page);
    await page.goto("/home?scenario=empty");

    await expect(page.getByText("No movements yet")).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(0);
  });

  test("?scenario=error shows the error state with a retry button", async ({ page }) => {
    await signIn(page);
    await page.goto("/home?scenario=error");

    await expect(alertWithText(page, "We couldn't load your movements")).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    // The scenario is still forced, so the error comes back after retrying.
    await expect(alertWithText(page, "We couldn't load your movements")).toBeVisible();
  });

  test("ignores an unknown scenario", async ({ page }) => {
    await signIn(page);
    await page.goto("/home?scenario=nonsense");

    await expect(page.getByRole("listitem").first()).toBeVisible();
  });

  test("an anonymous user cannot see the home", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login$/);
  });
});

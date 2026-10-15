import { expect, test } from "./fixtures";
import { alertWithText, homeBalance } from "./helpers";

test.describe("home", () => {
  test("shows the user, the balance and the movements", async ({ signedIn: page }) => {
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await expect(page.getByText("Welcome back, Demo User")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Available balance" })).toBeVisible();
    // The exact balance can change if transfers were made, so only that it is a positive amount.
    expect(await homeBalance(page)).toBeGreaterThan(0);

    await expect(page.getByRole("heading", { name: "Recent movements" })).toBeVisible();
    await expect(page.getByRole("listitem").first()).toBeVisible();
    // The list is virtualized: the rows in the DOM are the ones near the viewport.
    expect(await page.getByRole("listitem").count()).toBeGreaterThanOrEqual(6);
  });

  test("?scenario=empty shows the empty state", async ({ signedIn: page }) => {
    await page.goto("/home?scenario=empty");

    await expect(page.getByText("No movements yet")).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(0);
  });

  test("?scenario=error shows the error state with a retry button", async ({ signedIn: page }) => {
    await page.goto("/home?scenario=error");

    await expect(alertWithText(page, "We couldn't load your movements")).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    // The scenario is still forced, so the error comes back after retrying.
    await expect(alertWithText(page, "We couldn't load your movements")).toBeVisible();
  });
});

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

  test("has a New transfer link", async ({ signedIn: page }) => {
    await expect(page.getByRole("link", { name: "New transfer" })).toHaveAttribute(
      "href",
      "/transfer",
    );
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

  test("ignores an unknown scenario", async ({ signedIn: page }) => {
    await page.goto("/home?scenario=nonsense");

    await expect(page.getByRole("listitem").first()).toBeVisible();
  });

  test("an anonymous user cannot see the home", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("home with a large history (?scenario=large)", () => {
  const MOVEMENTS_REGION = { name: "Movements" };

  test("renders a few rows even though there are 10,000 movements", async ({ signedIn: page }) => {
    await page.goto("/home?scenario=large");

    await expect(page.getByRole("region", MOVEMENTS_REGION)).toBeVisible();
    await expect(page.getByRole("listitem").first()).toBeVisible();

    const rows = await page.getByRole("listitem").count();
    expect(rows).toBeGreaterThan(5);
    expect(rows).toBeLessThan(30);
  });

  test("the first page comes with the page: no movements request on load", async ({
    signedIn: page,
  }) => {
    const movementRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/movements")
        movementRequests.push(request.url());
    });

    await page.goto("/home?scenario=large");
    await expect(page.getByRole("listitem").first()).toBeVisible();
    await page.waitForTimeout(500);

    expect(movementRequests).toEqual([]);
  });

  test("scrolling to the end loads the next page and keeps the DOM small", async ({
    signedIn: page,
  }) => {
    const cursorRequests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/api/movements" && url.searchParams.has("cursor")) {
        cursorRequests.push(url.searchParams.get("cursor") ?? "");
      }
    });

    await page.goto("/home?scenario=large");
    const region = page.getByRole("region", MOVEMENTS_REGION);
    await expect(page.getByRole("listitem").first()).toBeVisible();

    const heightBefore = await region.evaluate((element) => element.scrollHeight);
    await region.evaluate((element) => element.scrollTo(0, element.scrollHeight));

    await expect.poll(() => cursorRequests.length).toBeGreaterThan(0);
    // The new page makes the list taller...
    await expect
      .poll(() => region.evaluate((element) => element.scrollHeight))
      .toBeGreaterThan(heightBefore);
    // ...but the rows in the DOM stay few, and the first ones are no longer there.
    expect(await page.getByRole("listitem").count()).toBeLessThan(30);
    await expect(page.getByRole("listitem").first()).not.toHaveAttribute("aria-posinset", "1");
  });

  test("the scroll area can be reached with the keyboard", async ({ signedIn: page }) => {
    await page.goto("/home?scenario=large");
    const region = page.getByRole("region", MOVEMENTS_REGION);

    await region.focus();
    await expect(region).toBeFocused();
    await page.keyboard.press("PageDown");
    await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  });
});

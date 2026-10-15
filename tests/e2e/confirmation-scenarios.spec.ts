import { expect, test } from "./fixtures";
import { forceScenario, reachSummary, SCENARIO_HEADER } from "./helpers";

// Each test forces the scenario of POST /transactions with the x-mock-scenario header, so the
// result does not depend on the random scenario the server would pick.
test.describe("confirmation scenarios", () => {
  test("success: opens the receipt", async ({ signedIn: page }) => {
    await forceScenario(page, "success");
    await reachSummary(page);

    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page).toHaveURL(/\/transfer\/receipt\/[\w-]+$/);
    await expect(page.getByRole("main").getByText("Transfer completed")).toBeVisible();
  });

  test("network error: Try again reuses the Idempotency-Key and succeeds", async ({
    signedIn: page,
  }) => {
    const keys: Array<string | undefined> = [];
    let attempts = 0;
    await page.route("**/api/transactions", (route) => {
      keys.push(route.request().headers()["idempotency-key"]);
      attempts += 1;
      const scenario = attempts === 1 ? "network_error" : "success";
      return route.continue({
        headers: { ...route.request().headers(), [SCENARIO_HEADER]: scenario },
      });
    });
    await reachSummary(page);
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "couldn't reach" })).toBeVisible();

    await page.getByRole("button", { name: "Try again" }).click();

    await expect(page).toHaveURL(/\/transfer\/receipt\//);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  test("insufficient funds: Change amount returns to the amount step", async ({
    signedIn: page,
  }) => {
    await forceScenario(page, "insufficient_funds");
    await reachSummary(page, "2");
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "don't have enough balance" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);

    await page.getByRole("button", { name: "Change amount" }).click();

    await expect(
      page.getByRole("heading", { name: "How much do you want to send?" }),
    ).toBeVisible();
    await expect(page.getByLabel("Amount (MXN)")).toHaveValue("2.00");
  });

  test("timeout: says it may have been processed and offers Try again and Back to home", async ({
    signedIn: page,
  }) => {
    // The request really goes through the server. Playwright starts it with
    // MOCK_TIMEOUT_DELAY_MS=300 (see playwright.config.ts). If an already running dev server is
    // reused, it waits its default 10s and the client gives up at 8s: same screen, slower, so
    // this test is allowed more time.
    test.setTimeout(45_000);
    await forceScenario(page, "timeout");
    await reachSummary(page);
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "It may have been processed" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  });

  test("unknown error: shows a generic message and Back to home", async ({ signedIn: page }) => {
    await forceScenario(page, "unknown_error");
    await reachSummary(page);
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Something went wrong" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);

    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL(/\/home$/);
  });
});

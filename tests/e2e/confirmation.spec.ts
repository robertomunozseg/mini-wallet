import { expect, test, type Page, type Route } from "@playwright/test";

const SCENARIO_HEADER = "x-mock-scenario";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill("5512345678");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

// Reads the balance card of the Home as a number of pesos.
async function homeBalance(page: Page): Promise<number> {
  const text = await page
    .getByRole("heading", { name: "Available balance" })
    .locator("xpath=following-sibling::p[1]")
    .innerText();
  return Number(text.replace(/[^0-9.]/g, ""));
}

async function reachSummary(page: Page, amount = "1") {
  await page.getByRole("link", { name: "New transfer" }).click();
  await expect(page).toHaveURL(/\/transfer$/);
  await page.getByLabel("Amount (MXN)").fill(amount);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Ana García/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Review your transfer" })).toBeVisible();
}

// Forces the scenario of the next POST /transactions requests (the same thing the demo selector does).
async function forceScenario(page: Page, scenario: string) {
  await page.route("**/api/transactions", (route) =>
    route.continue({ headers: { ...route.request().headers(), [SCENARIO_HEADER]: scenario } }),
  );
}

test.describe("transfer confirmation", () => {
  test("success: shows the receipt and the Home has the new balance", async ({ page }) => {
    await signIn(page);
    const balanceBefore = await homeBalance(page);
    await forceScenario(page, "success");

    await reachSummary(page, "1");
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page).toHaveURL(/\/transfer\/receipt\/[\w-]+$/);
    await expect(page.getByRole("heading", { name: "Receipt" })).toBeVisible();
    // The hidden transfer page can stay in the DOM, so the receipt is searched in its own <main>.
    const receipt = page.getByRole("main").filter({ hasText: "Reference" });
    await expect(receipt.getByText("Transfer completed")).toBeVisible();
    await expect(receipt.getByText("Ana García")).toBeVisible();
    await expect(receipt.getByText("$1.00", { exact: true })).toBeVisible();

    // A reload shows the same receipt: it comes from the server, not from the browser state.
    await page.reload();
    await expect(page.getByRole("main").getByText("Transfer completed")).toBeVisible();

    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL(/\/home$/);
    // Tests run in parallel against the same server, so other transfers can also lower the
    // balance: it must have dropped by at least the 1.00 sent here (a stale Home would not).
    await expect.poll(() => homeBalance(page)).toBeLessThanOrEqual(balanceBefore - 1);
  });

  test("a new transfer starts from scratch after a receipt", async ({ page }) => {
    await signIn(page);
    await forceScenario(page, "success");
    await reachSummary(page);
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page).toHaveURL(/\/transfer\/receipt\//);

    await page.getByRole("link", { name: "New transfer" }).click();

    await expect(
      page.getByRole("heading", { name: "How much do you want to send?" }),
    ).toBeVisible();
    await expect(page.getByLabel("Amount (MXN)")).toHaveValue("");
  });

  test("network error: Try again reuses the Idempotency-Key and succeeds", async ({ page }) => {
    await signIn(page);
    const keys: Array<string | undefined> = [];
    let attempts = 0;
    await page.route("**/api/transactions", (route: Route) => {
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

  test("insufficient funds: Change amount returns to the amount step", async ({ page }) => {
    await signIn(page);
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
    page,
  }) => {
    await signIn(page);
    // The real server answers after 10s and the client gives up at 8s (covered by unit tests).
    // Here the 504 is answered right away to check what the user sees.
    await page.route("**/api/transactions", (route) =>
      route.fulfill({
        status: 504,
        json: { error: { code: "TIMEOUT", message: "The request timed out." } },
      }),
    );
    await reachSummary(page);
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "It may have been processed" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  });

  test("unknown error: shows a generic message and Back to home", async ({ page }) => {
    await signIn(page);
    await forceScenario(page, "unknown_error");
    await reachSummary(page);
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Something went wrong" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);

    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("shows Processing… and then says it is taking longer than usual", async ({ page }) => {
    await signIn(page);
    await page.route("**/api/transactions", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3_500));
      await route.continue({
        headers: { ...route.request().headers(), [SCENARIO_HEADER]: "network_error" },
      });
    });
    await reachSummary(page);
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page.getByText("Processing…")).toBeVisible();
    await expect(page.getByText("This is taking longer than usual")).toBeVisible();
    await expect(page.getByRole("button", { name: /Back/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});

test.describe("receipt page", () => {
  test("an unknown receipt shows Receipt not found", async ({ page }) => {
    await signIn(page);
    await page.goto("/transfer/receipt/does-not-exist");

    await expect(page.getByRole("heading", { name: "Receipt not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  });

  test("an anonymous user is sent to /login", async ({ page }) => {
    await page.goto("/transfer/receipt/anything");
    await expect(page).toHaveURL(/\/login$/);
  });
});

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { forceScenario, reachRecipientStep, reachSummary, retryUntilHydrated } from "./helpers";

// Checks the page that is on screen against WCAG 2.1 A and AA (contrast, labels, roles, names...).
// axe ignores the hidden pages Next keeps in the DOM, so only what the user sees is checked.
const expectNoViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.nodes
        .map((node) => node.target.join(" "))
        .join(" | ")}`,
  );
  expect(summary).toEqual([]);
};
test.describe("accessibility", () => {
  test("login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await expectNoViolations(page);
  });

  test("login with a validation error", async ({ page }) => {
    await page.goto("/login");
    await retryUntilHydrated(async () => {
      await page.getByLabel("Email or phone").fill("not-valid");
      await page.getByLabel("Email or phone").blur();
      await expect(page.getByRole("alert").filter({ hasText: "Enter a valid email" })).toBeVisible({
        timeout: 2_000,
      });
    });

    await expectNoViolations(page);
  });

  test("home", async ({ signedIn: page }) => {
    await expect(page.getByRole("listitem").first()).toBeVisible();

    await expectNoViolations(page);
  });

  test("home with the movements error", async ({ signedIn: page }) => {
    await page.goto("/home?scenario=error");
    await expect(page.getByRole("alert").filter({ hasText: "couldn't load" })).toBeVisible();

    await expectNoViolations(page);
  });

  test("transfer: amount step", async ({ signedIn: page }) => {
    await page.getByRole("link", { name: "New transfer" }).click();
    await expect(
      page.getByRole("heading", { name: "How much do you want to send?" }),
    ).toBeVisible();

    await expectNoViolations(page);
  });

  test("transfer: recipient step, with the new contact form open", async ({ signedIn: page }) => {
    await reachRecipientStep(page);
    await expect(page.getByRole("radio").first()).toBeVisible();
    await expectNoViolations(page);

    await page.getByRole("button", { name: "New contact" }).click();
    await expect(page.getByRole("heading", { name: "New contact" })).toBeVisible();
    await expectNoViolations(page);
  });

  test("transfer: summary and a failed confirmation", async ({ signedIn: page }) => {
    await forceScenario(page, "network_error");
    await reachSummary(page);
    await expectNoViolations(page);

    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expectNoViolations(page);
  });

  test("receipt and receipt not found", async ({ signedIn: page }) => {
    await forceScenario(page, "success");
    await reachSummary(page);
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page).toHaveURL(/\/transfer\/receipt\//);
    await expect(page.getByRole("main").getByText("Transfer completed")).toBeVisible();
    await expectNoViolations(page);

    await page.goto("/transfer/receipt/does-not-exist");
    await expect(page.getByRole("heading", { name: "Receipt not found" })).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe("keyboard and page structure", () => {
  test("the header shows the signed-in user", async ({ signedIn: page }) => {
    await expect(page.getByRole("banner").getByText("Demo User")).toBeVisible();
  });

  test("the first Tab stop is a skip link that moves focus to the content", async ({
    signedIn: page,
  }) => {
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("every page has its own title", async ({ signedIn: page }) => {
    await expect(page).toHaveTitle("Home | Mini Wallet");

    await page.getByRole("link", { name: "New transfer" }).click();
    await expect(page).toHaveTitle("New transfer | Mini Wallet");
  });

  test("the login page has its own title", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle("Sign in | Mini Wallet");
  });
});

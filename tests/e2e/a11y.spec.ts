import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { forceScenario, reachSummary } from "./helpers";

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

  test("home", async ({ signedIn: page }) => {
    await expect(page.getByRole("listitem").first()).toBeVisible();

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
});

test.describe("keyboard and page structure", () => {
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
});

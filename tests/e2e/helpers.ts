import { expect, type Page } from "@playwright/test";

// Header that forces the scenario of POST /transactions (see src/domain/api.ts).
export const SCENARIO_HEADER = "x-mock-scenario";

export type Scenario =
  "success" | "network_error" | "insufficient_funds" | "timeout" | "unknown_error";

// Next.js adds its own role="alert" route announcer, so alerts are matched by their text.
export function alertWithText(page: Page, text: string) {
  return page.getByRole("alert").filter({ hasText: text });
}

// The balance card of the Home as a number of pesos. It is a named group, so it is found by
// role and name; a hidden copy of the Home that Next keeps alive is ignored by getByRole.
export async function homeBalance(page: Page): Promise<number> {
  const text = await page
    .getByRole("group", { name: "Available balance" })
    .getByText(/^\$[\d,]+\.\d{2}$/)
    .innerText();
  return Number(text.replace(/[^0-9.]/g, ""));
}

// Forces the scenario of every POST /transactions of this page (what the demo selector does).
export async function forceScenario(page: Page, scenario: Scenario) {
  await page.route("**/api/transactions", (route) =>
    route.continue({ headers: { ...route.request().headers(), [SCENARIO_HEADER]: scenario } }),
  );
}

export async function openTransfer(page: Page) {
  await page.getByRole("link", { name: "New transfer" }).click();
  await expect(page).toHaveURL(/\/transfer$/);
}

export async function reachRecipientStep(page: Page, amount = "1") {
  await openTransfer(page);
  await page.getByLabel("Amount (MXN)").fill(amount);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Who is receiving it?" })).toBeVisible();
}

export async function reachSummary(page: Page, amount = "1") {
  await reachRecipientStep(page, amount);
  await page.getByRole("radio", { name: /Ana García/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Review your transfer" })).toBeVisible();
}

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  alertWithText,
  enterAmount,
  forceScenario,
  homeBalance,
  openTransfer,
  reachRecipientStep,
  reachSummary,
} from "./helpers";

// A phone number that is different on every run, because created contacts live in memory
// until the server restarts and duplicates are rejected.
function uniquePhone(): string {
  return `55${String(Date.now()).slice(-8)}`;
}

test.describe("transfer flow", () => {
  test("an anonymous user is sent to /login", async ({ page }) => {
    await page.goto("/transfer");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("opens from the Home and shows the amount step", async ({ signedIn: page }) => {
    await openTransfer(page);

    await expect(page.getByRole("heading", { name: "New transfer" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "How much do you want to send?" }),
    ).toBeVisible();
    await expect(page.getByText(/Available balance:/)).toBeVisible();
    // The step indicator has no role that can say "current", so the attribute is used.
    await expect(page.locator('li[aria-current="step"]')).toContainText("Amount");
  });

  test("blocks an amount above the balance and explains amount errors inline", async ({
    signedIn: page,
  }) => {
    await openTransfer(page);
    const amount = page.getByLabel("Amount (MXN)");

    // Grey (aria-disabled) while the amount is not valid, but still pressable to see why.
    const next = page.getByRole("button", { name: "Continue" });
    await expect(next).toHaveAttribute("aria-disabled", "true");
    await next.click({ force: true });
    await expect(alertWithText(page, "Enter an amount.")).toBeVisible();

    await amount.fill("0");
    await expect(alertWithText(page, "The amount must be greater than zero.")).toBeVisible();

    await amount.fill("999999999");
    await expect(alertWithText(page, "Insufficient balance.")).toBeVisible();
    await next.click({ force: true });
    // Still on the amount step: it cannot continue with more than the balance.
    await expect(
      page.getByRole("heading", { name: "How much do you want to send?" }),
    ).toBeVisible();

    await amount.fill("1,250.50");
    await expect(page.getByLabel("Amount (MXN)")).not.toHaveAttribute("aria-invalid", "true");
    await expect(next).not.toHaveAttribute("aria-disabled", "true");
  });

  test("does not continue without a recipient", async ({ signedIn: page }) => {
    await reachRecipientStep(page, "100");

    // Favorites come first.
    await expect(page.getByRole("group", { name: "Favorites" })).toBeVisible();
    await expect(page.getByRole("radio").first()).toBeVisible();

    const next = page.getByRole("button", { name: "Continue" });
    await expect(next).toHaveAttribute("aria-disabled", "true");
    await next.click({ force: true });

    await expect(alertWithText(page, "Choose a recipient.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Who is receiving it?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm" })).toHaveCount(0);

    // Choosing a contact makes Continue available.
    await page.getByRole("radio", { name: /Ana García/ }).check();
    await expect(next).not.toHaveAttribute("aria-disabled", "true");
  });

  test("on a short laptop window the page does not scroll, the list does and Continue is visible", async ({
    signedIn: page,
  }) => {
    // A laptop with 150% display scaling leaves about 1273x590 CSS pixels.
    await page.setViewportSize({ width: 1273, height: 590 });
    await reachRecipientStep(page, "1");
    await expect(page.getByRole("radio").first()).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
        ),
      )
      .toBeLessThanOrEqual(0);
    const list = page.getByRole("region", { name: "Contacts" });
    expect(await list.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
      true,
    );
    const next = await page.getByRole("button", { name: "Continue" }).boundingBox();
    expect((next?.y ?? 0) + (next?.height ?? 0)).toBeLessThanOrEqual(590);
  });

  test("walks through amount, recipient and summary", async ({ signedIn: page }) => {
    await reachSummary(page, "100");

    await expect(page.getByText("$100.00").first()).toBeVisible();
    // exact: the hidden Home page (kept alive by Next) also contains "Sent to Ana García".
    await expect(page.getByText("Ana García", { exact: true })).toBeVisible();
    await expect(page.getByText("Balance after transfer")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm" })).toBeEnabled();
  });

  test("searches contacts on the server ignoring accents, with one request per search", async ({
    signedIn: page,
  }) => {
    const searches: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/api/contacts" && url.searchParams.has("q")) {
        searches.push(url.searchParams.get("q") ?? "");
      }
    });

    await reachRecipientStep(page, "10");
    await expect(page.getByRole("radio").first()).toBeVisible();

    // Typed in one go: the debounce sends a single request, with the final text.
    await page.getByLabel("Search contacts").pressSequentially("garcia");
    await expect(page.getByRole("radio", { name: /Ana García/ })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(1);
    expect(searches).toEqual(["garcia"]);

    await page.getByLabel("Search contacts").fill("zzz");
    await expect(page.getByText(/No contacts match/)).toBeVisible();
    expect(searches).toEqual(["garcia", "zzz"]);
  });

  test("creates a new contact, selects it and rejects a duplicate", async ({ signedIn: page }) => {
    await reachRecipientStep(page, "10");

    // Scoped to the form: the hidden login page (kept alive by Next) has a field with the same label.
    const form = page
      .locator("form")
      .filter({ has: page.getByRole("heading", { name: "New contact" }) });

    const phone = uniquePhone();
    await page.getByRole("button", { name: "New contact" }).click();
    await form.getByLabel("Name", { exact: true }).fill("Playwright Pal");
    await form.getByLabel("Email or phone").fill(phone);
    await form.getByRole("button", { name: "Save contact" }).click();

    await expect(page.getByText(/Sending to:/)).toContainText("Playwright Pal");
    // Earlier runs may have left contacts with the same name, so the radio is found by its phone.
    await expect(page.getByRole("radio", { name: new RegExp(phone) })).toBeChecked();

    // The same phone again is rejected with the server message.
    await page.getByRole("button", { name: "New contact" }).click();
    await form.getByLabel("Name", { exact: true }).fill("Someone Else");
    await form.getByLabel("Email or phone").fill(phone);
    await form.getByRole("button", { name: "Save contact" }).click();

    await expect(
      alertWithText(page, "A contact with this phone or email already exists."),
    ).toBeVisible();
  });

  test("Back keeps the data, and leaving the flow clears it", async ({ signedIn: page }) => {
    await openTransfer(page);
    await page.getByLabel("Amount (MXN)").fill("75");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Back/ }).click();

    await expect(page.getByLabel("Amount (MXN)")).toHaveValue("75.00");

    // Back from the first step leaves the flow; coming back starts from scratch.
    await page.getByRole("button", { name: /Back/ }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.getByRole("link", { name: "New transfer" }).click();
    await expect(page.getByLabel("Amount (MXN)")).toHaveValue("");
  });
});

test.describe("successful transfer and receipt", () => {
  test("goes from the amount to the receipt, and the Home has the new balance", async ({
    signedIn: page,
  }) => {
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

  test("a new transfer starts from scratch after a receipt", async ({ signedIn: page }) => {
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

  test("an unknown receipt shows Receipt not found", async ({ signedIn: page }) => {
    await page.goto("/transfer/receipt/does-not-exist");

    await expect(page.getByRole("heading", { name: "Receipt not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  });

  test("an anonymous user is sent to /login from a receipt", async ({ page }) => {
    await page.goto("/transfer/receipt/anything");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("transfer with a large address book (?scenario=large)", () => {
  async function openRecipientStep(page: Page) {
    await page.goto("/transfer?scenario=large");
    await enterAmount(page, "10");
    await expect(page.getByRole("radio").first()).toBeVisible();
  }

  test("shows a page of contacts and loads more on demand", async ({ signedIn: page }) => {
    await openRecipientStep(page);

    // One page (20), not 5,000 contacts.
    await expect(page.getByRole("radio")).toHaveCount(20);
    await page.getByRole("button", { name: "Load more" }).click();
    await expect(page.getByRole("radio")).toHaveCount(40);
  });

  test("searches the whole address book on the server", async ({ signedIn: page }) => {
    await openRecipientStep(page);

    await page.getByLabel("Search contacts").pressSequentially("hernandez");

    // Wait until the list shows only matches (it still shows the old list until the debounce
    // and the request finish), instead of assuming how long that takes.
    const labels = () =>
      page
        .getByRole("radio")
        .evaluateAll((nodes) => nodes.map((node) => node.closest("label")?.textContent ?? ""));
    await expect
      .poll(async () => {
        const texts = await labels();
        return texts.length > 0 && texts.every((text) => text.toLowerCase().includes("hern"));
      })
      .toBe(true);
  });
});

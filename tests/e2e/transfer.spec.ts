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

async function openTransfer(page: Page) {
  await signIn(page);
  await page.getByRole("link", { name: "New transfer" }).click();
  await expect(page).toHaveURL(/\/transfer$/);
}

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

  test("opens from the Home and shows the amount step", async ({ page }) => {
    await openTransfer(page);

    await expect(page.getByRole("heading", { name: "New transfer" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "How much do you want to send?" }),
    ).toBeVisible();
    await expect(page.getByText(/Available balance:/)).toBeVisible();
    await expect(page.locator('li[aria-current="step"]')).toContainText("Amount");
  });

  test("explains amount errors inline", async ({ page }) => {
    await openTransfer(page);
    const amount = page.getByLabel("Amount (MXN)");

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(alertWithText(page, "Enter an amount.")).toBeVisible();

    await amount.fill("0");
    await expect(alertWithText(page, "The amount must be greater than zero.")).toBeVisible();

    await amount.fill("999999999");
    await expect(alertWithText(page, "Insufficient balance.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "How much do you want to send?" }),
    ).toBeVisible();

    await amount.fill("1,250.50");
    await expect(page.getByLabel("Amount (MXN)")).not.toHaveAttribute("aria-invalid", "true");
  });

  test("walks through amount, recipient and summary", async ({ page }) => {
    await openTransfer(page);

    await page.getByLabel("Amount (MXN)").fill("100");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Who is receiving it?" })).toBeVisible();

    // Favorites come first.
    await expect(page.getByRole("group", { name: "Favorites" })).toBeVisible();
    await expect(page.getByRole("radio").first()).toBeVisible();

    // Continue without a recipient explains what is missing.
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(alertWithText(page, "Choose a recipient.")).toBeVisible();

    await page.getByRole("radio", { name: /Ana García/ }).check();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Review your transfer" })).toBeVisible();
    await expect(page.getByText("$100.00").first()).toBeVisible();
    // exact: the hidden Home page (kept alive by Next) also contains "Sent to Ana García".
    await expect(page.getByText("Ana García", { exact: true })).toBeVisible();
    await expect(page.getByText("Balance after transfer")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm" })).toBeEnabled();
  });

  test("searches contacts on the server ignoring accents, with one request per search", async ({
    page,
  }) => {
    const searches: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/api/contacts" && url.searchParams.has("q")) {
        searches.push(url.searchParams.get("q") ?? "");
      }
    });

    await openTransfer(page);
    await page.getByLabel("Amount (MXN)").fill("10");
    await page.getByRole("button", { name: "Continue" }).click();
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

  test("creates a new contact, selects it and rejects a duplicate", async ({ page }) => {
    await openTransfer(page);
    await page.getByLabel("Amount (MXN)").fill("10");
    await page.getByRole("button", { name: "Continue" }).click();

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

  test("Back keeps the data, and leaving the flow clears it", async ({ page }) => {
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

test.describe("transfer with a large address book (?scenario=large)", () => {
  async function openRecipientStep(page: Page) {
    await signIn(page);
    await page.goto("/transfer?scenario=large");
    await page.getByLabel("Amount (MXN)").fill("10");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("radio").first()).toBeVisible();
  }

  test("shows a page of contacts and loads more on demand", async ({ page }) => {
    await openRecipientStep(page);

    // One page (20), not 5,000 contacts.
    await expect(page.getByRole("radio")).toHaveCount(20);
    await page.getByRole("button", { name: "Load more" }).click();
    await expect(page.getByRole("radio")).toHaveCount(40);
  });

  test("searches the whole address book on the server", async ({ page }) => {
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

import { expect, test as base, type Page } from "@playwright/test";

// Any valid email or 10-digit phone signs in, except fail@test.com (see authService).
export const DEMO_IDENTIFIER = "5512345678";

type Fixtures = {
  // A page whose browser context is already signed in and sitting on the Home.
  signedIn: Page;
};

export const test = base.extend<Fixtures>({
  signedIn: async ({ page }, provide) => {
    // Signing in through the API is faster than the form (the login has a 600 ms simulated delay)
    // and the cookie it sets is shared with the page. The login form itself is covered by auth.spec.ts.
    const response = await page.request.post("/api/auth/login", {
      data: { identifier: DEMO_IDENTIFIER },
    });
    expect(response.ok()).toBe(true);

    await page.goto("/home");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await provide(page);
  },
});

export { expect };

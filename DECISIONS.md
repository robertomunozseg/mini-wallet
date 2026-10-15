# Design decisions

Each section says **what the code does** and leaves room for **why I chose it**. The "My reasoning" lines are for the author to complete.

## 1. Project structure

The code is split by responsibility, not by file type:

```
domain → server/services → app/api → features (hooks) → components
```

- `src/domain`: types, business rules and Zod schemas. Pure TypeScript.
- `src/server`: mock database, session, scenarios and services. Only used by route handlers and Server Components.
- `src/app/api`: thin route handlers.
- `src/features/*`: one folder per feature (auth, home, transfer) with its components and hooks.
- `src/components/ui`: presentational components with no business logic.

> My reasoning: _why this layout, what I considered instead (for example grouping by file type), what a new developer finds easier._

## 2. Separating UI from business logic

- Components render and call hooks. They do not decide business rules.
- Hooks (`useLogin`, `useConfirmTransfer`, `useRecipientStep`, ...) own the state and the requests, and use the domain.
- The domain has no React or Next imports, so its rules are tested without a browser.

> My reasoning: _what this made easier to test and to change, and where I was tempted to put logic in a component._

## 3. Rendering strategy per page

| Page                     | Strategy                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                 | Static shell, client form                                                                                                                                   |
| `/home`                  | Server Component: balance and the first page of movements are rendered on the server (movements stream in through `Suspense`); more pages load from the API |
| `/transfer`              | Server Component reads the balance and renders a client flow                                                                                                |
| `/transfer/receipt/[id]` | Dynamic Server Component; `notFound()` when the receipt does not exist                                                                                      |

Server Components call the services directly instead of fetching their own API. I use the App Router (not the Pages Router) for Server Components, layouts that stay mounted between pages and `proxy.ts`.

> My reasoning: _what each choice saves (an extra round trip, a loading flash) and what it costs._

## 4. Route handlers, not Server Actions

- The challenge asks for API Routes, so every mutation (login, logout, new contact, transfer) goes through a route handler under `src/app/api`.
- The handlers are thin: they parse and validate the request, call a service and answer. The services are plain functions, so a Server Action could call the same ones without changing the business logic.
- A plain HTTP contract is easy to exercise from the browser, from tests and from `curl`, and it lets the tests force a scenario with a header and send the `Idempotency-Key` header.

> My reasoning: _what I would use a Server Action for in a real project (for example a form that must work without JavaScript), and why it did not fit here._

## 5. Why Redux Toolkit and axios-hooks

- **Redux Toolkit** holds only app state that crosses screens: the signed-in user and the transfer draft (step, amount, recipient, idempotency key). The store is created per request, not as a global singleton.
- **axios-hooks** gives one configured client and a hook per request with loading and error state. Mutations are manual; the cache is off so balances are never stale.

> My reasoning: _why not local state only, why not RTK Query or React Query (see section 14)._

## 6. Where the business rules live

The transfer rules (amount above zero, amount not above the balance, recipient required) are one pure function, `validateTransfer`, in the domain.

- The **client** runs it for immediate feedback.
- The **server** runs it again and is the source of truth: it never trusts the client.
- Money is an integer number of cents with its own branded type, and is formatted only when shown.

> My reasoning: _why the same rule runs in two places, and why cents._

## 7. Errors and scenarios

- Every API error has the same shape: `{ error: { code, message } }`, with a closed list of codes.
- `mapApiError` turns any failure (HTTP error, timeout, no response) into one of those codes with a user-facing message.
- A transfer picks a scenario (success, network error, insufficient funds, timeout, unknown) at random, or the `x-mock-scenario` header forces it. Each one has its own screen and its own actions (retry, change amount, back to home).

> My reasoning: _why a uniform contract, why random scenarios with a way to force them._

## 8. Idempotency

- The client creates an `Idempotency-Key` when the user confirms and keeps it while the transfer is retried.
- The server stores definitive outcomes (success, insufficient funds) by key and returns the stored result on a retry, so a transfer is never debited twice.
- Transient failures (network error, timeout, unknown error) are not stored, so the retry can still succeed.
- Changing the amount or the recipient is a new intent, so the key is discarded.
- The store has a 24 h expiry and a maximum size.

> My reasoning: _what problem this prevents (a double tap, a retry after a timeout) and why failures are handled differently._

## 9. Edge cases considered

- Amounts: zero, negative, equal to the balance (allowed), balance plus one cent, decimals and thousands separators.
- Double submit: blocked while a request is in flight.
- Slow request: a "taking longer than usual" message after 3 seconds.
- Timeout: the message says the transfer may have been processed, and retrying is safe.
- Duplicate contacts and search ignoring accents ("garcia" finds "García").
- A list changing while the user pages through it (cursor pagination does not repeat or skip items).
- Leaving the transfer flow clears the draft; Back keeps it.
- Reloading a receipt, and opening a receipt that does not exist.

> My reasoning: _which of these surprised me while building, and which I would test first._

## 10. Permissions

- `proxy.ts` is the first, optimistic barrier: without a valid session cookie, `/home` and `/transfer/*` redirect to `/login`, and a signed-in user is sent away from `/login`. It checks the value of the cookie, not only that it exists.
- The real check is on the server: every route handler except login answers `401 UNAUTHORIZED` without a session, and the protected layout and the receipt page verify the session again.
- The cookie is `httpOnly`, `sameSite=lax` and `secure` in production.
- A receipt is only shown to a signed-in user. The mock has a single user, so "belongs to the user" is not checked beyond that; with real users the receipt would also be compared with its owner.

> My reasoning: _why a redirect in the proxy is not enough on its own, and what I would add with real roles._

## 11. Built for scale, and how much is too much

The challenge asks for **simple and extensible code without over-engineering**, and also says the system serves **millions of users**. What the brief needs at minimum is the screens, the three rules and the failure scenarios. I added, on purpose, what changes behavior at high volume even with a mock:

- Cursor pagination (no repeated or skipped items), and server-side search with debounce and request cancellation.
- A virtualized movements list; `memo`, `useCallback` and `useMemo` where they avoid real re-renders.
- A bounded idempotency store, and `Cache-Control: private, no-store` on the API.

The price is more code to read and one more dependency (`@tanstack/react-virtual`). I stopped there: no database, no cache layer, and the contacts list is paginated but not virtualized.

> My reasoning: _where I drew the line between "ready for scale" and "over-engineered", and what I measured to decide._

## 12. Testing strategy

| Layer                   | What is tested                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain                  | Pure functions: the transfer rules, money, pagination, schemas. Edge cases such as zero, equal to the balance, balance plus one cent                                                 |
| Server services         | Rules enforced on the server, idempotency and every scenario. The transaction service receives the clock, the ids and the waiting as injected parts, so tests do not wait 10 seconds |
| Hooks                   | With the real axios, axios-hooks and `mapApiError` over a fake network layer, so failures behave as in the browser                                                                   |
| Critical components     | Forms, each step of the transfer and the screen for each outcome; render counts where `memo` matters                                                                                 |
| End to end (Playwright) | Login, Home, the whole transfer up to the receipt, one test per failure scenario and an accessibility check of every screen                                                          |

**Why Playwright for end-to-end tests** (Cypress would also have worked):

- It waits for elements by itself, which gives fewer flaky tests than fixed waits.
- It starts the app with the `webServer` option, so `npm run test:e2e` needs no extra setup.
- `page.route` forces any failure scenario by adding the `x-mock-scenario` header to the real request, which is exactly what the challenge asks for.
- Fixtures reuse the login (`signedIn`), and the role-based locators (`getByRole`, `getByLabel`) push the markup to stay accessible.
- It works with TypeScript without configuration, runs tests in parallel and has trace files to debug failures.
- It integrates with axe for the accessibility checks.

Trade-offs: only Chromium is run, and the tests share the server's in-memory data, so they avoid exact balances. A form filled right after `page.goto` can be typed before React takes over, so those interactions retry until they work (`retryUntilHydrated`).

> My reasoning: _what I would not test at the end-to-end level, and what I would add with more time (more browsers, visual tests, load tests)._

## 13. Accessibility

- Every field has a label; errors use `role="alert"`; icons that only decorate are hidden from screen readers.
- Every interactive element has a visible focus style, and the whole flow works with the keyboard. A **Skip to content** link is the first Tab stop.
- Each page has its own title (`Home | Mini Wallet`, `New transfer | Mini Wallet`, ...).
- Colors are chosen for contrast on white.
- An automatic check (axe, WCAG 2.1 A and AA) runs on every screen in the end-to-end tests, so a regression fails the build.

> My reasoning: _why I treated accessibility as part of the definition of done, and what the automatic check cannot cover (for example, how it sounds with a screen reader)._

## 14. What I would do differently with more time

- **Real database** instead of in-memory state, with transactions for the debit.
- **Real authentication** (sessions or tokens per user, password or provider login).
- **Observability**: structured logs, metrics and error tracking, with a request id.
- **i18n**: move the interface text out of the components.
- **RTK Query or React Query** for caching and request deduplication instead of axios-hooks.
- **Rate limiting** on login and transfers.
- **Feature flags** for the demo mode and the forced scenarios, instead of environment variables.

> My reasoning: _which of these I would do first and why._

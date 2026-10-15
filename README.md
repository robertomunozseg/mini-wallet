# Mini Wallet

A small wallet web app: sign in, see your balance and movements, send money to a contact and get a receipt. Built with **Next.js (App Router) + TypeScript** for the Spin Web Challenge. There is no real backend: the API is a set of Next.js route handlers backed by an in-memory mock database.

## What you can do

1. **Sign in** with an email or a phone number.
2. **Home**: see your balance and a paginated, virtualized list of movements.
3. **New transfer**: enter an amount, choose (or create) a recipient, review and confirm.
4. **Receipt**: reference, date, amount, recipient and new balance. Every failure scenario of a transfer (network error, insufficient funds, timeout, unknown error) has its own screen.

## Requirements

- Node.js 20.9 or newer (developed and tested on Node 22)
- npm

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. That is all you need; no environment variables are required.

To run the end-to-end tests the first time you also need the Playwright browser:

```bash
npx playwright install chromium
```

## Demo credentials

There are no real accounts. The login accepts:

| Input                                                                    | Result                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------- |
| Any valid email (`someone@example.com`) or 10-digit phone (`5512345678`) | Signs in as the demo user (balance 12,500.00 MXN) |
| `fail@test.com`                                                          | Shows the "Invalid credentials" error             |
| Anything else (`abc`, `123`)                                             | Inline validation error                           |

## Forcing scenarios

`POST /api/transactions` picks a scenario at random (success 60 %, every other scenario 10 %), so a transfer can fail on purpose. To see a specific case:

- **Demo selector (easiest).** Create a file named `.env.local` with `NEXT_PUBLIC_DEMO_MODE=true` and restart `npm run dev`. The transfer summary then shows a **Simulated scenario** selector: random (default), `success`, `network_error`, `insufficient_funds`, `timeout` or `unknown_error`. The variable is read at build time, so on a deployment set it before building.
- **Header.** Send `x-mock-scenario: <scenario>` with the request (this is what the end-to-end tests do).
- **Lists.** Add a query parameter to the page URL:
  - `/home?scenario=empty` shows the empty state, `/home?scenario=error` the error state with a retry button.
  - `/home?scenario=large` and `/transfer?scenario=large` use a generated dataset (10,000 movements, 5,000 contacts) to try pagination, search and virtualization.
- **Timeout.** The timeout scenario waits 10 seconds on purpose (the client gives up after 8). Set the server-side variable `MOCK_TIMEOUT_DELAY_MS` (for example `300`) to shorten it; the end-to-end tests do.

## Scripts

| Script                        | What it does                                              |
| ----------------------------- | --------------------------------------------------------- |
| `npm run dev`                 | Development server                                        |
| `npm run build` / `npm start` | Production build and server                               |
| `npm run lint`                | ESLint                                                    |
| `npm run typecheck`           | `tsc --noEmit` (strict mode)                              |
| `npm test`                    | Unit tests with Vitest (watch mode: `npm run test:watch`) |
| `npm run test:e2e`            | End-to-end tests with Playwright (Chromium)               |
| `npm run format`              | Prettier                                                  |

Playwright reuses a dev server that is already running on port 3000; transfers made by the tests then end up in that server's data. Stop `npm run dev` first if you want a clean run.

## API

All responses use the same error contract: `{ "error": { "code": "...", "message": "..." } }`. Everything except login needs the session cookie.

| Endpoint                                         | Purpose                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `POST /api/auth/login` · `POST /api/auth/logout` | Start / end the session (httpOnly cookie)                                                            |
| `GET /api/account`                               | Balance of the signed-in user                                                                        |
| `GET /api/movements?limit&cursor`                | Movements, newest first, cursor pagination                                                           |
| `GET /api/contacts?q&limit&cursor`               | Contacts (favorites first), server-side search, cursor pagination                                    |
| `POST /api/contacts`                             | Create a contact (duplicates are rejected)                                                           |
| `POST /api/transactions`                         | Create a transfer. Requires an `Idempotency-Key` header; retries with the same key never debit twice |

## Libraries and why

| Library                                         | Why                                                                                                                                                                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16 (App Router)                         | Server Components for the first render of each page, route handlers for the mock API, `proxy.ts` for route protection                                                                                                                                |
| TypeScript (strict, `noUncheckedIndexedAccess`) | Types are the first line of defense; money has its own branded type                                                                                                                                                                                  |
| Redux Toolkit                                   | Small app state that crosses screens: the signed-in user and the transfer draft (step, amount, recipient, idempotency key)                                                                                                                           |
| axios + axios-hooks                             | One configured HTTP client and a hook per request with loading and error state; mutations are manual                                                                                                                                                 |
| Zod                                             | Validates request bodies and query strings, and the login and contact forms, with one schema on both sides                                                                                                                                           |
| Tailwind CSS                                    | Fast, consistent, responsive styling without custom CSS files                                                                                                                                                                                        |
| @tanstack/react-virtual                         | Renders only the visible rows of the movements list, so 10,000 movements stay fast                                                                                                                                                                   |
| Vitest + Testing Library                        | Unit and component tests                                                                                                                                                                                                                             |
| Playwright + axe-core                           | End-to-end tests of the real flows and automatic WCAG 2.1 A/AA checks of every screen. Chosen for its automatic waiting, its built-in web server, `page.route` to force failure scenarios and role-based locators (see [DECISIONS.md](DECISIONS.md)) |

## Project structure

```
src/
  domain/         Types, business rules and Zod schemas. Pure TypeScript: no React, no Next.
  server/         Mock database, session, scenario simulator and services. Only for route handlers and Server Components.
    services/     One service per area (account, auth, contacts, movements, transactions, receipts).
  app/            Pages, layouts and route handlers.
    api/          Thin route handlers: parse, validate, call a service, respond.
    login/        Public page.
    (wallet)/     Protected pages: home and transfer (with the receipt).
  features/       Components and hooks per feature: auth, home, transfer.
  components/ui/  Reusable presentational components (Button, Input, Card, ...).
  lib/            axios instance, error mapping and small shared hooks.
  store/          Redux Toolkit store, slices and typed hooks.
  proxy.ts        Redirects visitors without a session away from protected pages.
tests/e2e/        Playwright tests (with a reusable login fixture).
```

Data flows in one direction: `domain` → `server/services` → `app/api` → hooks in `features` → components. See [DECISIONS.md](DECISIONS.md) for the reasoning.

## Tests

- **Unit and component tests** sit next to the code in `__tests__` folders (`npm test`).
- **End-to-end tests** are in `tests/e2e` (`npm run test:e2e`): login, home, the whole transfer flow up to the receipt, one test per failure scenario, and an accessibility check (axe) of every screen.

## Known limitations

- **State lives in memory.** Balance, movements, contacts and receipts are kept in the server process. Restarting the server resets them, and on a serverless platform each instance has its own copy, so a freshly created receipt may not be found by another instance.
- **The session is a mock.** The cookie holds a fixed token; there are no real users, passwords or per-user data.
- **One user.** Every receipt belongs to the demo user.
- **Contacts are not virtualized.** They are paginated with a "Load more" button and narrowed down by the server-side search.
- **Strict Mode in development** can send some requests twice; production does not.
- **English only.** The interface text is in English and is not prepared for translation.

## Time spent

[TO BE FILLED IN]

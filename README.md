# Mini Wallet

A small wallet web app: sign in, see your balance and movements, send money to a contact and get a receipt. Built with **Next.js (App Router) + TypeScript**. There is no real backend: the API is a set of Next.js route handlers backed by an in-memory mock database.

## What you can do

1. **Sign in** with an email or a phone number.
2. **Home**: see your balance and a paginated, virtualized list of movements.
3. **New transfer**: enter an amount, choose (or create) a recipient, review and confirm.
4. **Receipt**: reference, date, amount, recipient and new balance. Every failure scenario of a transfer (network error, insufficient funds, timeout, unknown error) has its own screen.

> **Note:** about 4 in 10 transfer confirmations fail on purpose, as the brief asks. See [Forcing scenarios](#forcing-scenarios) to choose the result.

## Try it step by step

No programming experience is needed. You only need access to this repository and a computer with internet.

### 1. Install two tools (once)

- **Git**, to download the project: <https://git-scm.com/downloads>
- **Node.js**, to run it. Download the **LTS** version (20.9 or newer; it was developed on Node 22): <https://nodejs.org>

Install both with the default options (Next, Next, Finish).
Then open a **terminal**: on Windows press the Start key, type `PowerShell` and open it; on macOS press `Cmd + Space`, type `Terminal` and open it.
Check that both tools work by typing these two lines (press Enter after each). Each one should print a version number:

```bash
git --version
node -v
```

If a line says "not recognized" or "command not found", close the terminal, open a new one and try again.

### 2. Download the project

Copy these two lines into the terminal, one at a time:

```bash
git clone https://github.com/robertomunozseg/mini-wallet.git
cd mini-wallet
```

The first one downloads the project into a new folder called `mini-wallet`; the second one enters that folder.
All the next commands must be typed inside this folder.

### 3. Install what the project needs

```bash
npm install
```

It takes about one or two minutes and prints a lot of text. That is normal.
At the end it may say that there are "high severity vulnerabilities". They are in development tools only, not in the app (see [Known limitations](#known-limitations)).

### 4. Start the app

```bash
npm run dev
```

Wait until you see `Ready` and a line with `http://localhost:3000`.
**Leave this window open**: closing it stops the app.

### 5. Open it in the browser

Open Chrome (or any browser) and go to <http://localhost:3000>.

### 6. Try it

1. Sign in with `someone@example.com` (or the phone `5512345678`). Any valid email or 10-digit phone works.
2. You will see the balance (12,500.00 MXN) and a list of movements.
3. Press **New transfer**, type an amount such as `100`, press **Continue**, choose **Ana García**, press **Continue** and then **Confirm**.
4. You get either a **receipt** or an **error screen**. Errors are on purpose: about 4 in 10 confirmations fail so that every case can be seen. Use **Try again**, **Change amount** or **Back to home**.
5. Try things that should be refused: sign in with `fail@test.com`, an amount above the balance, or continue without choosing a recipient.
6. Press the **+** next to the search box to add a new contact.
7. Press **Sign out** when you are done.

To choose the result of a transfer instead of leaving it to chance, see [Forcing scenarios](#forcing-scenarios).

### Stop and start again

Go to the terminal window and press `Ctrl + C`.
To start again, open a terminal in the `mini-wallet` folder and run `npm run dev`.
The data is kept in memory, so it goes back to the initial state every time the app is stopped and started.

### If something goes wrong

- **"not recognized" / "command not found"**: the tool is not installed, or the terminal was open before installing it. Close it and open a new one.
- **The address is not `localhost:3000`**: if that port is busy, the app starts on the next one (for example 3001). Open the address printed next to `Local:` in the terminal.
- **"Another next dev server is already running"**: the app is already running in another terminal window of this folder. Use that one, or close it first.
- **`npm install` fails**: check your internet connection and run it again.
- **The page is blank or shows an old version**: refresh with `Ctrl + Shift + R` (on macOS `Cmd + Shift + R`).

### Run the automated tests (optional)

```bash
npm test
```

runs the unit tests. For the end-to-end tests (they open a browser by themselves), first install its browser once and make sure `npm run dev` is **not** running:

```bash
npx playwright install chromium
npm run test:e2e
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

- **Demo selector (easiest).** In the `mini-wallet` folder create a text file named `.env.local` that contains exactly `NEXT_PUBLIC_DEMO_MODE=true`, then stop the app (`Ctrl + C`) and run `npm run dev` again. The transfer summary then shows a **Simulated scenario** selector: random (default), `success`, `network_error`, `insufficient_funds`, `timeout` or `unknown_error`.
- **Header.** Send `x-mock-scenario: <scenario>` with the request (this is what the end-to-end tests do).
- **Lists.** Add a query parameter to the page URL:
  - `/home?scenario=empty` shows the empty state, `/home?scenario=error` the error state with a retry button.
  - `/home?scenario=large` and `/transfer?scenario=large` use a generated dataset (10,000 movements, 5,000 contacts) to try pagination, search and virtualization.
- **Timeout.** The timeout scenario waits 10 seconds on purpose (the client gives up after 8). Set the server-side variable `MOCK_TIMEOUT_DELAY_MS` (for example `300`) to shorten it; the end-to-end tests do.

## Scripts

| Script                        | What it does                                                  |
| ----------------------------- | ------------------------------------------------------------- |
| `npm run dev`                 | Development server                                            |
| `npm run build` / `npm start` | Production build and server                                   |
| `npm run lint`                | ESLint                                                        |
| `npm run typecheck`           | `next typegen` (route types) and `tsc --noEmit` (strict mode) |
| `npm test`                    | Unit tests with Vitest (watch mode: `npm run test:watch`)     |
| `npm run test:e2e`            | End-to-end tests with Playwright (Chromium)                   |
| `npm run format`              | Prettier                                                      |

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

| Library                                         | Why                                                                                                                                                                                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16 (App Router)                         | Server Components for the first render of each page, route handlers for the mock API, `proxy.ts` for route protection                                                                                                                                    |
| TypeScript (strict, `noUncheckedIndexedAccess`) | Types are the first line of defense; money has its own branded type                                                                                                                                                                                      |
| Redux Toolkit                                   | Small app state that crosses screens: the signed-in user and the transfer draft (step, amount, recipient, idempotency key)                                                                                                                               |
| axios + axios-hooks                             | One configured HTTP client and a hook per request with loading and error state; mutations are manual                                                                                                                                                     |
| Zod                                             | Validates request bodies and query strings, and the login and contact forms, with one schema on both sides                                                                                                                                               |
| Tailwind CSS                                    | Fast, consistent, responsive styling without custom CSS files                                                                                                                                                                                            |
| @tanstack/react-virtual                         | Renders only the visible rows of the movements list, so 10,000 movements stay fast                                                                                                                                                                       |
| Vitest + Testing Library                        | Unit and component tests                                                                                                                                                                                                                                 |
| Playwright + axe-core                           | End-to-end tests of the real flows and automatic WCAG 2.1 A/AA checks of the main screens. Chosen for its automatic waiting, its built-in web server, `page.route` to force failure scenarios and role-based locators (see [DECISIONS.md](DECISIONS.md)) |

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
- **End-to-end tests** are in `tests/e2e` (`npm run test:e2e`): login, home, the whole transfer flow up to the receipt, one test per failure scenario, and an accessibility check (axe) of the login, the Home and the transfer summary.

## Known limitations

- **State lives in memory.** Balance, movements, contacts and receipts are kept in the server process. Restarting the server resets them. The app is meant to run as one local process (`npm run dev` or `npm start`); on a serverless platform each instance would have its own copy, so it would need a database first.
- **The session is a mock.** The cookie holds a fixed token; there are no real users, passwords or per-user data.
- **One user.** Every receipt belongs to the demo user.
- **Contacts are not virtualized.** They are paginated with a "Load more" button and narrowed down by the server-side search.
- **Strict Mode in development** can send some requests twice; production does not.
- **`npm audit`** reports 5 high-severity advisories, all in development tooling (`braces`, reached through `eslint-config-next`). The production dependencies have none (`npm audit --omit=dev`). Forcing the suggested fix would downgrade `eslint-config-next` to an older major version, so it was left as is.
- **English only.** The interface text is in English and is not prepared for translation.

## Time spent

Approximate active time, including my own review of the code, testing in the browser and review of the UI. I worked in short sessions.

- Each phase: around 15-20 min.
- Code review: around 40 min.
- UI review: around 30 min.
- Final review: around 50 min.
- **Total: about 5-6 hours.**

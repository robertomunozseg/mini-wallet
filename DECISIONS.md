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
- Hooks (`useLogin`, `useConfirmTransfer`, `useAmountStep`, ...) own the state and the requests, and use the domain.
- The domain has no React or Next imports, so its rules are tested without a browser.

> My reasoning: _what this made easier to test and to change, and where I was tempted to put logic in a component._

## 3. Rendering strategy per page

| Page                     | Strategy                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                 | Static shell, client form                                                                                                                                   |
| `/home`                  | Server Component: balance and the first page of movements are rendered on the server (movements stream in through `Suspense`); more pages load from the API |
| `/transfer`              | Server Component reads the balance and renders a client flow                                                                                                |
| `/transfer/receipt/[id]` | Dynamic Server Component; `notFound()` when the receipt does not exist                                                                                      |

Server Components call the services directly instead of fetching their own API.

> My reasoning: _what each choice saves (an extra round trip, a loading flash) and what it costs._

## 4. Why Redux Toolkit and axios-hooks

- **Redux Toolkit** holds only app state that crosses screens: the signed-in user and the transfer draft (step, amount, recipient, idempotency key). The store is created per request, not as a global singleton.
- **axios-hooks** gives one configured client and a hook per request with loading and error state. Mutations are manual; the cache is off so balances are never stale.

> My reasoning: _why not local state only, why not RTK Query or React Query (see section 10)._

## 5. Where the business rules live

The transfer rules (amount above zero, amount not above the balance, recipient required) are one pure function, `validateTransfer`, in the domain.

- The **client** runs it for immediate feedback.
- The **server** runs it again and is the source of truth: it never trusts the client.
- Money is an integer number of cents with its own branded type, and is formatted only when shown.

> My reasoning: _why the same rule runs in two places, and why cents._

## 6. Errors and scenarios

- Every API error has the same shape: `{ error: { code, message } }`, with a closed list of codes.
- `mapApiError` turns any failure (HTTP error, timeout, no response) into one of those codes with a user-facing message.
- A transfer picks a scenario (success, network error, insufficient funds, timeout, unknown) at random, or the `x-mock-scenario` header forces it. Each one has its own screen and its own actions (retry, change amount, back to home).

> My reasoning: _why a uniform contract, why random scenarios with a way to force them._

## 7. Idempotency

- The client creates an `Idempotency-Key` when the user confirms and keeps it while the transfer is retried.
- The server stores definitive outcomes (success, insufficient funds) by key and returns the stored result on a retry, so a transfer is never debited twice.
- Transient failures (network error, timeout, unknown error) are not stored, so the retry can still succeed.
- Changing the amount or the recipient is a new intent, so the key is discarded.
- The store has a 24 h expiry and a maximum size.

> My reasoning: _what problem this prevents (a double tap, a retry after a timeout) and why failures are handled differently._

## 8. Edge cases considered

- Amounts: zero, negative, equal to the balance (allowed), balance plus one cent, decimals and thousands separators.
- Double submit: blocked while a request is in flight.
- Slow request: a "taking longer than usual" message after 3 seconds.
- Timeout: the message says the transfer may have been processed, and retrying is safe.
- Duplicate contacts and search ignoring accents ("garcia" finds "García").
- A list changing while the user pages through it (cursor pagination does not repeat or skip items).
- Leaving the transfer flow clears the draft; Back keeps it.
- Reloading a receipt, and opening a receipt that does not exist.

> My reasoning: _which of these surprised me while building, and which I would test first._

## 9. Built for scale (even with a mock)

- Cursor pagination, server-side search with debounce and request cancellation.
- Virtualized movements list; `memo`, `useCallback` and `useMemo` where they avoid real re-renders.
- `Cache-Control: private, no-store` on the API, and a bounded idempotency store.

> My reasoning: _why I prepared for millions of users in a mock, and what I measured._

## 10. What I would do differently with more time

- **Real database** instead of in-memory state, with transactions for the debit.
- **Real authentication** (sessions or tokens per user, password or provider login).
- **Observability**: structured logs, metrics and error tracking, with a request id.
- **i18n**: move the interface text out of the components.
- **RTK Query or React Query** for caching and request deduplication instead of axios-hooks.
- **Rate limiting** on login and transfers.
- **Feature flags** for the demo mode and the forced scenarios, instead of environment variables.

> My reasoning: _which of these I would do first and why._

# CLAUDE.md — Mini Wallet (Spin Web Challenge)

## Contexto
Challenge técnico de Spin: web app en **Next.js (App Router) + TypeScript** que simula una wallet financiera:
**Login → Home → Nueva transacción → Confirmación/Comprobante**. Datos mockeados mediante API Routes.
El sistema se evalúa como si operara con millones de usuarios: escalabilidad, mantenibilidad, tipado y manejo de errores.
El autor será entrevistado sobre este código y modificará partes en vivo: **prioriza código simple y explicable sobre código ingenioso.**

## Idioma
- Responde al usuario en **español**.
- Código, nombres de archivos, variables, tipos y mensajes de commit: **inglés**.
- Textos visibles en la UI: **Ingles**.
- README.md, DECISIONS.md, AI_USAGE.md: **español**.

## Stack (no cambiar sin preguntar)
- Next.js App Router, TypeScript `strict` + `noUncheckedIndexedAccess`
- Estado: **Redux Toolkit** (solo estado de app: sesión en UI y borrador de transferencia)
- Data fetching en cliente: **axios + axios-hooks** (`useAxios`, `manual: true` para mutaciones, `useCache: false`)
- Validación: **Zod** + funciones puras de dominio
- Estilos: Tailwind CSS
- Tests: Vitest + Testing Library (unit) · Playwright (e2e)
- Deploy: Vercel

## Arquitectura y reglas de capas
```
src/domain     → tipos, reglas de negocio puras, schemas Zod. SIN React ni Next.
src/server     → mock-db, sesión, simulador de escenarios, services. Solo para route handlers y Server Components.
src/app/api    → route handlers delgados: parsean, validan, llaman a services y responden.
src/lib        → instancia axios, configuración de axios-hooks, mapApiError.
src/store      → Redux Toolkit (makeStore por request, slices, hooks tipados).
src/features/* → componentes y hooks por feature (auth, home, transfer).
src/components/ui → componentes presentacionales reutilizables, sin lógica de negocio.
```
- Los componentes no contienen reglas de negocio: llaman a hooks; los hooks usan dominio, store y http.
- Las reglas de transferencia (`validateTransfer`) se ejecutan en el **cliente** (UX) y en el **servidor** (fuente de verdad).
- Los Server Components llaman a services directamente, no hacen `fetch` a la propia API.

## Convenciones
- Prohibido `any`. Usa `unknown` + narrowing, uniones discriminadas y `z.infer`.
- Dinero siempre en **centavos (number entero)**; formatear solo al mostrar (`formatMoney`, es-MX, MXN).
- Errores de API con contrato uniforme: `{ error: { code: ApiErrorCode, message: string } }`.
- Escenarios de transacción: `success | network_error | insufficient_funds | timeout | unknown_error`, aleatorios con pesos y forzables con el header `x-mock-scenario`.
- `POST /api/transactions` requiere el header `Idempotency-Key`; los reintentos reutilizan la misma key.
- Componentes: funciones, props tipadas con `type`, un componente por archivo, nombres PascalCase.
- Accesibilidad: labels en inputs, `role="alert"` en errores, navegación por teclado, selectores accesibles en tests.
- Sin `console.log` en el código entregado.
- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`), commits pequeños.

## Forma de trabajo
1. Antes de escribir código en una fase, **presenta un plan breve y espera aprobación**.
2. No instales dependencias nuevas sin preguntar.
3. Al terminar una tarea ejecuta: `npm run lint`, `npm run typecheck`, `npm run test`.
4. No hagas `git push` ni merges sin que el usuario lo pida.
5. No inventes contenido para AI_USAGE.md: solo da formato a las notas del usuario.
6. Si una decisión tiene trade-offs relevantes, explícalos en 2–3 líneas para que el usuario decida y pueda documentarlo en DECISIONS.md.

## Scripts
`dev` · `build` · `start` · `lint` · `typecheck` · `test` · `test:watch` · `test:e2e` · `format`

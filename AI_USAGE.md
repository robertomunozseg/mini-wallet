# Uso de IA

## Herramientas utilizadas

## Cómo se usó

### Prompts por fase

Prompts tal como se enviaron a Claude Code en cada fase. En todas se pidió primero un plan y se esperó aprobación antes de escribir código.

#### Fase 0 — Configuración del proyecto

```text
Lee CLAUDE.md. Estamos en la Fase 0 del challenge. Primero muéstrame un plan y espera mi aprobación.
Tareas:
1. Activa en tsconfig: "strict": true, "noUncheckedIndexedAccess": true, "noImplicitOverride": true.
2. Configura Vitest (vitest.config.ts con @vitejs/plugin-react, vite-tsconfig-paths, environment jsdom, setupFiles con @testing-library/jest-dom). Excluye tests/e2e.
3. Configura Playwright para usar webServer con "npm run dev" en el puerto 3000 y testDir tests/e2e. Solo chromium por ahora.
4. Agrega Prettier (.prettierrc) y scripts en package.json: dev, build, start, lint, typecheck (tsc --noEmit), test, test:watch, test:e2e, format.
5. Crea la estructura de carpetas vacía de CLAUDE.md (con .gitkeep donde haga falta).
6. Limpia el boilerplate de create-next-app (page.tsx y estilos de ejemplo).
7. Crea README.md, DECISIONS.md y AI_USAGE.md en español con sus secciones vacías (títulos).
8. Verifica que npm run lint, npm run typecheck, npm run test y npm run build pasen.
```

#### Fase 1 — Dominio

```text
Fase 1 (dominio). Primero plan, luego código. Todo en src/domain, sin dependencias de React ni Next.
1. types.ts: User, Account (balanceCents), Movement (id, type 'incoming'|'outgoing', amountCents, counterpartName, createdAt ISO, status), Contact (id, name, phoneOrEmail, isFavorite), TransferDraft, Transaction (id, amountCents, recipient, createdAt, status), Receipt.
   Usa branded types para Cents e ids si aporta claridad sin complicar.
2. money.ts: toCents(input: string): number | null (acepta "1,250.50"), fromCents, formatMoney(cents, 'MXN') con Intl.NumberFormat es-MX.
3. errors.ts: union ApiErrorCode = 'INVALID_CREDENTIALS' | 'VALIDATION_ERROR' | 'INSUFFICIENT_FUNDS' | 'NETWORK_ERROR' | 'TIMEOUT' | 'UNAUTHORIZED' | 'UNKNOWN_ERROR'; TransferValidationError = 'AMOUNT_REQUIRED' | 'AMOUNT_NOT_POSITIVE' | 'INSUFFICIENT_BALANCE' | 'RECIPIENT_REQUIRED'; tipo ApiErrorBody { error: { code, message } }.
4. Un tipo Result<T, E> discriminado (ok: true/false).
5. transfer-rules.ts: validateTransfer({ amountCents, balanceCents, recipient }) → Result<ValidTransfer, TransferValidationError[]> con las 3 reglas del challenge: monto > 0, monto <= saldo, destinatario obligatorio. Devuelve TODOS los errores, no solo el primero.
6. schemas.ts (Zod): loginSchema (identifier: email válido o teléfono MX de 10 dígitos, campo requerido), newContactSchema, transferRequestSchema. Exporta tipos inferidos con z.infer.
7. Tests unitarios en src/domain/__tests__ cubriendo bordes: 0, negativos, monto igual al saldo (permitido), saldo + 1 centavo, montos con decimales y comas, destinatario vacío, emails y teléfonos inválidos.
No uses any.
```

#### Fase 2 — Servidor

```text
Fase 2 (servidor). Primero plan.
1. src/server/mock-db.ts: datos en memoria (1 usuario demo, saldo 12,500.00 MXN en centavos, ~8 movimientos, 4 contactos con 3 favoritos). Funciones de acceso, no exportes el objeto mutable directo.
2. src/server/session.ts: cookie httpOnly "mw_session" (sameSite lax, secure en producción) con un token mock; getSession() lee la cookie con next/headers.
3. src/server/scenario.ts: resolveScenario(request) → 'success' | 'network_error' | 'insufficient_funds' | 'timeout' | 'unknown_error'. Si viene el header x-mock-scenario válido se usa; si no, aleatorio con pesos (success 60%, el resto 10% cada uno). Testeable inyectando el random.
4. src/server/services: accountService (getAccount, debit), contactService (list, create con validación Zod y detección de duplicados), transactionService.create(input, idempotencyKey): valida con validateTransfer del dominio (fuente de verdad), aplica el escenario, guarda resultado por idempotencyKey y devuelve el mismo resultado si se repite la key.
   - timeout: espera 10s antes de responder.
   - network_error: responde 503.
   - insufficient_funds: 422 con código INSUFFICIENT_FUNDS.
   - unknown_error: 500.
5. Route handlers en src/app/api: POST auth/login (loginSchema; si identifier es "fail@test.com" responde INVALID_CREDENTIALS para simular error; delay 600 ms), POST auth/logout, GET account, GET movements (soporta x-mock-scenario 'empty' y 'error'), GET/POST contacts, POST transactions (header Idempotency-Key obligatorio).
   Todas: 401 sin sesión (excepto login), contrato de error { error: { code, message } }, tipado del body de respuesta.
6. Tests unitarios de scenario.ts y transactionService (reglas en servidor, idempotencia, escenarios).
Documenta en comentarios breves por qué los delays existen.
```

## Qué se revisó y corrigió manualmente

## Reflexiones

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

#### Fase 3 — Store, http y UI base

```text
Fase 3. Primero plan.
1. Redux Toolkit para App Router: store.ts con makeStore() (un store por request, no singleton global), StoreProvider.tsx ('use client' con useRef), hooks.ts tipados (useAppDispatch, useAppSelector), RootState y AppDispatch.
2. sessionSlice: user | null, hydrate(user), clear(). transferSlice: step ('amount'|'recipient'|'summary'|'confirming'|'result'), amountCents, recipient, idempotencyKey, lastResult; acciones setAmount, setRecipient, goToStep, startConfirm (genera idempotencyKey con crypto.randomUUID si no existe), confirmSucceeded, confirmFailed, reset. Selectores memoizados (createSelector), incluido selectTransferValidation que use validateTransfer del dominio.
3. lib/http.ts: instancia axios (baseURL '/api', timeout 8000, withCredentials) y configure() de axios-hooks con defaultOptions { useCache: false } para no mostrar saldos o movimientos viejos.
4. lib/map-api-error.ts: convierte cualquier error (AxiosError con ECONNABORTED → TIMEOUT, sin response → NETWORK_ERROR, body con error.code → ese código, otro → UNKNOWN_ERROR) a { code: ApiErrorCode, message: string } con mensajes en español para el usuario.
5. components/ui: Button (variants, loading), Input (label, error, aria-invalid, aria-describedby), Card, Spinner, Skeleton, EmptyState, ErrorState (con onRetry). Accesibles y responsivos con Tailwind.
6. Tests: reducers y selectores de ambos slices, mapApiError con todos los casos, Button y ErrorState.
```

#### Fase 4 — Login

```text
Fase 4 (Login). Primero plan.
1. app/login/page.tsx (Client Component) con LoginForm en features/auth/components.
2. Un solo campo "Email o teléfono" que detecta el tipo; validación con loginSchema al hacer blur y al enviar; botón deshabilitado mientras carga.
3. features/auth/hooks/useLogin.ts: useAxios({ url: '/auth/login', method: 'POST' }, { manual: true }); expone { login, isLoading, error }; en éxito dispatch(hydrate(user)) y router.replace('/home').
4. Errores: credenciales inválidas (usar fail@test.com) y error de red, con mensaje claro y accesible (role="alert").
5. middleware (o proxy.ts si el proyecto usa Next 16+): sin cookie → redirect a /login para /home y /transfer/*; con cookie en /login → redirect a /home.
6. Logout en el header del layout (wallet): POST /auth/logout, dispatch(clear()), redirect.
7. Tests: LoginForm (validación, loading, error) y useLogin con axios mockeado.
```

#### Fase 5 — Home

```text
Fase 5 (Home). Primero plan.
1. app/(wallet)/home/page.tsx como Server Component: lee la sesión y obtiene usuario + saldo llamando accountService directamente (no fetch a /api). Pasa el usuario a un componente cliente que hidrata sessionSlice.
2. BalanceCard (nombre + saldo con formatMoney) y botón "Nueva transferencia" → /transfer.
3. MovementsList (Client Component) con features/home/hooks/useMovements.ts (useAxios GET /movements). Estados: cargando (Skeleton), vacío (EmptyState), error (ErrorState con reintentar = refetch), lista.
   MovementItem con icono de entrada/salida, monto con signo y color, fecha relativa.
4. home/loading.tsx (skeleton del saldo) y home/error.tsx (error boundary con reset).
5. Diseño responsivo mobile-first: una columna en móvil, dos en desktop (saldo | movimientos).
6. Tests: MovementsList en sus 4 estados y BalanceCard.
Para probar vacío/error en dev permite ?scenario=empty|error en la URL de la página, reenviado como header x-mock-scenario.
```

#### Fase 6 — Flujo de transferencia (sin confirmar)

```text
Fase 6 (flujo de transferencia, sin confirmar todavía). Primero plan.
1. app/(wallet)/transfer/page.tsx: Client Component que renderiza el paso según transferSlice.step, con indicador de pasos y botón "Atrás". Necesita el saldo: recíbelo del Server Component padre como prop.
2. AmountStep: input de monto con toCents, saldo disponible visible, errores inline AMOUNT_NOT_POSITIVE e INSUFFICIENT_BALANCE usando validateTransfer (mismas reglas que el servidor).
3. RecipientStep: favoritos primero (useContacts con useAxios GET /contacts), buscar en la lista, y "Nuevo contacto" con formulario (newContactSchema) que hace POST /contacts, muestra el contacto nuevo seleccionado y maneja errores. Estados de carga/vacío/error.
4. SummaryStep: monto, destinatario, saldo después de la transferencia; botón Confirmar deshabilitado si validateTransfer falla (RECIPIENT_REQUIRED, etc.).
5. Al salir del flujo o al terminar → dispatch(reset()).
6. Tests: AmountStep (reglas), RecipientStep (selección y alta de contacto), SummaryStep (botón deshabilitado sin destinatario).
```

#### Solicitud adicional — Preparar la app para alto volumen

Mensajes que envié a Claude Code después de la Fase 6, tal cual, a partir del contexto del challenge (millones de usuarios activos, escalabilidad y mantenibilidad).

```text
una duda se puede agregar el uso de debounce en la busqueda de contactos? o duda la lista de contactos vienen de una api? me ha tocado en examenes de React que me piden agregar debounce en el input search, hasta que digamos ya escribio haga la busqueda? es solo duda que me recomiendas

si puedes leer el contexto mencionan lo siguiente -> Contexto: El sistema opera en un entorno de alto volumen con millones de
usuarios activos. Tus decisiones de diseño deben considerar escalabilidad y
mantenibilidad.

si me gustaría dejarlo preparado de una vez para millones de usuarios , usar tecnicas de performance, que me sugieres?

1. una sola rama, 2. si 3. si autorizo react-virtual  4. cual me recomiendas?

ok si lo más real que se pueda presentar aunque sea mock pero me servira para el challenge , performance, virtualizacion, hooks usecallback, usememo memo, debounce
```

#### Fase 7 — Confirmación de la transferencia

```text
Fase 7 (confirmación). Primero plan.
1. features/transfer/hooks/useConfirmTransfer.ts: useAxios manual POST /transactions con header Idempotency-Key = transferSlice.idempotencyKey. Expone confirm(), retry(), state. Evita doble submit.
2. ConfirmationResult con UI por escenario, usando mapApiError:
   - success → router.push(`/transfer/receipt/${id}`)
   - NETWORK_ERROR → mensaje + "Reintentar" (MISMA idempotency key)
   - INSUFFICIENT_FUNDS → error descriptivo + "Cambiar monto" (vuelve a AmountStep)
   - TIMEOUT → "La operación tardó demasiado; puede que se haya procesado" + "Reintentar" (misma key, el servidor no duplica) + "Volver al inicio"
   - UNKNOWN_ERROR → fallback genérico + volver al inicio
   Mientras confirma: spinner y texto "Procesando…". Si tarda más de 3s, mensaje "Esto está tardando más de lo normal".
3. app/(wallet)/transfer/receipt/[id]/page.tsx (Server Component): obtiene la transacción del service; muestra folio, fecha, monto, destinatario, nuevo saldo; botones "Volver al inicio" y "Nueva transferencia"; notFound() si no existe o no pertenece al usuario.
4. Modo demo opcional: si NEXT_PUBLIC_DEMO_MODE === 'true', muestra en SummaryStep un select "Escenario simulado" (aleatorio por defecto) que envía x-mock-scenario. Útil para que los evaluadores vean todos los casos.
5. Tests: useConfirmTransfer en los 5 escenarios (axios mockeado) y que retry reutiliza la misma idempotency key.
```

## Qué se revisó y corrigió manualmente

### Cambios que pedí respecto a lo propuesto o a mis prompts

Cada punto indica qué pedí cambiar y por qué. Cuando la razón la propuso Claude y yo la acepté, se indica.

| Fase | Qué pedí cambiar | Por qué |
|---|---|---|
| 3 | Mensajes de error de `mapApiError` en **inglés** (mi prompt los pedía en español). | Toda la UI (botones, textos y mensajes) va en inglés, según el CLAUDE.md del proyecto. Con mensajes en español la UI quedaría mezclada. |
| 4 | `login/page.tsx` como **Server Component** que renderiza `LoginForm` (mi prompt decía Client Component). | Razón propuesta por Claude y aceptada: el comportamiento es el mismo y así la página puede exportar `metadata` (título "Sign in"). `LoginForm` sigue siendo Client Component. |
| 5 | `?scenario=empty\|error` habilitado en **todos los entornos**, no solo en dev (mi prompt decía "en dev"). | Pregunté cómo dejarlo para Vercel. Razón propuesta por Claude y aceptada: el header `x-mock-scenario` ya funciona contra la API en cualquier entorno y solo acepta `empty` y `error`, así quien revise el deploy puede ver esos estados. |
| 5 (ajuste posterior) | Home en **dos columnas desde 768 px** (`md`) en vez de 1024 px (`lg`). | Pregunté si la app funcionaba en tablets. Claude observó que en tablets en vertical la tarjeta de saldo se estiraba a todo el ancho con mucho espacio vacío, y pedí ajustarlo. Verificado a 768, 820 y 1024 px: sin scroll horizontal y con un saldo muy grande (`$99,999,999.99`) cabe en la columna más angosta. |
| 6 | `transfer/page.tsx` como **Server Component** que lee el saldo y renderiza `TransferFlow` (mi prompt decía Client Component que recibe el saldo del padre). | Razón propuesta por Claude y aceptada: un `page.tsx` de cliente no puede recibir props de su padre, y leer el saldo requiere el servidor. Mismo patrón que el login. |
| 6 | El botón **Confirm** del resumen llama a `startConfirm()` y muestra un aviso temporal, en vez de quedar deshabilitado o sin efecto. | Razón propuesta por Claude y aceptada: un botón habilitado que no hace nada confunde, y deshabilitado siempre impediría probar el camino feliz. La Fase 7 reemplaza el aviso. |
| 6 | `mapApiError` muestra el **mensaje del servidor** cuando el código es `VALIDATION_ERROR` (en la Fase 3 nunca se mostraba). | Razón propuesta por Claude y aceptada: sin esto, un contacto duplicado mostraría el texto genérico "Some of the information you entered is not valid." y el usuario no sabría qué corregir. El resto de códigos sigue con texto fijo. |
| Extra | La búsqueda de contactos pasa a hacerse en el **servidor, con debounce**, en vez de filtrar en el navegador una lista completa (mi Fase 6 pedía "buscar en la lista"). | Pregunté si convenía un debounce. Claude explicó que con el filtro local no servía de nada, pero que el contexto del challenge (millones de usuarios activos) hace que descargar toda la agenda no escale, así que la búsqueda debe ir al servidor, y ahí el debounce sí tiene sentido. |
| Extra | **Paginación por cursor** en movimientos y contactos, con "Load more" en contactos y scroll infinito en movimientos (antes `GET /movements` devolvía todo). | Mismo motivo: acotar el tamaño de las respuestas y del DOM. Pedí dejarlo "preparado de una vez" para alto volumen. |
| Extra | **Virtualización** de la lista de movimientos con `@tanstack/react-virtual`; autoricé instalar esa dependencia. | Quería usar técnicas de rendimiento reales y poder explicarlas en la entrevista. Claude recomendó virtualizar solo movimientos (los contactos son un grupo de radios, y la búsqueda ya acota la lista). |
| Extra | La **primera página de movimientos se carga en el servidor** (Server Component dentro de `Suspense`) y las demás por API. | Aprobé la propuesta de Claude para quitar la cascada HTML → JS → petición. Cambia el diseño de la Fase 5, donde la lista pedía todo con `useAxios`. |
| Extra | Uso explícito de `memo`, `useCallback` y `useMemo` donde tienen efecto medible, y carga diferida de `NewContactForm`. | Lo pedí para poder mostrarlo en el challenge. Claude los aplicó solo donde evitan re-renders (filas de lista, opciones de contacto) y lo comprobó con tests que cuentan renders. |
| Extra | Dataset grande bajo demanda con `x-mock-scenario: large` (10 000 movimientos y 5 000 contactos), en vez de un script aparte. | Pregunté cuál recomendaba. Razón de Claude, aceptada: reutiliza un mecanismo ya probado, funciona también en el deploy de Vercel y es determinista. Solo afecta a las lecturas. |
| Extra | Memoria de idempotencia acotada (TTL de 24 h y máximo de 10 000 claves) y `Cache-Control: private, no-store` en la API. | Parte del mismo paquete de preparación para alto volumen aprobado en "una sola rama". |
| 7 | Quitar las acciones `confirmSucceeded` y `confirmFailed` (y `lastResult` y el paso `result`) del `transferSlice`. | Claude lo recomendó y lo acepté: el estado de la petición (procesando, error, éxito) vive en `useConfirmTransfer`, así que esas acciones quedaban sin uso y habría código muerto. |
| 7 (ajuste posterior) | En el paso de destinatario: botón **`+` junto al buscador** para crear un contacto (antes un botón "New contact" de ancho completo debajo de la lista), el formulario se abre justo bajo el buscador, y **"Continue" queda en una barra fija** al fondo. | Con una pantalla grande tenía que hacer scroll para llegar al botón azul y "New contact" se confundía con "Continue" (dos botones de ancho completo, juntos). Pedí ideas antes de cambiar nada; Claude propuso las opciones A–H y elegí la E (botón `+`) y acepté su recomendación de añadir la A (barra fija). |
| 7 (segundo ajuste) | El **scroll pasa a la lista de contactos** (que incluye el formulario de nuevo contacto) y la página ya no se desplaza; además un **hover más visible** (borde y fondo azul claro) en los botones secundarios, empezando por el `+`. | Seguía teniendo mucho espacio en pantalla y no me gustaba el scroll de toda la página; le pedí a Claude poner el scroll en el listado u otra mejor idea. El hover gris del botón `+` casi no se notaba. |

## Reflexiones

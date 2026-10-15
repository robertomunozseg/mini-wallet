# Uso de IA

## 1. Herramientas utilizadas y en qué partes

| Herramienta   | Dónde se usó                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Claude Code   | Escribir el código (dominio, servidor, API, interfaz), las pruebas unitarias y e2e, y los borradores de README y DECISIONS. |
| MCP de GitHub | Crear el repositorio y abrir y mezclar los pull requests de cada fase.                                                      |

Trabajé por fases. En cada una le pedí a Claude un plan, lo revisé y lo aprobé antes de que escribiera código, y al terminar revisé el resultado, lo probé en mi equipo y lo integré mediante un pull request.

| Fase  | Qué se desarrolló                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Configuración del proyecto: TypeScript estricto, pruebas, formato y estructura de carpetas.                                            |
| 1     | Reglas del negocio: dinero, validación de transferencias y de formularios.                                                             |
| 2     | Servidor simulado: datos de ejemplo, sesión, escenarios de error e idempotencia.                                                       |
| 3     | Base de la interfaz: estado de la app, comunicación con el servidor y componentes visuales.                                            |
| 4     | Inicio de sesión, protección de las pantallas y cierre de sesión.                                                                      |
| 5     | Pantalla de inicio con el saldo y los movimientos.                                                                                     |
| 6     | Flujo de nueva transferencia: monto, destinatario y resumen.                                                                           |
| Extra | Preparación para muchos usuarios: listas paginadas, búsqueda de contactos con retraso al escribir y lista de movimientos virtualizada. |
| 7     | Confirmación de la transferencia, manejo de cada escenario de error y comprobante.                                                     |
| 8     | Pruebas de extremo a extremo de los flujos principales.                                                                                |
| 9     | Revisión del código, pruebas de accesibilidad y documentación (README y DECISIONS).                                                    |
| 10    | Revisión final contra el enunciado del challenge.                                                                                      |

## 2. Qué acepté directamente y qué corregí o rechacé

### Acepté directamente

- Los planes de cada fase, después de revisarlos.
- Las recomendaciones de Claude cuando me explicó el motivo, por ejemplo: dejar `?scenario=empty|error` activo en todos los entornos, quitar del estado de la transferencia las acciones que ya no se usaban, el botón "+" para crear contactos y la barra fija con "Continue", hacer el login de las pruebas e2e por API, y la revisión de accesibilidad con una herramienta automática.
- Mis prompts de las fases 4 y 6 pedían pantallas de cliente (Client Component) para el login y la transferencia; acepté la corrección de Claude a Server Component, porque así la página puede leer el saldo y exportar su título.

### Corregí o rechacé

- Pedí **toda la interfaz en inglés**, aunque mi primer prompt pedía mensajes en español.
- Rechacé la opción de **avanzar sola al elegir un contacto**, que Claude descartó por el riesgo de pulsaciones accidentales.
- Decidí **no cambiar el servidor de las pruebas e2e**, aunque Claude recomendaba uno propio, hasta hacer más comprobaciones.
- Pedí **quitar el scroll de toda la página** y un **color más visible al pasar el cursor** por el botón "+".
- Reporté fallos que Claude corrigió: un **error de hidratación** y el **Home que se recargaba sin parar**.
- Detecté movimientos repetidos de "Ana García" y pedí revisarlos: eran de las pruebas automáticas, no un error de la app.
- Probando el diseño responsivo en las herramientas del navegador vi que en celular el scroll era de toda la página y no de la lista de movimientos; pedí revisarlo antes de cambiar nada y aprobé el ajuste.

## 3. Decisiones que tomé yo

- **La pila y la arquitectura**: Next.js con App Router, Redux Toolkit, axios y axios-hooks, Zod, Tailwind, Vitest y Playwright, y la separación en capas. Las definí en el `CLAUDE.md` del proyecto antes de empezar.
- **Las fases**, su orden y el alcance de cada una, y aprobar cada plan antes de que se escribiera código.
- **Preparar la app para millones de usuarios**, y autorizar dependencias adicionales como `@tanstack/react-virtual` y `@axe-core/playwright`.
- **Idioma:** interfaz y documentos en inglés, y AI_USAGE en español.
- **Qué dejar para el final** (los ajustes de documentación) y **no desplegar la app en Vercel** por ahora, para no depender de una versión demo ni de una base de datos.

## Reflexiones

La IA me ahorró mucho tiempo escribiendo código, pero no me quitó el trabajo de revisarlo. Lo que más me sirvió fue pedir siempre un plan antes del código: así pude decidir yo, por ejemplo descartar que el contacto avanzara solo al elegirlo, o dejar el servidor de las pruebas como estaba.

Varias cosas las encontré yo al probar la app, no las vio la IA: un error de hidratación, el Home que se recargaba sin parar, los movimientos repetidos de "Ana García" (venían de las pruebas automáticas) y, en mi pantalla grande, el scroll de toda la página y el botón "New contact" que se confundía con "Continue". También me enseñó que una prueba puede ser el problema y no el código: una fallaba una de cada tres veces porque llenaba el formulario antes de que la página estuviera lista.

Probar un clon limpio del repositorio me mostró algo que en mi equipo no se veía: el typecheck fallaba hasta que Next generaba sus tipos.

Lo que haría distinto es decidir desde el primer prompt el idioma de la interfaz, porque lo tuve que cambiar a inglés después. En un punto también dudé de si eran demasiados archivos y pedí revisarlo antes de seguir. Lo que entra en el proyecto y lo que no lo decido yo, y por eso en cada fase leí el plan antes de aprobarlo.

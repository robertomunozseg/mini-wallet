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
- Las recomendaciones de Claude cuando me explicó el motivo, como el botón "+" para crear contactos o hacer el login de las pruebas e2e por API.
- Cambiar mis prompts de las fases 4 y 6 de Client Component a Server Component, para que la página pueda leer el saldo y exportar su título.

### Corregí o rechacé

- Pedí **toda la interfaz en inglés**, aunque mi primer prompt pedía mensajes en español.
- Rechacé que el contacto **avanzara solo al elegirlo**, por el riesgo de pulsaciones accidentales.
- Decidí **no cambiar el servidor de las pruebas e2e**, aunque Claude recomendaba uno propio.
- Pedí **ajustes de interfaz** al probar la app: quitar el scroll de toda la página (en escritorio, celular y laptop) y que los botones se vean grises cuando no están disponibles, pero que sigan mostrando los errores al pulsarlos.
- Reporté fallos que Claude corrigió: un **error de hidratación**, el **Home que se recargaba sin parar** y el botón **"Back" que quedaba deshabilitado** en la segunda transferencia.
- Detecté movimientos repetidos de "Ana García" y pedí revisarlos: eran de las pruebas automáticas, no un error de la app.

## 3. Decisiones que tomé yo

- **La pila y la arquitectura**: Next.js con App Router, Redux Toolkit, axios y axios-hooks, Zod, Tailwind, Vitest y Playwright, y la separación en capas. Las definí en el `CLAUDE.md` del proyecto antes de empezar.
- **Las fases**, su orden y el alcance de cada una, y aprobar cada plan antes de que se escribiera código.
- **Preparar la app para millones de usuarios**, y autorizar dependencias adicionales como `@tanstack/react-virtual` y `@axe-core/playwright`.
- **Idioma:** interfaz y README en inglés; DECISIONS y AI_USAGE en español.
- **Qué dejar para el final** (los ajustes de documentación) y **no desplegar la app en Vercel** por ahora, para no depender de una versión demo ni de una base de datos.

## Reflexiones

La IA me ahorró mucho tiempo escribiendo código, pero no me quitó el trabajo de revisarlo.
Pedir un plan antes del código me dejó decidir a mí.

Varias cosas las encontré yo al probar la app y no las vio la IA, como el error de hidratación, el Home en bucle y el scroll de toda la pantalla.
Una prueba también puede ser el problema y no el código: una fallaba una de cada tres veces.

Lo que haría distinto es definir la interfaz desde el principio: el idioma y cómo se ven los botones.
Un cambio de interfaz puede tocar varios archivos a la vez, y me pasó con los botones deshabilitados cuando no se cumplen las validaciones.

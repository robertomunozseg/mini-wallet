# Uso de IA

## Herramientas utilizadas

Claude Code (asistente de programación en el editor).

## Cómo se usó

Trabajé por fases. En cada una le pedí a Claude un plan, lo revisé y lo aprobé antes de que escribiera código, y al terminar revisé el resultado, lo probé en mi equipo y lo integré mediante un pull request.

## Qué se desarrolló en cada fase

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
| 9     | Revisión del código y documentación (README y DECISIONS).                                                                              |

## Dónde intervine yo

- Pedí que **toda la interfaz estuviera en inglés**, aunque mi primer prompt pedía mensajes en español.
- Pregunté si la app funcionaba en **tablets** y pedí ajustar el diseño en ese tamaño.
- Pregunté por el **retraso al escribir en la búsqueda** (debounce) y pedí dejar la app preparada para **millones de usuarios**, con técnicas reales de rendimiento.
- Reporté dos fallos que Claude corrigió: un **error de hidratación** y el **Home que se recargaba sin parar**.
- Pedí **ideas antes de cambiar la interfaz** del destinatario y elegí un botón "+" para crear contactos y que solo se desplace la lista, no toda la página.
- Pedí **quitar el scroll innecesario** de toda la pantalla y un **color más visible al pasar el cursor** por el botón "+".
- Detecté movimientos repetidos de "Ana García" y pedí revisarlos: eran de las pruebas automáticas, no un error de la app.
- Decidí **no cambiar el servidor de las pruebas** hasta hacer más comprobaciones.
- Dejé para el final los ajustes de documentación y de despliegue.
- Pedí una **revisión completa del código** (código muerto, lógica en los componentes, accesibilidad) y autoricé instalar una herramienta de pruebas de accesibilidad.

## Reflexiones

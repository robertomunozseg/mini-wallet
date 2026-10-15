# Decisiones de diseño

Aquí cuento cómo armé el proyecto y por qué, sin entrar en cada archivo. El código tiene comentarios donde el detalle importa.

## 1. Cómo organicé el proyecto

Separé el código por responsabilidad, no por tipo de archivo. Los datos van en una sola dirección:

```
domain → server/services → app/api → hooks (features) → componentes
```

- **`domain`**: tipos, reglas de negocio y esquemas de Zod. Es TypeScript puro, sin React ni Next, así que se prueba sin navegador.
- **`server`**: la base de datos simulada, la sesión, los escenarios y los servicios.
- **`app/api`**: rutas delgadas que validan la petición, llaman a un servicio y responden.
- **`features`**: una carpeta por pantalla (auth, home, transfer) con sus componentes y hooks.
- **`components/ui`**: piezas visuales reutilizables, sin lógica de negocio.

La regla que me puse: los componentes pintan y llaman a hooks; los hooks guardan el estado y hacen las peticiones; las reglas viven en el dominio. En el paso del destinatario, por ejemplo, la lógica creció dentro del componente y la pasé a un hook (`useRecipientStep`).

Me preocupó tener muchos archivos pequeños. Los dejé porque cada uno tiene una sola razón para cambiar, y es más fácil modificar algo en vivo si sabes dónde está.

## 2. Renderizado y API Routes

| Pantalla                 | Cómo se renderiza                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `/login`                 | Cascarón estático con formulario de cliente                                                                               |
| `/home`                  | Componente de servidor: saldo y primera página de movimientos llegan ya renderizados; las demás páginas se piden a la API |
| `/transfer`              | El servidor lee el saldo y entrega un flujo de cliente                                                                    |
| `/transfer/receipt/[id]` | Componente de servidor dinámico; `notFound()` si el recibo no existe                                                      |

Los componentes de servidor llaman a los servicios directamente, sin hacer `fetch` a su propia API. Así la primera pantalla sale sin la cascada HTML, JavaScript y petición.

Todas las mutaciones pasan por **route handlers** (login, nuevo contacto, transferencia), porque el reto pide API Routes y un contrato HTTP simple se prueba fácil con el navegador, `curl` o Playwright. También permite forzar un escenario con un header. No usé Server Actions; en un proyecto real las consideraría para formularios que deban funcionar sin JavaScript. Los servicios son funciones normales, así que una Server Action podría llamar a los mismos.

## 3. Estado y datos: Redux Toolkit y axios-hooks

- **Redux Toolkit** guarda solo lo que cruza pantallas: el usuario y el borrador de la transferencia (paso, monto, destinatario y la clave de idempotencia). Cada árbol de React crea su propio store.
- **axios-hooks** da un cliente configurado y un hook por petición, con carga y error. Las mutaciones son manuales y la caché está apagada para no mostrar saldos viejos.

El resultado de cada petición vive en su hook, no en Redux: así el store se queda pequeño.

## 4. Dónde viven las reglas de negocio

Las tres reglas (monto mayor a cero, no superar el saldo, destinatario obligatorio) son una sola función pura, `validateTransfer`, en el dominio.

- **El cliente** la usa para avisar al instante, sin esperar al servidor.
- **El servidor** la ejecuta otra vez y es la fuente de verdad: nunca confía en lo que llega del navegador.

El dinero se guarda en **centavos enteros** con su propio tipo, y solo se formatea al mostrarlo. Así evito errores de decimales.

## 5. Errores, escenarios e idempotencia

Todos los errores de la API tienen la misma forma, `{ error: { code, message } }`, con una lista cerrada de códigos. `mapApiError` convierte cualquier fallo (HTTP, timeout, sin respuesta) en uno de esos códigos con un mensaje para el usuario.

Cada confirmación elige un escenario al azar (éxito, error de red, fondos insuficientes, timeout o error desconocido), o se fuerza con el header `x-mock-scenario`. Cada uno tiene su pantalla y sus acciones: reintentar, cambiar el monto o volver al inicio.

Para que reintentar sea seguro, cada transferencia lleva una **`Idempotency-Key`**:

- El cliente la crea al confirmar y la conserva mientras reintenta.
- El servidor guarda los resultados definitivos (éxito y fondos insuficientes) y los devuelve si la clave se repite, así que nunca se cobra dos veces.
- Los fallos pasajeros (red, timeout, error desconocido) no se guardan, para que el reintento pueda salir bien.
- Cambiar el monto o el destinatario es una intención nueva, así que la clave se descarta.
- El almacén caduca a las 24 horas y tiene un máximo de 10 000 claves.

## 6. Casos límite que consideré

- Montos: cero, negativos, igual al saldo (permitido), saldo más un centavo, decimales y comas.
- Doble clic al confirmar: se bloquea mientras la petición está en vuelo.
- Petición lenta: tras 3 segundos aparece "This is taking longer than usual".
- Timeout: el mensaje avisa que la transferencia pudo haberse procesado, y reintentar es seguro.
- Contactos duplicados, y búsqueda sin acentos ("garcia" encuentra "García").
- Una lista que cambia mientras se pagina: la paginación por cursor no repite ni salta elementos.
- Salir del flujo borra el borrador; Back lo conserva.
- Recargar un recibo, y abrir uno que no existe.

## 7. Permisos y sesión

`proxy.ts` es la primera barrera: sin cookie de sesión válida, `/home` y `/transfer/*` redirigen a `/login`. Pero un redirect se puede esquivar, así que la comprobación real está en el servidor: cada ruta de la API, salvo el login, responde `401` sin sesión, y el layout protegido y el recibo verifican la sesión otra vez. La cookie es `httpOnly`, `sameSite=lax` y `secure` en producción.

Como el mock tiene un solo usuario, no se comprueba de quién es cada recibo. Con usuarios reales se compararía con su dueño.

## 8. Escala sin pasarme

El reto pide a la vez "millones de usuarios" y "sin sobre-ingeniería". Lo mínimo eran las pantallas, las tres reglas y los escenarios. Añadí a propósito lo que cambia de verdad con mucho volumen, aunque los datos sean simulados:

- Paginación por cursor y búsqueda en el servidor con retraso al escribir y cancelación de peticiones.
- Lista de movimientos virtualizada, y `memo`, `useCallback` y `useMemo` donde evitan renders reales.
- Almacén de idempotencia acotado y `Cache-Control: private, no-store` en la API.

Eso cuesta más código y una dependencia (`@tanstack/react-virtual`). Me detuve ahí: sin base de datos, sin capa de caché, y los contactos se paginan pero no se virtualizan.

## 9. Pruebas

| Capa                 | Qué se prueba                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Dominio              | Funciones puras: reglas de transferencia, dinero, paginación, esquemas                                                              |
| Servicios            | Reglas en el servidor, idempotencia y cada escenario; el reloj, los ids y la espera se inyectan, así no hay que esperar 10 segundos |
| Hooks                | Con axios y axios-hooks reales sobre una red falsa                                                                                  |
| Componentes críticos | Formularios, cada paso de la transferencia y la pantalla de cada resultado                                                          |
| Extremo a extremo    | Login, Home, la transferencia completa, cada escenario de fallo y la accesibilidad de cada pantalla                                 |

Para los e2e usé **Playwright** (Cypress también habría servido) porque espera por sí solo a los elementos, levanta la app con `webServer`, permite forzar un fallo con `page.route` añadiendo el header a la petición real, tiene fixtures para reutilizar el login y sus localizadores por rol empujan a mantener el HTML accesible. También lo integré con axe para revisar la accesibilidad.

Lo que sé que es débil: solo se corre Chromium, y las pruebas comparten los datos en memoria del servidor, por eso evitan comprobar saldos exactos. Además, un formulario llenado justo después de cargar la página puede perder lo escrito antes de que React la active, así que esas interacciones se reintentan hasta que funcionan.

## 10. Accesibilidad y diseño responsivo

- Cada campo tiene su etiqueta, los errores usan `role="alert"`, todo se puede usar con teclado, y el primer Tab lleva a "Skip to content". Cada página tiene su título.
- Los botones de un formulario incompleto se ven grises pero siguen pudiéndose pulsar, para que el usuario reciba el mensaje de qué falta.
- Una revisión automática con axe (WCAG 2.1 A y AA) corre en cada pantalla dentro de los e2e.
- El diseño se acomoda a la altura de la ventana: la lista se desplaza por dentro y la página no, y en ventanas bajas (como una laptop con escala del 150 %) se compactan los espacios. En celular, las tarjetas se apilan y la lista de movimientos se queda con el espacio que sobra.

Lo que no cubre una revisión automática es cómo suena con un lector de pantalla de verdad.

## 11. Qué haría con más tiempo

- **Base de datos real**, con transacciones para el débito, en lugar del estado en memoria.
- **Autenticación real**: sesiones por usuario, contraseña o proveedor externo.
- **Observabilidad**: registros estructurados, métricas y seguimiento de errores, con un id por petición.
- **Traducciones**: sacar los textos de los componentes.
- **RTK Query o React Query** para caché y evitar peticiones repetidas, en lugar de axios-hooks.
- **Límite de peticiones** en login y transferencias.
- **Feature flags** para el modo demo y los escenarios forzados, en lugar de variables de entorno.

# Decisiones de diseño

## 1. Estructura

Separé el código por responsabilidad, no por tipo de archivo.
Los datos van en una sola dirección: `domain → server/services → app/api → hooks → componentes`.

- `domain`: reglas de negocio, tipos y esquemas. TypeScript puro, sin React ni Next.
- `server`: datos simulados, sesión, escenarios y servicios.
- `app/api`: rutas delgadas que validan, llaman a un servicio y responden.
- `features`: una carpeta por pantalla, con sus componentes y hooks.
- `components/ui`: piezas visuales sin lógica.

Los componentes pintan, los hooks manejan estado y peticiones, y las reglas viven en el dominio.
Me preocupó tener muchos archivos pequeños, pero cada uno cambia por una sola razón y es fácil saber dónde tocar.

## 2. Renderizado y API Routes

- `/home` y `/transfer` leen sus datos en el servidor, así la primera pantalla sale sin esperas extra.
- `/login` es estático con un formulario de cliente, y el recibo es dinámico.
- Las mutaciones pasan por route handlers, porque el reto pide API Routes y así es fácil probarlas y forzar escenarios con un header.
- No usé Server Actions. Las consideraría para formularios que deban funcionar sin JavaScript.

## 3. Estado y datos

- Redux Toolkit guarda solo lo que cruza pantallas: el usuario y el borrador de la transferencia.
- axios-hooks da un hook por petición, con carga y error, y la caché apagada para no mostrar saldos viejos.

## 4. Reglas de negocio y permisos

Las tres reglas son una sola función pura, `validateTransfer`.
El cliente la usa para avisar al instante, y el servidor la repite y es la fuente de verdad.
El dinero va en centavos enteros para evitar errores de decimales.

`proxy.ts` es la primera barrera, pero un redirect se puede esquivar.
Por eso el servidor comprueba la sesión en cada ruta de la API y en las páginas protegidas.

## 5. Errores e idempotencia

- Todos los errores de la API tienen la forma `{ error: { code, message } }`, y `mapApiError` convierte cualquier fallo en uno de esos códigos.
- Cada confirmación elige un escenario al azar, o se fuerza con el header `x-mock-scenario`.
- Cada transferencia lleva una `Idempotency-Key` que se conserva al reintentar, para que nunca se cobre dos veces.
- Solo se guardan los resultados definitivos, así que un fallo de red o un timeout se pueden reintentar.

## 6. Casos límite

- Monto cero, negativo, igual al saldo y saldo más un centavo.
- Doble clic al confirmar y petición lenta (aviso a los 3 segundos).
- Un timeout avisa que la transferencia pudo procesarse, y reintentar es seguro.
- Contactos duplicados, búsqueda sin acentos y listas que cambian mientras se paginan.
- Recargar un recibo, o abrir uno que no existe.

## 7. Escala sin pasarme

El reto pide "millones de usuarios" y a la vez "sin sobre-ingeniería".
Añadí solo lo que cambia con mucho volumen: paginación por cursor, búsqueda en el servidor, lista virtualizada y un almacén de idempotencia con límite.
Me detuve ahí: sin base de datos ni capa de caché.

## 8. Pruebas

- Pruebas unitarias del dominio, los servicios, los hooks y los componentes críticos.
- Pruebas e2e con Playwright de cada flujo y de cada escenario de fallo.
- Elegí Playwright (Cypress también servía) porque espera solo a los elementos, levanta la app y fuerza fallos con `page.route`.
- Lo débil: solo corre en Chromium y las pruebas comparten los datos en memoria del servidor.

## 9. Accesibilidad y diseño responsivo

- Etiquetas en los campos, errores con `role="alert"`, teclado completo y un enlace para saltar al contenido.
- Los botones de un formulario incompleto se ven grises pero siguen mostrando qué falta al pulsarlos.
- Una revisión con axe corre en cada pantalla dentro de los e2e.
- La lista se desplaza por dentro y la página no, incluso en una laptop con escala del 150 %.

## 10. Con más tiempo

Base de datos real, autenticación real, observabilidad, traducciones, React Query o RTK Query, límite de peticiones, feature flags, react hook form o formik.

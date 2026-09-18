# (sin card) — Navegación por pantallas: Depósitos → Ubicaciones → Detalle

## Implemented

- La pantalla de Ubicaciones era una sola vista con selector de depósito + lista + panel lateral (todo sin cambiar de URL). El usuario pidió explícitamente 3 pantallas separadas navegables: entrar a un depósito para ver sus ubicaciones, y entrar a una ubicación para ver el detalle completo con sus productos.
- Rutas nuevas: `/ubicaciones` (lista de depósitos), `/ubicaciones/[warehouseId]` (ubicaciones del depósito, con alta/edición), `/ubicaciones/[warehouseId]/[locationId]` (detalle: código/pasillo/rack/nivel, contenido completo y asignar/reasignar producto directamente a esa ubicación). Cada pantalla tiene link de "volver" a la anterior.
- `location-manager.tsx` (monolítico) se eliminó; se dividió en `warehouse-list.tsx`, `location-list.tsx`, `location-detail.tsx` y un `location-ui.tsx` compartido (íconos, diálogo de alta/edición, selector de rol). Contrato y API (`location-contract.ts`, `location-api.ts`) no cambiaron.

## Verification

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | PASS — 41 tests, build genera `/ubicaciones`, `/ubicaciones/[warehouseId]` y `/ubicaciones/[warehouseId]/[locationId]` |
| `curl` contra `next dev` real | `/ubicaciones`, `/ubicaciones/1`, `/ubicaciones/1/999` → 200 (el caso de ubicación inexistente lo maneja el estado "no disponible", no un crash) |

# (sin card) — Ver el contenido de cada ubicación

## Implemented

- La pantalla ya permitía asignar un producto a una ubicación, pero no había forma de ver lo inverso: qué hay en una ubicación dada. El usuario lo marcó como prioritario ("no le podemos errar acá").
- Backend (`superx_back` `e444843`): `GET /warehouses/:id/locations` ahora trae `products: [{id,name,slug}]` embebido en cada ubicación (una sola query batched para todo el depósito, no N+1).
- Backoffice: el listado de ubicaciones muestra ahora una línea con los productos guardados ahí (o "Vacía"); el panel de detalle lista los productos completos bajo "Productos en esta ubicación". Tipo nuevo `WarehouseLocationWithProducts` separado de `WarehouseLocation` (el que se usa en la asignación individual no trae ni necesita esta lista).

## Verification

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | PASS — 41 tests |
| Manual contra backend real | `GET /warehouses/1/locations` devuelve cada ubicación con sus productos reales asignados; verificado que coincide con lo que va a renderizar la pantalla |

# (sin card) — Ubicaciones de depósito

## Implemented

- Incorporé `/ubicaciones` al backoffice, junto a Inventario, con selector de depósito, listado/detalle de ubicaciones y formulario reutilizable para alta y edición.
- Agregué la asignación de producto a ubicación por depósito: búsqueda de productos, lectura de asignación (incluido el estado normal sin asignar), reemplazo y eliminación.
- Sumé contrato, adaptador con HTTP bearer y fixtures, reglas puras con tests y guía operativa.

## Verification

| Command | Result |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS — 41 tests |
| `pnpm build` | PASS — `/ubicaciones` se prerenderiza |
| Flujo completo vía curl contra el backend real corriendo | PASS — crear ubicación, editarla (`PATCH /picking/locations/:id`), buscar producto, asignarlo (`PUT /products/:id/location`, incluye el 409 real "The location is not active" cuando la ubicación está inactiva y el 400 real cuando el producto lo está), confirmar la asignación (`GET /warehouses/:id/products/:id/location`), y quitarla (`DELETE`, 204 → 404 al reconsultar) |

Hecho con codex (segundo intento — el primero tardó en aparecer el commit real por un problema de backgrounding del lado de la orquestación, no de codex). Revisé el código a mano y repetí cada llamada del adaptador contra el backend real antes de aceptar el resultado.

# (sin card) — Sistema visual empresarial para el backoffice

## Implemented

- Reforcé el sistema visual de todas las rutas administrativas con una paleta gris estructurada, verde SuperX como único acento, menor densidad de espacio desperdiciado y jerarquía tipográfica de consola operativa.
- Unifiqué listas y tablas de productos, precios, inventario y pedidos como grillas de datos: encabezados en mayúsculas, columnas y filas delimitadas, selección con acento lateral y tags de estado rectangulares.
- Ajusté botones, campos, diálogos, alertas, zonas/franjas, KPIs y login para que tengan marcos finos, medidas consistentes y una apariencia de herramienta interna. Los switches conservan pista y perilla redondeadas porque es necesario para reconocer el control.
- Actualicé picking y reparto por separado para preservar su uso móvil de una mano: superficies, acciones, tags, campos y paneles ahora son compactos y cuadrados, sin intentar imponerles el shell de escritorio.

## Verification

| Command | Result |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS — 38 tests |
| `pnpm build` | PASS — las 10 rutas operativas se generaron estáticamente |

Los avisos de Node sobre `*-rules.js` sin `"type":"module"` ya existían durante `pnpm test`; no se tocaron porque los adaptadores/reglas de `app/lib` están explícitamente fuera de alcance.

**Nota post-revisión**: este pase (hecho con codex) se ejecutó sobre `app/globals.css` después de un pase manual mío previo (padding del workspace, tamaño del título, borde de los `.status`, encabezados de tabla, redondeo del switch). Como el bloque nuevo de codex pisa esas mismas propiedades más abajo en el archivo, revertí mis cinco cambios puntuales a su valor original para no dejar declaraciones duplicadas/muertas — el resultado final es un único sistema coherente, no dos superpuestos.

# (sin card) — Wiring de picking y reparto (flujo completo punta a punta)

Continuación de la sesión anterior (el usuario se iba a dormir y pidió seguir para dejar todo probable de punta a punta). Conecta los 2 dominios que habían quedado explícitamente afuera por falta de login: **picking** (`/picking`) y **reparto** (`/reparto`).

## Login reutilizado, no duplicado

Ambas rutas ya tenían un estado `"auth"` previsto en su código (`LoadState = "loading"|"ready"|"error"|"auth"`, disparado cuando el adaptador devuelve `code:"unauthenticated"`) pero solo mostraban un mensaje estático sin ninguna forma de ingresar. Se agregó un link `<Link href="/login?next=/picking">`/`/reparto` reutilizando el mismo `/login` y `auth-api.ts` de `AdminShell` — no se construyó un login nuevo. `login.tsx` ahora lee `?next=` (con `Suspense` en `/login/page.tsx`, requisito de Next para `useSearchParams`) y redirige ahí en vez de siempre a `/tablero`.

## picking-api.ts

Ya tenía una rama HTTP real (no era 100% mock, a diferencia de lo que se documentó ayer por error tras un chequeo superficial) pero con dos bugs: prefijo `/api/` de más (correcto: `/picking/tasks`, sin prefijo) y `credentials:"include"` en vez de `Authorization: Bearer`. Corregido; se mantuvo intacta toda la lógica de fixture existente. Los campos del backend real (`orderNumber`, `priority`, `slotDate`, `slotStart`, `assignedPickerId`, y cada `PickingTaskItem` con `productName`/`unitCode`/`quantityRequired`/`quantityPicked`/`locationCode`/`locationSortOrder`) ya coincidían case-por-caso con el contrato — mínimo trabajo de adaptación.

## driver-api.ts (reescrito completo, antes 100% mock)

- `GET /delivery-assignments` se auto-escopea al repartidor autenticado (no hace falta query param), pero **no trae los datos del pedido** (cliente, dirección, total) — se hace un `GET /orders/:id` por cada asignación para completar la vista.
- Las mutaciones (`start`/`deliver`/`incident`) viven en `/orders/:id/assignment/*`, indexadas por **order id**, no por assignment id — el adaptador resuelve `orderId` con un `getDelivery(assignmentId)` antes de cada acción.
- **Hallazgo de arquitectura real, no corregido (fuera de alcance esta sesión)**: `Driver.id` no tiene ninguna columna que lo vincule al `User.id` de auth — el código de scoping (`DeliveryAssignmentsService.listAssignments`) simplemente asume que coinciden por convención, sin garantía de esquema. Para el repartidor de prueba de esta sesión se insertó la fila de `Driver` directo por SQL con el mismo id que su usuario (`INSERT INTO drivers (id, ...) VALUES (<user_id>, ...)` + `setval` de la secuencia) porque no hay forma de elegir el id vía `POST /drivers`. **Si se crea un segundo repartidor sin este cuidado, su panel de reparto no va a mostrarle sus entregas** — es una limitación real del backend, no del wiring.

## Verificación: flujo completo punta a punta, real, contra el backend corriendo

Cliente pide → admin confirma → picker arma y completa la tarea → admin marca el checklist de empaque (READY) → admin asigna repartidor → repartidor inicia → repartidor entrega. Cada paso se probó vía curl replicando exactamente cada llamada de `picking-api.ts`/`driver-api.ts`/`order-api.ts`, verificando que el pedido avanza correctamente por todos los estados:

```
CREATED → CONFIRMED → PICKING → PACKED → READY → OUT_FOR_DELIVERY → DELIVERED
```

Cuentas de prueba nuevas: `picker1@superx.local` / `picker-pass-123` (rol picker), `driver1@superx.local` / `driver-pass-123` (rol driver, `Driver.id=4` alineado a mano). Pedido de prueba: id `3` (`PX000003`), ya en `DELIVERED`.

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | PASS — 38 tests sin cambios |
| Flujo completo vía curl (10+ llamadas: registro de picker/driver, crear tarea, asignar/iniciar/pickear/completar, checklist READY, asignar repartidor, iniciar/entregar) | PASS — el pedido terminó en `DELIVERED` con el historial completo de 7 eventos |

## Pendiente actualizado

- Tablero de métricas (`/tablero`): sigue sin ningún endpoint real de KPIs — único dominio que queda 100% fixture.
- La convención `Driver.id === User.id` (arriba) debería resolverse con una migración real (agregar `user_id` a `drivers`) antes de dar de alta un segundo repartidor de verdad.

# (sin card) — Wiring al backend real (login + 5 dominios de AdminShell)

Pedido explícito del usuario, sin card de Trello (Trello estuvo caído toda la sesión). Alcance acordado con el usuario tras encontrar que cada dominio era más profundo de lo previsto: **login + productos, precios, inventario, pedidos y entregas** (los 5 dominios de `AdminShell`). Quedan deliberadamente fuera de esta pasada: **picking y reparto** (rutas standalone sin login, necesitarían su propio flujo de auth) y **tablero/métricas** (no existe ningún endpoint real de KPIs en el backend — sigue siendo fixture, no hay nada que conectar).

## Login (nuevo)

- `app/lib/auth-api.ts` (`login`/`getAccessToken`/`logout`, mismo mecanismo bearer que `superx_front`, sin cookies), `app/components/login.tsx` + `app/login/page.tsx`, `AdminShell` ahora redirige a `/login` si no hay token (excepto en modo fixture, sin `NEXT_PUBLIC_SUPERX_API_BASE_URL`, que nunca lo pide). Cualquier rol puede iniciar sesión; las acciones que no puede hacer las rechaza el backend (401/403), la UI no duplica esa decisión.

## Hallazgos de contrato reales (no solo URLs — los tipos mismos no coincidían)

- **`product-contract.ts`**: el backend no tiene `sku` (se deriva del `slug`), ni un `barcode` único (es un array — solo se gestiona el primero), ni una `unit` de 4 valores fijos (las unidades son filas dinámicas: UN/KG/L/ML/G). Se agregó `ProductApi.listUnits()` y el formulario de `product-manager.tsx` ahora carga unidades reales en vez de un `<select>` hardcodeado de 4 opciones.
- **No existe `DELETE /products`** — los productos solo se desactivan. `productApi.deleteProduct` ahora lanza un error explícito ("no se pueden eliminar, solo desactivar") en vez de fingir que funciona; se dejó el botón "Eliminar" tal cual en la UI (sin restructurarla) porque ese error ya es honesto y accionable.
- **Precios**: el backend no tiene "un precio por producto" — precios viven en listas (`PriceList`/`ProductPrice`) resueltas por scope/prioridad, sin historial de cambios consultable. `price-api.ts` gestiona una lista global única "Lista general" (la crea si no existe) para las escrituras, y usa el `/product-prices` en lote (mismo endpoint nuevo del frontend) para las lecturas. **Limitación real**: `/product-prices` solo resuelve productos `isActive:true` — un producto inactivo con precio cargado se ve como "Sin precio cargado" en el listado admin, aunque el precio exista.
- **Inventario**: no hay concepto de "mínimo/umbral de reposición" en el backend — el estado "low" nunca se activa (`minimum` queda en 0 siempre), solo "ok"/"out". `InventoryMovement.actorUserId` no resuelve a un nombre (no hay directorio de usuarios), se muestra `Usuario #<id>`. El "id" de cada posición de stock es un compuesto `productId:warehouseId` armado en el adaptador (no hay snapshot previo para productos sin movimientos, así que un id real de snapshot no serviría para crear el primer movimiento).
- **Pedidos**: campos ya bien alineados (`orderNumber`, `itemsSubtotal`, `deliveryFee`, `grandTotal`, etc. — mismo patrón que en `superx_front`). Detalle real: `GET /orders` sin `scope=all` solo devuelve los pedidos del propio usuario — un admin necesita ese query param para ver todos. Las sustituciones de picking no se reflejan en `OrderLine.substitution` (siempre `null` acá; solo visibles vía el módulo de picking, no conectado hoy).
- **Entregas**: `cityName` en el contrato es texto libre en el formulario — se resuelve a `cityId` real buscando por nombre exacto contra `GET /cities` (lanza error claro si no coincide). **`UpdateDeliverySlotDto` real solo acepta `capacity`/`isActive`** — no se puede cambiar fecha/horario de una franja ya creada; el adaptador solo envía esos dos campos al actualizar y documenta la limitación acá en vez de fingir que el resto se aplicó. Igual que precios/inventario, no hay historial de auditoría real para zonas/franjas (`history: []` siempre, en vez de inventar entradas).

## Verification

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (tras cada dominio) | PASS — 38 tests sin cambios en ningún paso |
| Simulación real completa vía curl contra el backend corriendo, replicando exactamente cada llamada de cada adaptador | login admin → CRUD de productos (crear/editar/desactivar, unidades reales) → precios (lista por defecto, crear/actualizar, lectura en lote) → inventario (stock, ajuste ADJUSTMENT, movimientos) → pedidos (listar con `scope=all`, transición de estado) → entregas (zonas con resolución de ciudad, franjas con creación y actualización parcial). Todo devolvió exactamente la forma esperada por cada adaptador. |
| No se pudo probar visualmente en navegador (sin Chrome/Playwright disponible en esta sesión) | Verificado a nivel de contrato HTTP (nombres de campo, códigos de estado, headers), no visualmente — el usuario debería hacer una pasada visual antes de darlo por definitivo. |

## Pendiente explícito para una próxima sesión

- Picking (`/picking`) y reparto (`/reparto`): necesitan su propio login (picker/driver) antes de poder wirearse — hoy siguen 100% fixture aunque el backend de ambos dominios está completo desde PK-001..006/LG-001..005.
- Tablero de métricas (`/tablero`): no hay ningún endpoint de KPIs en el backend — sigue fixture hasta que se construya esa capacidad (fuera del alcance de "wiring", es una feature nueva).

# IQ-003 — CI/CD

## Implementado

- `.github/workflows/ci.yml`: job `verify` en `push`/`pull_request` a `main` — `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- **Bug real capturado por la primera corrida real en GitHub Actions** (este repo es público, así que se pudo leer el resultado sin `gh auth`): `tsc --noEmit` fallaba en frío con `Cannot find name 'LayoutProps'` en `app/layout.tsx:17` — localmente pasaba solo porque `.next/types` (gitignored) ya existía de un build/dev previo; un checkout limpio no lo tiene. Fix: `"typecheck": "next typegen && tsc --noEmit"`. Mismo fix aplicado en `superx_front` (mismo setup de Next 16) antes de que su propio push expusiera el bug.

## Verificación ejecutada

| Comando | Resultado |
| --- | --- |
| Primera corrida en GitHub Actions (`132818e`) | **FAIL** en el step `pnpm typecheck` — confirmado vía `GET /repos/.../check-runs/.../annotations` (repo público, sin auth) |
| `rm -rf .next && pnpm typecheck` local tras el fix | PASS |
| `pnpm lint && pnpm test && pnpm build` | PASS — 38 tests |
| Segunda corrida en GitHub Actions (`0e763ce`) | **PASS** — confirma que el workflow completo (checkout → pnpm/action-setup → setup-node → install → typecheck → lint → test → build) funciona de punta a punta en un runner real |

## Decisiones y supuestos

- Sin job de e2e (no aplica: fixtures locales, sin backend real conectado todavía).

# IQ-001 — Convenciones de repositorio y quickstart

## Implementado

- `.editorconfig` (2 espacios, UTF-8, LF, newline final, sin trim en Markdown).
- `.env.example` documentando `NEXT_PUBLIC_SUPERX_API_BASE_URL` (opcional; sin valor cae a los fixtures tipados de `app/lib/*-api.ts`).
- `CONVENTIONS.md`: ramas (trunk-based sobre `main`), commits (Conventional Commits + footer de coautoría), el patrón manager+api+contract+rules por dominio, la restricción de `*-rules.js` (ESM plano, sin importar `.ts`), y el aviso de leer `AGENTS.md`/`node_modules/next/dist/docs/` antes de codear.
- README: sección `## Quickstart` (clone → install → env opcional → dev → verify).

## Verificación ejecutada

| Comando | Resultado |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS — 38 tests (`node --test`) |
| `pnpm build` | PASS |
| Prueba real de arranque | `pnpm exec next dev -p 3200` → `curl localhost:3200/` → `307` (redirect esperado a la ruta por defecto). **Mismo hallazgo que en `superx_front`**: `pnpm dev -- -p 3200` no pasa el flag correctamente; el Quickstart usa `pnpm exec next dev -p 3200`, ya verificado. |

## Decisiones y supuestos

- Puerto de desarrollo recomendado 3200 (3000 y 3100 quedan reservados para backend y frontend cliente) para poder levantar los tres repos en simultáneo en la misma máquina sin colisión.

# Evidencia — LG-005: integrar apertura de mapas

## Implementado

- Nueva función pura `buildMapsUrl(delivery)` en `app/lib/driver-rules.js`: arma `https://www.google.com/maps/search/?api=1&query=<dirección>, <zona>` (URL-encoded), o `null` si la entrega no tiene dirección. Es el formato universal de Google Maps: en un dispositivo móvil abre la app si está instalada, y cae solo al mapa en el navegador si no — sin depender de esquemas nativos por plataforma (`geo:`/`intent://`) que no garantizan ese fallback.
- En `app/reparto/driver-app.tsx`, cada tarjeta de entrega muestra un enlace **Cómo llegar** (`target="_blank" rel="noopener noreferrer"`) construido con `buildMapsUrl`, junto al teléfono. No hay ruteo ni optimización de múltiples paradas — es siempre una sola ubicación, tal como pide la tarjeta ("sin optimización automática de rutas").
- `docs/driver-app.md` actualizado.

## Verificación ejecutada

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 38 tests (1 nuevo: `buildMapsUrl` en `tests/driver-rules.test.mjs`, cubre dirección+zona, sólo dirección, y ausencia de dirección → `null`).
- `pnpm build`: PASS — `/reparto` se prerenderiza.

## Guía de prueba manual

1. Abrí `/reparto`. En cualquier tarjeta, tocá **Cómo llegar**.
2. En un navegador de escritorio abre Google Maps en una pestaña nueva con la dirección de esa entrega. En un teléfono con la app de Google Maps instalada, la abre directamente en la ubicación correcta; sin la app instalada, abre el mapa en el navegador igual (mismo enlace, sin lógica adicional de detección de plataforma).

## Decisiones y supuestos

- No se ampliar alcance: es un único enlace por entrega a la ubicación del pedido, sin ruteo multi-parada, geolocalización del repartidor ni integración con un SDK de mapas — exactamente lo que pide la tarjeta.
- Se usa `deliveryAddress` + `deliveryZone` (sin ciudad fija en el string) porque el modelo de `DriverDelivery` no incluye una ciudad explícita; si en el futuro se agrega, sumarla a `buildMapsUrl` mejoraría la precisión del geocoding de Google.

# Evidencia — LG-002: panel móvil de repartidor

## Implementado

- Nueva ruta `/reparto` (fuera del shell de administración), componente `driver-app.tsx` + `driver.module.css`, siguiendo el mismo patrón que `/picking`: pantalla completa mobile-first, sin login propio (la autorización real la hace el backend, rol `driver`; la UI sólo maneja el 401/403 resultante igual que `picking-api.ts`).
- `app/lib/driver-contract.ts` (tipos: `DriverDelivery`, `DriverDeliveryEvent`, interfaz `DriverApi`), `app/lib/driver-api.ts` (adaptador **100% fixture**, 4 entregas de ejemplo en distintos estados) y `app/lib/driver-rules.js` (lógica pura: orden sugerido, guards de transición, validación de incidencia, copy de estado/pago).
- Cada tarjeta de entrega muestra pedido, cliente, dirección/zona, teléfono (enlace `tel:`), forma de pago + monto, estado, nota y trazabilidad completa (historial de eventos con fecha/hora y nota).
- Acciones **Iniciar** (directa), **Entregado** (panel con nota opcional) e **Incidencia** (panel con motivo obligatorio de una lista corta + nota opcional), con guards que impiden entregar o reportar sin haber iniciado.
- Manejo de sin-conexión y reintento igual que `order-manager.tsx` (`navigator.onLine`).
- `docs/driver-app.md` nuevo documentando el flujo y dejando explícito que las acciones no llaman a ningún endpoint real todavía: LG-001 (ya en `04 · Testing` en `superx_back`) sólo expone lectura para el repartidor; los endpoints para iniciar/entregar/reportar incidencia son las tarjetas LG-003/LG-004.

## Verificación ejecutada

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

- `pnpm typecheck`: PASS (se corrigieron dos errores de tipos: un `string | undefined` sin fallback al construir `DriverApiError`, y una anotación de tipo explícita para el callback de `events.map`/el resultado de `sortDeliveries`, ya que viene de un `.js` sin tipos).
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 37 tests (4 nuevos en `tests/driver-rules.test.mjs`). Se corrigió un import roto: `driver-rules.js` importaba `ORDER_PAYMENT_METHOD_LABELS` desde `./order-contract` (un `.ts`), lo que rompe `node --test` (ESM no puede resolver `.ts`); se cambió a `./order-rules.js`, que ya duplica esas labels (mismo patrón documentado para `*-rules.js`/`*-contract.ts` en este repo).
- `pnpm build`: PASS — `/reparto` se prerenderiza.
- Manual: `pnpm dev` + `curl http://localhost:3000/reparto` → 200, con el shell de la pantalla en el HTML servido (el listado de tarjetas se hidrata en cliente desde el fixture).

## Guía de prueba manual

Sin backend configurado (`NEXT_PUBLIC_SUPERX_API_BASE_URL` sin definir, caso por defecto), la pantalla usa el fixture en memoria:

1. Abrí `/reparto`. Deberías ver 4 entregas: una **Pendiente**, una **En camino**, una **Entregada** y una **Con incidencia**.
2. En la entrega **Pendiente**, tocá **Iniciar** → pasa a **En camino** y aparecen **Entregado**/**Incidencia**.
3. Tocá **Entregado**, agregá una nota opcional y confirmá → pasa a **Entregado** (estado terminal, sin acciones) y la nota queda en el historial.
4. En otra entrega **En camino**, tocá **Incidencia** → intentá confirmar sin elegir motivo (debe estar deshabilitado), elegí un motivo, confirmá → pasa a **Con incidencia** con el motivo y la nota concatenados en el historial.
5. Confirmá que el teléfono es tocable y arma un enlace `tel:`.

## Decisiones y supuestos

- No se ampliar alcance hacia LG-003/LG-004: las tres acciones actualizan sólo el fixture local; no hay ningún endpoint real de mutación todavía en `superx_back` para un repartidor (LG-001 sólo agregó lectura). Esto queda documentado en `docs/driver-app.md` para quien tome esas tarjetas.
- `deliveryProgress` (`PENDING`/`EN_CAMINO`/`ENTREGADO`/`INCIDENCIA`) es un concepto de esta pantalla, separado del `status` de `DeliveryAssignment` del backend (`ACTIVE`/`REASSIGNED`/`CANCELLED`/`COMPLETED`) — no hay que confundirlos ni intentar mapearlos 1:1 cuando se conecte al backend real, son ejes distintos (uno es "de quién es la asignación", el otro es "en qué paso operativo está la entrega").
- El "orden sugerido manual" es sólo un campo `sortOrder` ordenable; no hay ruteo, geolocalización ni optimización de recorrido — explícitamente fuera de alcance de esta tarjeta.

# Evidencia — PK-005: faltantes y sustituciones

## Implementado

- Debajo del botón manual **Confirmar línea**, un enlace secundario **Reportar faltante** abre un panel inline (no navega, no es modal) con las tres resoluciones del backend: **Reemplazar por similar**, **Consultar al cliente**, **Quitar del pedido**.
- **Reemplazar por similar** habilita un buscador (debounce ~300ms) contra `GET /api/products?q=` (endpoint público de catálogo); elegís un resultado como sustituto antes de poder confirmar.
- Las tres resoluciones aceptan una nota opcional (hasta 280 caracteres) y llaman a `POST /api/picking/tasks/:id/items/:itemId/shortage` vía `PickingApi.reportShortage(taskId, itemId, resolution, substituteProductId?, note?)`.
- Al confirmar con éxito, la línea queda resuelta (`SHORT` o `SUBSTITUTED`) y la app avanza a la siguiente línea pendiente, igual que el flujo de pick/scan existente. `isResolved`/`pickingProgress`/`canCompleteTask` en `picking-rules.js` ya trataban cualquier estado distinto de `PENDING` como resuelto, así que no requirieron cambios.
- El panel se resetea al cambiar de línea o de tarea.
- Fixture local: `searchProducts` filtra 3 productos de ejemplo por nombre; `reportShortage` en modo fixture actualiza el estado/resolución/sustituto del ítem sin replicar las validaciones de stock del backend (igual que el resto de los adaptadores fixture de esta pantalla).
- `docs/picking-app.md` actualizado con el flujo de faltantes y el nuevo contrato de integración.

## Verificación ejecutada

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS (se corrigieron 2 errores `react-hooks/set-state-in-effect` con el patrón `// eslint-disable-next-line` ya usado en `inventory-manager.tsx`/`product-manager.tsx`/etc. de este repo).
- `pnpm test`: PASS — 31 tests.
- `pnpm build`: PASS — `/picking` se prerenderiza correctamente.

No se agregaron pruebas de componentes ni dependencias nuevas; no se identificó lógica pura nueva que justifique un test en `picking-rules.js` (la lógica nueva es orquestación de estado de UI y llamadas HTTP, no reglas puras).

## Guía de prueba manual

Sin backend configurado (`NEXT_PUBLIC_SUPERX_API_BASE_URL` sin definir, el caso por defecto en este entorno), la pantalla usa el fixture en memoria:

1. Iniciá sesión como picker y abrí `/picking`. Tomá la tarea `SX-1048` (o la que esté disponible).
2. En la línea actual, tocá **Reportar faltante**.
3. **Reemplazar por similar**: escribí "yogur" o "agua" en el buscador, elegí un resultado, opcionalmente agregá una nota, tocá **Confirmar faltante**. La línea debe quedar resuelta y la app avanza a la siguiente pendiente.
4. Repetí para otra línea eligiendo **Consultar al cliente** o **Quitar del pedido** (no requieren seleccionar sustituto, **Confirmar faltante** se habilita de inmediato).
5. Confirmá que **Finalizar picking** se habilita recién cuando todas las líneas (pickeadas o con faltante resuelto) dejan de estar pendientes.

Con backend real: los mismos pasos, pero además verificá en `/pedidos` (o vía `GET /orders/:id`) que el `discountTotal`/`grandTotal` bajan tras una resolución **Quitar del pedido** o **Consultar al cliente**, y que quedan sin cambios tras **Reemplazar por similar**.

# Tablero: conectado al endpoint real de métricas — 2026-09-22

## Implementado

- El backend agregó `GET /metrics/overview?from=&to=` (ver `superx_back` commit `e0a8a2a`) — `metrics-api.ts` ya no es 100% mock: sigue el mismo patrón de adapter que el resto del backoffice (fixture sólo si `NEXT_PUBLIC_SUPERX_API_BASE_URL` no está configurada, bearer auth vía `authHeaders()` si lo está). Sin cambios en `metrics-rules.js` ni en `KpiSnapshot` — el backend ya devuelve exactamente esa forma.
- El aviso "Datos de demostración" de `/tablero` (agregado antes en esta misma sesión) ahora sólo se muestra en modo fixture (`!NEXT_PUBLIC_SUPERX_API_BASE_URL`) — cuando está conectado al backend real, las cifras son reales y el aviso ya no corresponde.
- Verificado end-to-end con `curl` contra el backend real: la misma URL/query string que construye el adapter (`/metrics/overview?from=...&to=...`) responde con el `KpiSnapshot` esperado.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 80 tests.
- `pnpm build`: PASS.
- `curl` end-to-end contra backend real (`localhost:3000`): PASS.

# Umbral de stock bajo: wiring real + edición — 2026-09-22

## Implementado

- El backend agregó `stock_snapshots.reorder_threshold` (ver `superx_back` commit `1550891`) — se conecta acá: `inventory-api.ts` ya no hardcodea `minimum: 0`, mapea `snapshot.reorderThreshold` real en `listInventory`/`createMovement`. Ahora el estado "stock bajo" puede activarse de verdad.
- Nuevo campo `InventoryItem.snapshotId` (id real del `StockSnapshot`, distinto del id compuesto `productId:warehouseId` usado por la UI) y método `InventoryApi.updateReorderThreshold(itemId, threshold)` que llama `PATCH /inventory/stock/:id`.
- UI: en el panel de detalle de inventario, "Mínimo operativo" ahora tiene un enlace "Editar" (sólo si `canAdjust`) que abre un input numérico inline con Guardar/Cancelar y su propio error de validación — sin modal nuevo, reutilizando el patrón de edición liviana ya usado en el resto del backoffice.
- Verificado extremo a extremo contra el backend real corriendo (`curl` con token admin): `GET /inventory/stock` devuelve `reorderThreshold`, `PATCH /inventory/stock/2 {reorderThreshold:15}` lo actualiza y el `GET` posterior lo refleja.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 80 tests.
- `pnpm build`: PASS.
- `curl` end-to-end contra backend real (`localhost:3000`): PASS.

# Notice compartido — migración completa — 2026-09-22

## Implementado

- Se agregó `app/components/ui/notice.tsx`: primitiva para los avisos existentes `.notice success`/`.notice error`, con `kind`, `role`, `label` opcional, `onDismiss`/`dismissLabel`/`closeContent` opcionales. Conserva clases, rol y comportamiento existentes — cero cambio visual.
- Migradas 25 pantallas al componente compartido, en dos formas: la mayoría con el patrón `{error && <div className="notice error" role="alert">{error}[botón ×]</div>}` (`suppliers/supplier-list.tsx`, `suppliers/supplier-form.tsx`, `invoices/invoice-manager.tsx`, `invoices/invoice-detail.tsx`, `invoices/invoice-form.tsx`, `assets/asset-manager.tsx`, `assets/asset-detail.tsx`, `purchase-orders/purchase-order-list.tsx`, `purchase-orders/purchase-order-detail.tsx`, `purchase-orders/purchase-order-form.tsx`, `purchase-orders/purchase-order-receipt.tsx`, `expenses/expense-list.tsx`, `expenses/expense-detail.tsx`, `treasury/treasury-manager.tsx`, `treasury/treasury-ledger.tsx`, `payments/payment-manager.tsx`, `purchasing/packaging-manager.tsx`, `location-detail.tsx`); y la variante tipada `{kind, text}` con ícono SVG de cierre en vez de × (`order-manager.tsx`, `delivery-manager.tsx`, `inventory-manager.tsx`, `location-list.tsx` — el ícono se pasa vía la prop `closeContent`, sin cambiar su apariencia). `login.tsx` usa la prop `label` para su rótulo "No se pudo continuar". `suppliers/supplier-detail.tsx` migró solo su aviso de error dinámico. `product-detail.tsx` ya estaba migrado de una sesión previa.

## Omitido tras verificación

- `products/product-operation-tabs.tsx` y el aviso estático de `suppliers/supplier-detail.tsx` ("Este proveedor no puede usarse en nuevas órdenes"): son banners de contexto siempre-visibles, no feedback posterior a una acción — no encajan en el contrato de `Notice`.
- `prices/price-workspace.tsx` y `kpi-dashboard.tsx`: usan la variante `.notice warning`, fuera del contrato `success|error` de `Notice`. No se amplió el componente para no arrastrar una tercera variante sin un caso de uso real que la motive todavía.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 80 tests.
- `pnpm build`: PASS.

# Ficha de producto: quitar campos siempre deshabilitados — 2026-09-22

## Implementado

- `product-general-tab.tsx`: se quitaron los campos "Subcategoría", "Contenido / presentación" y "Unidad contenido" — estaban permanentemente `disabled` sin dato real detrás ("Disponible al ampliar categorías"), ocupando espacio de formulario sin función. Se conserva "SKU interno" (informativo, honesto: siempre dice "Se genera automáticamente").

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS.
- `pnpm build`: PASS.

# Búsqueda real en el command palette — 2026-09-22

## Implementado

- `admin-shell.tsx`: el input ⌘K ahora filtra en vivo por texto libre sobre `label`/`href` (case-insensitive, sin librería nueva). Antes solo repetía la lista completa de navegación sin filtrar. Estado vacío honesto ("No encontramos secciones para…") en vez de una lista sin resultados. Se limpia el query al abrir/cerrar (`openCommand`/`closeCommand`).

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS.
- `pnpm build`: PASS.

# Paginación de tablas extraída — 2026-09-22

## Implementado

- Se agregó `app/components/ui/table-pagination.tsx`, un helper pequeño que conserva el footer `.product-pagination`, el cálculo del límite de página y los botones Anterior/Siguiente. Sólo parametriza el resumen, las clases ya existentes de los botones y sus callbacks; no abstrae tablas, columnas ni filas.
- Se migraron `app/components/purchase-orders/purchase-order-list.tsx` y `app/components/expenses/expense-list.tsx`, que comparten el footer de dos botones para paginación remota. Se mantienen sus textos, clases (`button ghost` y `button secondary`), tipo de botón y actualizaciones de estado originales.

## Omitido tras verificación

- `product-manager.tsx` usa el mismo nombre de clase, pero intercala el indicador de página dentro del grupo de botones y muestra otro resumen; incorporarlo requeriría ampliar el helper más allá del footer duplicado.
- `invoice-manager.tsx` no tiene paginación ni filas navegables.
- Las filas navegables de `purchase-order-list.tsx` y `supplier-list.tsx` no son verbatim: la de proveedores previene el comportamiento por defecto al teclado y la de órdenes no; se dejaron intactas para conservar su interacción.
- `location-list-view.tsx` y `warehouses-page.tsx` aplican una interacción parecida en elementos `article`, con callbacks y propagación propios, no en filas de tabla equivalentes.

# Sidebar agrupada por secciones — 2026-09-22

## Implementado

- `admin-shell.tsx`: los 15 ítems planos de navegación ahora están agrupados en 4 secciones (Operación, Catálogo, Compras y proveedores, Finanzas) con un rótulo pequeño por sección. Mismos `<Link>`, mismas rutas, mismos íconos — cero cambios de navegación, solo jerarquía visual. El command palette (⌘K) sigue mostrando la lista plana (`items = navGroups.flatMap(...)`) sin cambios, ya que su búsqueda real es un ítem separado del plan.
- Rótulos ocultos en los breakpoints donde la sidebar se colapsa a solo íconos (≤820px) o pasa a fila horizontal (≤620px, `.nav-group{display:contents}` para que los links sigan siendo hijos directos del flex).

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS.
- `pnpm build`: PASS.

# Tablero: aviso de datos de demostración — 2026-09-22

## Implementado

- `kpi-dashboard.tsx` (`/tablero`) ahora muestra un aviso visible ("Datos de demostración") junto al header, antes del `permission-note`, indicando que las cifras se generan localmente porque no existe endpoint real de métricas (`metrics-api.ts` sigue siendo 100% mock, sin tocar). Evita que un operador confunda estas cifras con datos reales, sin borrar la pantalla ni requerir backend nuevo.
- Reutiliza la clase `.notice.warning` ya existente; se agregó `.notice.tablero-demo-notice{margin-bottom:16px}` en `globals.css` porque `.notice.warning` traía `margin:0` pensado para su uso original inline en el formulario de precios.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 80 tests.
- `pnpm build`: PASS — incluye `/tablero`.

# Roles reales en pantallas operativas — 2026-09-22

## Implementado

- Se eliminó la simulación manual de roles en `order-manager.tsx`, `delivery-manager.tsx`, `inventory-manager.tsx` (con `inventory/inventory-page-header.tsx`), `prices/price-workspace.tsx` y `kpi-dashboard.tsx`.
- Al montar cada pantalla, el rol real de `getStoredUser()` se mapea como `admin` → `admin`; cualquier otro valor, usuario ausente o nulo → `viewer`. El estado inicial también es `viewer`, por lo que el modo fixture sin sesión queda en solo lectura de forma segura.
- Las reglas de permisos y los mapas de actores para auditoría permanecen sin cambios; las cabeceras sólo muestran el rol resuelto de manera no interactiva.

# Controles funcionales de imagen y estado de producto — 2026-09-22

## Implementado

- Se eliminó de la pestaña general el control de carga de archivos deshabilitado. La URL técnica opcional permanece como único mecanismo para definir `imageUrl` y la vista previa no se modificó.
- El menú de más acciones de la ficha ahora ofrece **Desactivar producto** o **Activar producto** según el estado actual. La mutación se ejecuta en `product-detail.tsx` mediante `productApi.setProductStatus`, actualiza el badge de la cabecera y muestra el aviso existente de éxito o error.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 80 tests (con los avisos preexistentes de módulos JS sin `type: module`).
- `pnpm build`: PASS.

# Extracción de badges de estado — 2026-09-22

## Implementado

- Se agregó `app/components/ui/status-badge.tsx`, una primitiva tipada con `tone` (`success`, `warning`, `danger`, `neutral`, `info`) y `label`. Reutiliza literalmente las combinaciones existentes `.status active`, `.status inactive` y `.status order-cancelled`; no se modificó `app/globals.css`.
- Se migraron `app/components/invoices/invoice-manager.tsx`, `app/components/invoices/invoice-detail.tsx`, `app/components/treasury/treasury-ui.tsx` y `app/components/purchase-orders/purchase-order-ui.tsx`. Las etiquetas y decisiones de dominio siguen en sus componentes/reglas; el HTML resultante conserva las mismas clases y el mismo elemento `span`.

## Omitido tras verificación

- `supplier-list.tsx`, `asset-manager.tsx`, `price-workspace.tsx`, `location-list-view.tsx` y `warehouses-page.tsx` usan badges visuales de dominio con clases propias (`location-*`, `asset-*`, `price-*`, `location-visual-status-*`, `warehouse-status-*`). Enrutarlos por esta primitiva de dos props cambiaría las clases renderizadas.
- `inventory-detail-panel.tsx`, `inventory-grid.tsx` e `inventory-list.tsx` ya consumen `StockStatusBadge` de `inventory-ui.tsx`; este último usa el componente visual específico `inventory-status-*` y se mantuvo intacto.
- `purchase-order-list.tsx` y `purchase-order-detail.tsx` ya importan los badges de `purchase-order-ui.tsx`, ahora migrados. `order-manager.tsx` renderiza botones/chips de estado `order-*` (no spans equivalentes), por lo que se dejó intacto para conservar elemento, interacción y clases.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 80 tests (con los avisos preexistentes de módulos JS sin `type: module`).
- `pnpm build`: PASS.

# Evidencia — Dashboard administrativo (2026-09-20)

## Implementado

- Nueva ruta `/administracion`, protegida por el usuario real de `getStoredUser()` y restringida a `admin` como los endpoints del backend.
- Dominio `dashboard-*`: contrato tipado, adaptador Bearer para los siete endpoints de `/admin-dashboard`, fixtures financieros vacíos sin URL de API y reglas puras para rangos locales, rutas de documentos y comparación decimal por centavos.
- Filtros de período, proveedor y moneda; KPIs, cuentas por pagar, OC pendientes, proveedores, gastos por categoría, inversiones, cuentas de tesorería y flujo diario. Cada bloque conserva su estado de carga/error/vacío y se puede reintentar individualmente.
- Navegación quirúrgica de **Administración**, tests de reglas y `docs/administracion-dashboard.md`.

## Decisiones

- `invoiced` se etiqueta como **Facturado** porque es el KPI provisto por el backend para facturas de proveedor.
- `/treasury` entrega saldos oficiales por cuenta pero no un total consolidado. La UI no los suma localmente: la tarjeta **Saldo tesorería** muestra `—` y lo explica; las cuentas conservan los saldos devueltos por servidor, incluidos negativos.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 80 tests (con avisos preexistentes de módulos JS sin `type: module`).
- `pnpm build`: PASS — incluye `/administracion`.

# (sin card) — Código de barras opcional + campo Nombre visible en la ficha de producto

# Proveedores y presentaciones de compra — 2026-09-19

## Implemented

- Se incorporaron `/proveedores` y `/proveedores/[supplierId]`: directorio con búsqueda con debounce, filtro de estado, alta, ficha editable y tabla de presentaciones de compra.
- El dominio tiene contrato tipado, adaptador Bearer con fixtures mutables, validaciones JS puras y autorización real admin-only desde `getStoredUser()`.
- La búsqueda de producto para una presentación reutiliza `GET /products?q=`; la navegación incorpora Proveedores.

## Verification

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | PASS — 49 tests; build genera `/proveedores` y `/proveedores/[supplierId]` |

# Gestión de precios

## Implemented

- Gestión modular de precios con métricas, filtros remotos, tabla ordenable, detalle sticky, promociones, reglas, historial y edición/programación con margen en vivo.
- Adaptador del contrato nuevo de `/prices`, reglas puras y fixtures temporales cuando falta URL de API.

## Verification

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | PASS — 46 tests; build genera `/precios` |

# (sin card) — Detalle operativo de ubicación

## Implemented

- Rediseño modular del detalle: datos, ocupación, métricas, stock paginado, operaciones y trazabilidad.
- Adaptador conectado a los endpoints de ubicación/stock/movimientos; QR local generado con `qrcode`.
- Reglas puras para ocupación, alta, transferencia y ajuste, cubiertas por tests.

## Implemented

- El código de barras era obligatorio, con formato "solo 8-14 dígitos" y chequeo de duplicado en el frontend — más estricto que el backend real (`BarcodeInputDto`: opcional, alfanumérico + guiones, hasta 64 caracteres; la unicidad la enforce la constraint `unique` de la tabla `barcodes` en Postgres, no el frontend). Se sacaron las 3 validaciones de `validateProduct` y el filtro de solo-dígitos del input; el campo quedó libre y sin asterisco de obligatorio.
- Auditoría del reporte "no puedo poner el nombre, no está el campo": el campo funcionaba (estaba conectado al estado y al guardado), pero visualmente era un input gigante sin borde ni etiqueta —se veía como un título estático, no como un campo completable—, y no mostraba el error de validación como el resto de los campos. Se le agregó una etiqueta visible "Nombre comercial *" y el mensaje de error inline, manteniendo el tamaño grande tipo Odoo.

## Verification

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | PASS — 41 tests (el test de barcode se reescribió para el comportamiento nuevo) |
| `curl` contra `next dev` real | `/productos/nuevo`, `/productos/prd-001` → 200 |

# (sin card) — Alta rápida de categoría desde la ficha de producto

## Implemented

- Mismo patrón que la marca: el select de "Categoría" en `/productos/nuevo` y `/productos/[id]` tiene ahora "+ Crear categoría nueva…", que abre una fila inline para tipear el nombre, crea la categoría vía `POST /categories` (`productApi.createCategory`, nuevo en el contrato) y la selecciona automáticamente.
- `product-contract.ts`/`product-api.ts`: `createCategory` real (POST /categories) + fixture, mismo shape que `createBrand`.

## Verification

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | PASS — 41 tests |
| `curl` contra `next dev` real | `/productos/nuevo` → 200 |

# (sin card) — Ficha de producto tipo Odoo, en pantalla propia, con alta rápida de marca

## Implemented

- Crear/editar un producto era un modal sobre la lista, con los mismos campos limitados de siempre y sin forma de crear una marca sin salir del formulario. El usuario pidió una pantalla aparte "parecida a Odoo" que además permita crear marca desde ahí.
- Rutas nuevas: `/productos/nuevo` (alta) y `/productos/[id]` (ficha/edición) via `product-detail.tsx`. `/productos` quedó como lista pura (sin panel lateral ni modal), cada fila navega a su ficha.
- Ficha: nombre editable como título grande, pill de estado, bloque "hero" con foto (URL) a la izquierda y campos clave (categoría/marca/unidad/código de barras) a la derecha, sección de "Descripción" (campo nuevo, ya soportado por el backend pero no expuesto hasta ahora), y acciones al pie (guardar, activar/desactivar, eliminar).
- Marca: el select de "Marca" tiene una opción "+ Crear marca nueva…" que abre una fila inline; crea la marca vía `POST /brands` (`productApi.createBrand`, nuevo en el contrato) y la selecciona automáticamente, sin recargar la página.
- `product-contract.ts`/`product-api.ts`: se agregó `description` a `Product`/`ProductInput` (mapeado al `description` real del backend) y `createBrand` (real + fixture). No se tocó `product-rules.js` (la validación de `barcode`/`categoryId`/`brandId` sigue igual, con test intacto).

## Verification

| Command | Result |
| --- | --- |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | PASS — 41 tests; build genera `/productos`, `/productos/nuevo` y `/productos/[id]` |
| `curl` contra `next dev` real | `/productos`, `/productos/nuevo`, `/productos/1` (producto real con descripción ya existente en el backend) → 200 |
| Creación de marca contra backend real | No verificado con un login admin real end-to-end en esta pasada (el ajuste de rol de una cuenta de prueba vía SQL directo quedó bloqueado por el modo automático); el código reusa el mismo `fetchJson` con Bearer ya probado en products/locations/prices en esta sesión |

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

# Evidencia — detalle de ubicación (2026-09-19)

## Implementado

- Actualizados `app/components/location-detail.tsx`, `app/components/locations/location-panels.tsx`, `app/components/locations/location-modals.tsx`, `app/components/location-ui.tsx`, `app/lib/location-api.ts`, `app/lib/location-contract.ts`, `app/lib/location-rules.js`, `app/globals.css`, `tests/location-rules.test.mjs` y `docs/ubicaciones-operations.md`.
- Nuevos componentes operativos: `LocationPermissionNotice`, `LocationStatsCards`, `LocationOccupancyCard`, `LocationMovementsCard`, `LocationCodeModal`, `MovementTypeBadge` y `RemoveProductDialog`; el editor compartido se extendió con estado y capacidad.
- El detalle incorpora picker de rol, banner cerrable, menú de acciones coherente, QR con copiar/imprimir, búsqueda debounced, tarjetas, ocupación y diseños responsive para tablet/móvil.
- Se consumen `GET` de detalle/stock/movimientos/listado de ubicaciones, `POST` de alta/transferencia/ajuste, `PATCH /picking/locations/:id` y el nuevo `DELETE /warehouses/:warehouseId/locations/:locationId/stock/:productId`. `AdjustLocationStockDto` frontend incluye el `reason` obligatorio.

## Decisiones técnicas

- El selector de producto reutiliza `GET /products` a través de `locationApi.searchProducts`: muestra los campos de stock global que devuelve la búsqueda y consulta la asignación existente con `getProductLocation`, sin crear endpoints adicionales.
- La transferencia carga ubicaciones del mismo depósito, filtra la actual/inactiva/bloqueada y conserva el payload hasta la confirmación.
- El fixture ahora conserva stock y movimientos mutables, para que alta, transferencia, ajuste, vaciado y baja sean verificables sin backend.
- Vaciar ubicación se confirma y ejecuta ajustes `set: 0`, motivo `OTHER` y nota de auditoría por cada ítem cargado; no existe un endpoint paralelo de vaciado.

## Verificación

- `pnpm typecheck`, `pnpm lint` y `pnpm test`: PASS (46 tests). Se agregó la cobertura de la regla de motivo obligatorio para ajustes.

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

# Evidencia — vista de stock por producto en depósitos (2026-09-19)

## Implementado

- En `/ubicaciones/[warehouseId]` agregué el selector local **Por ubicación / Por producto**. La nueva vista consulta el stock real del depósito, permite buscar por nombre, `slug` o código de barras con debounce de 350 ms, y muestra cada ubicación de un producto como una fila separada.
- `location-contract.ts` y `location-api.ts` incorporan `WarehouseStockItem` y `GET /warehouses/:warehouseId/stock`; los fixtures derivan las filas de las ubicaciones y el stock mutable existente, incluyendo un mismo producto en dos ubicaciones para reflejar el caso operativo.
- La tabla enlaza cada código a su detalle, conserva la paginación del inventario de ubicación y cubre carga, error/reintento y ambos estados vacíos.

## Decisiones técnicas

- La vista se aisló en `app/components/locations/warehouse-stock-view.tsx` para no agrandar ni alterar la lista por ubicación existente.
- El listado de asignaciones de picking sigue separado del stock: esta tabla usa exclusivamente el endpoint de stock del depósito.

## Verificación

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build`: PASS (46 tests).

# Evidencia — rediseño del listado de ubicaciones (2026-09-19)

## Implementado

- Actualizados `app/components/location-list.tsx`, `app/components/location-ui.tsx`, `app/lib/location-contract.ts`, `app/lib/location-api.ts`, `app/globals.css` y `docs/ubicaciones-operations.md`; creado `app/components/locations/location-list-view.tsx`.
- La vista **Por ubicación** ahora incluye métricas calculadas, banner operativo, búsqueda, filtros dinámicos de pasillo/rack, selector de orden y vistas lista/cuadrícula responsive. `LocationsStats`, `LocationsListView`, `LocationsFilters`, `LocationsViewToggle`, filas/tarjetas, badges, preview de producto, anillo de ocupación y menú de acciones quedan separados del contenedor de carga/formulario.
- El contrato de listado incorpora `stock` agregado por ubicación. El adaptador usa ceros y producto principal nulo cuando el backend todavía no lo entrega; los fixtures calculan los mismos agregados desde el stock mutable, sin fetch por fila ni carga de catálogos completos.

## Decisiones técnicas

- El preview muestra un ícono de caja, no una imagen inventada; donde la maqueta dice SKU se muestra `primaryProduct.slug`.
- El filtro Estado combina Activas, Vacías, Ocupadas y Bloqueadas en cliente. Pasillo y rack se derivan de las ubicaciones cargadas.
- **Ver código** reutiliza `LocationCodeModal`. **Mover stock** y **Ajustar stock** navegan al detalle para seleccionar producto; **Bloquear**/**Desactivar** abren el editor compartido con estado preseleccionado. El menú omite Eliminar porque el backend no expone esa operación.
- La pestaña **Por producto** (`warehouse-stock-view.tsx`) no fue modificada.
# Evidencia — órdenes de compra (2026-09-19)

## Implementado

- Nuevas rutas `/compras`, `/compras/nueva`, `/compras/[id]` y `/compras/[id]/editar`, con listado filtrable, formulario de líneas y documento de detalle.
- Nuevo contrato y adaptador `purchase-order-*`: Bearer, adaptadores de respuesta, fixtures mutables, búsqueda pública de productos y presentaciones por proveedor.
- El detalle muestra estados, cabecera, líneas, total e historial; permite editar borradores, confirmar con validación explícita y cancelar en los estados permitidos.
- La navegación incluye la entrada **Compras** sin modificar el resto del shell existente.

## Verificación

- Agregado `tests/purchase-order-rules.test.mjs` para preview y validaciones de formulario.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build`: PASS.

# Evidencia — compras: recepciones y presentaciones (2026-09-19)

## Implementado

- Se amplió el contrato y adaptador de órdenes de compra para moneda, número, desglose de totales devuelto por el servidor, filtros de recepción/fecha/búsqueda, eventos, cierre y recepciones. El adapter usa `GET /purchase-packagings/options` para las opciones de una línea y no envía totales al backend.
- Nueva ruta `/compras/[id]/recibir`: carga ubicaciones con el adapter existente, recibe en packs, muestra unidades derivadas del snapshot, pendiente/recibido/pedido, exige autorización + motivo para exceso y reutiliza una `idempotencyKey` por intento.
- El detalle muestra progreso total, cantidades por línea, totales oficiales, historial de recepciones, acciones de recibir/cerrar/cancelar, y la acción Facturar deshabilitada como "Próximamente".
- La vista de proveedor expone productos/presentaciones con equivalencia, código de proveedor, barcode, predeterminada y estado; conserva su editor existente para alta, edición y activación/desactivación.
- Agregados tests puros para equivalencia, preview, pendiente/exceso, progreso, motivo e idempotencia; actualizada la documentación operativa de compras y proveedores.

## Decisiones

- Se eligió una ruta dedicada de recepción, no un diálogo, para conservar un enlace profundo, navegación atrás predecible y reintentos seguros de un formulario operativo.
- El preview local es sólo orientativo; se pisa con el detalle/totales que devuelve el servidor tras guardar. La confirmación de exceso sigue siendo responsabilidad final del backend ante concurrencia.
- No se inventaron campos de facturación: el botón queda explícitamente deshabilitado.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 54 tests.
- `pnpm build`: PASS — incluye `/compras/[id]/recibir` como ruta dinámica.

# Evidencia — Gastos (2026-09-20)

## Implementado

- Rutas `/gastos` y `/gastos/[id]`, protegidas por el rol real `admin`, con listado filtrable, paginación, resumen por período y desglose por categoría.
- Dominio `expense-*` con contrato, adapter bearer, reglas puras y formulario de alta rápida con pago inmediato y clave de idempotencia por intento.
- Gestión de categorías, detalle, edición de los campos permitidos, timeline y anulación bloqueada visualmente cuando hay pagos.

## Decisiones

- El backend no expone un endpoint de "open payables" para gastos; el detalle dirige a la pantalla de Pagos para continuar el flujo de tesorería, sin inventar un saldo o asignación local.
- En modo sin API los gastos financieros quedan vacíos, igual que pagos y facturas, para no simular obligaciones oficiales.

## Verificación ejecutada

- Pendiente de ejecutar al cierre de esta tarjeta.

# Evidencia — Inversiones y activos (2026-09-20)

## Implementado

- Rutas `/inversiones` y `/inversiones/[id]`, visibles sólo al rol real `admin`, con listado paginado, filtros, períodos rápidos, resumen por categoría y ficha de activo.
- Dominio `asset-*` con contrato, adapter Bearer para los endpoints reales, fixtures vacíos para importes oficiales y reglas puras cubiertas por tests. Los montos se mantienen como strings y las comparaciones críticas usan centavos `BigInt`.
- El alta usa `POST /assets`; **Pagar ahora** forma parte del mismo payload con clave de idempotencia para conservar la atomicidad que ofrece el backend. La ficha permite pagos posteriores a `POST /payments` con `targetType: ASSET`, cambios de estado con motivo obligatorio al disponer y cambios de ubicación.
- Se amplió el contrato de pagos para representar imputaciones `ASSET` y se añadió la entrada quirúrgica **Inversiones** a la navegación. Se agregó `docs/inversiones-operations.md`.

## Decisiones

- El selector de cuenta conserva los saldos negativos tal como llegan de tesorería y filtra por moneda activa; no bloquea descubierto porque el backend lo admite.
- El estado de pago ofrece únicamente `UNPAID`, `PARTIALLY_PAID` y `PAID`; no presenta vencido para activos.
- La ficha expone el bloqueo de costo/moneda fuera de planificación o con pagos, de acuerdo con el 409 del backend; la API queda preparada para los campos editables restantes mediante `PATCH`.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 75 tests (con avisos preexistentes de módulos JS sin `type: module`).
- `pnpm build`: PASS — incluye `/inversiones` y `/inversiones/[id]`.

# Evidencia — presentaciones desde producto y filtros de OC (2026-09-19)

## Implementado

- La ficha de producto renombra su pestaña a **Presentaciones de compra** y muestra las presentaciones reales del producto: proveedor (o Genérica), pack, equivalencia, códigos, default, estado y acciones de alta, edición y activación/desactivación. Para productos nuevos, informa que primero hay que guardarlos.
- Se agregó `PackagingManager` como tabla/editor único para la ficha de producto y la ficha de proveedor. El formulario muestra unidad base y equivalencia al instante, selector de proveedor, validaciones inline, carga/error/vacío y confirmación explícita antes de cambiar `unitsPerPack`; deja claro que las OC existentes conservan su snapshot y el 409 del backend se conserva como mensaje de error.
- `supplierApi` incorpora el listado autenticado `GET /products/:productId/purchase-packagings`, reutilizando su Bearer y sus operaciones existentes de alta/edición. La lógica pura vive en `packaging-rules.js` y tiene cobertura propia.
- El listado de OC ahora filtra por estado de recepción y fechas desde/hasta, conserva la paginación que informa el endpoint y renderiza una barra de recepción sólo cuando el summary incluye explícitamente `receiptProgress`; si no, mantiene sólo la etiqueta de estado.

## Verificación ejecutada

- `node --test tests/packaging-rules.test.mjs`: PASS — 3 tests nuevos.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 57 tests.
- `pnpm build`: PASS — `/compras`, `/productos/[id]` y `/proveedores/[supplierId]` compilan correctamente.

## Decisiones

- La barra de recepción no se deriva de las líneas ni de la etiqueta: el backend actual no entrega progreso numérico en el summary, por lo que sólo se muestra si aparece el campo opcional `receiptProgress`.
- Cambiar las unidades pide una confirmación separada antes de enviar el PATCH; el backend sigue siendo la autoridad para bloquear con 409 una presentación ya usada.

# Evidencia — Tesorería (2026-09-19)

## Implementado

- Nuevas rutas `/tesoreria` y `/tesoreria/[id]`, con cuentas, saldos por moneda del servidor, alta/edición/activación y libro filtrable/paginado.
- Nuevo dominio `treasury-*`: contrato tipado, adapter bearer contra `/treasury` y fixture mutable sin URL configurada; las reglas puras validan dinero en centavos, transferencias, etiquetas, reversibilidad e idempotencia.
- El libro registra movimientos manuales, transferencias y reversas con motivo obligatorio. Usa `runningBalance` y `openingBalanceForPeriod` entregados por el backend; una transferencia se revierte atómicamente por `/treasury/transfers/:id/reverse`.
- La interfaz está limitada al rol real `admin`, expone fecha de apertura y aclara que el saldo sólo cambia por movimientos. Se agregó Tesorería a la navegación y la guía `docs/tesoreria-operations.md`.

## Decisiones

- Los importes se transportan como strings decimales y las reglas puras usan centavos; no se enviaron saldos o totales calculados al backend. El fixture sólo reconstruye su estado para permitir probar el flujo sin API.
- La acción Revertir se ofrece para movimientos no revertidos; cuando tiene `transferId` invoca la reversa de la transferencia para mantener sus dos patas consistentes.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 61 tests.
- `pnpm build`: PASS — `/tesoreria` se prerenderiza y `/tesoreria/[id]` compila como ruta dinámica.

# Evidencia — Facturas de proveedor y pagos (2026-09-19)

## Implementado

- Nuevas rutas `/facturas`, `/facturas/nueva`, `/facturas/[id]` y `/pagos`, con acceso limitado al rol real `admin`.
- Nuevos contratos, adaptadores bearer y reglas puras para facturas, cuentas por pagar y pagos. Los importes transportados por API se mantienen como strings; los cálculos de asignación usan centavos con `BigInt`.
- El alta de factura permite OC opcional, vencimiento sugerido por plazo del proveedor, preview puramente orientativo y confirmación explícita de varianza que devuelve el backend. El detalle permite editar campos admitidos, anular sin pagos y navegar a registrar pago.
- Pagos muestra documentos abiertos y pagos registrados; el modal distribuye por vencimiento, valida excesos y expone remanente como anticipo. Se incorporaron Facturas y Pagos a la navegación y el botón Facturar de OC abre el alta precompletada.

## Decisiones

- El saldo, total y estado de pago se muestran exclusivamente desde las respuestas de `payables`; el preview de alta no se envía al backend.
- En modo sin URL de API, los listados de payables quedan vacíos en lugar de inventar comprobantes financieros.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS con un warning preexistente/de dependencia de efecto en el formulario de factura.
- `pnpm test`: PASS — 67 tests.
- `pnpm build`: PASS — incluye `/facturas`, `/facturas/nueva`, `/facturas/[id]` y `/pagos`.

# Evidencia — Proveedores y cuenta corriente (2026-09-19)

## Implementado

- El listado de proveedores incorpora saldo abierto, vencido y filtro **Con deuda**. Los balances se cargan en bloque con `GET /suppliers/balances?supplierIds=`, sin N+1.
- La ficha incorpora Resumen por moneda, Compras, Facturas, Pagos, Cuenta corriente con período, Datos e Historial. Los montos y el saldo acumulado se muestran tal como los entrega la API.
- El formulario soporta razón social, nombre comercial, condición/plazo de pago y CUIT normalizado/validado por módulo 11. Los inactivos advierten que no pueden utilizarse en nuevas órdenes.
- Registrar pago reutiliza el flujo existente de `/pagos` con el proveedor preseleccionado; Nueva factura enlaza a `/facturas/nueva?supplierId=`.
- Se amplió el contrato/adaptador `supplier-*` para account, movements, balances y events; se agregaron pruebas puras y `docs/supplier-operations.md`.

## Decisiones

- `name` se presenta como nombre comercial y `legalName` como razón social, de acuerdo con los campos reales del backend.
- En modo fixture, los datos financieros se muestran en cero/vacíos; no se inventan documentos ni saldos financieros.
- La navegación de Proveedores ya existía en `admin-shell.tsx`, por lo que no se modificó para evitar un cambio ajeno a la tarjeta.

## Verificación ejecutada

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 69 tests (con warnings preexistentes de módulos JS sin `type: module`).
- `pnpm build`: PASS — incluye `/proveedores` y `/proveedores/[supplierId]`.
# Controles funcionales de imagen y estado de producto — 2026-09-22

# Auditoría del backoffice SuperX

Fecha: 2026-09-22. Alcance: `app/` completo de `superx_backoffice` (Next.js). Método: lectura directa de rutas, componentes, adaptadores (`*-api.ts`), contratos (`*-contract.ts`) y reglas (`*-rules.js`), más `git log`/`EVIDENCE.md` para reconstruir qué ya se construyó y verificó en sesiones previas. No se ejecutó una pasada visual en navegador real en esta auditoría (sin `claude-in-chrome` disponible) — las observaciones de diseño son de código/markup, no de screenshot.

**Hallazgo de contexto clave:** el backoffice está mucho más maduro de lo que sugiere el prompt de origen. Ya hubo dos pasadas de rediseño "estilo Odoo" (`691d10e`, `3c90b37`) y una reescritura completa de productos/precios/inventario/ubicaciones (`7a97cbc`, `f4ba59f`) más 14 tarjetas de compras/proveedores/finanzas (`a71b560`..`81d1e20`). La ficha de producto YA tiene smart buttons + tabs + acciones (Guardar/Duplicar/Más opciones) casi exactamente como pide el prompt. La auditoría se centra en gaps reales, no en reconstruir lo que ya existe.

Prioridad: P0 = bloqueante/error · P1 = mejora importante · P2 = mejora visual/UX · P3 = mejora futura.

---

## 1. Estructura visual general (sidebar, header, shell)

**Archivos:** `app/components/admin-shell.tsx`, `app/globals.css`, `app/login/page.tsx`, `app/components/login.tsx`.

- **Estado actual:** Sidebar cuadrada, íconos SVG lineales consistentes, estado activo por ruta, command palette (⌘K) con lista de accesos. Footer con email del usuario y logout. Login real (bearer token), sin componente de rol falso.
- **Diseño actual:** Ya cumple el estilo pedido (fondo claro, bordes finos, poco radio, sin gradientes/glassmorphism) — pasa lejos de "CRUD básico".
- **Funcionalidad actual:** Nav estático con 15 ítems en una sola lista plana (sin agrupar por área: catálogo / compras+finanzas / operaciones). Command palette solo repite el mismo nav, no busca por texto libre entre entidades (productos, proveedores, pedidos).
- **Problemas visuales:** Con 15 ítems la sidebar es una lista larga sin jerarquía — el prompt pide "agrupación" explícitamente y hoy no existe ninguna.
- **Problemas funcionales:** Ninguno bloqueante. El breadcrumb/título de página se resuelve por cada `workspace` individualmente (`<p className="eyebrow">ÁREA / SECCIÓN</p>`), consistente pero no es un breadcrumb real de Next (no hay componente compartido).
- **Oportunidades de mejora:** Agrupar los 15 ítems en 3-4 secciones con headers pequeños (Catálogo, Compras y proveedores, Finanzas, Operación) dentro del `<nav>` existente — sin tocar rutas ni componentes de página. Convertir el command palette en búsqueda real (filtra la lista por texto) ya que el input existe pero no filtra.
- **Prioridad:** P2 (agrupar sidebar), P3 (búsqueda real en command palette).

## 2. Tablas (consistencia transversal)

**Archivos:** 21 componentes con `<table>` propia: `order-manager.tsx`, `price-workspace.tsx`, `purchase-order-list.tsx`, `purchase-order-detail.tsx`, `supplier-list.tsx`, `supplier-detail.tsx`, `invoice-manager.tsx`, `payment-manager.tsx`, `expense-list.tsx`, `asset-manager.tsx`, `treasury-ledger.tsx`, `treasury-manager.tsx`, `inventory-list.tsx`, `location-panels.tsx`, `warehouse-stock-view.tsx`, `warehouses-page.tsx`, `product-manager.tsx`, `product-operation-tabs.tsx`, `packaging-manager.tsx`, `dashboard-workspace.tsx`, `purchase-order-form.tsx`, `purchase-order-receipt.tsx`, `asset-detail.tsx`.
- **Estado actual:** Cada tabla se escribe a mano con su propio `<table className="...">`. Todas comparten las mismas clases CSS base (bordes finos, header shaded, filas clicable con `tabIndex`/`role="link"`) — el look es consistente porque el CSS es compartido, pero el *código* está duplicado 21 veces (paginación, orden de columnas, estado vacío, fila clicable con teclado se reimplementan cada vez con variaciones sutiles).
- **Diseño actual:** Visualmente ya coherente (grid lines, header shading, badges cuadrados) gracias al CSS global — no es el problema.
- **Funcionalidad actual:** La mayoría tiene búsqueda + filtros + paginación servidor (compras, proveedores, precios). Algunas no tienen orden de columnas (pedidos, entregas). `PricesTable` sí tiene orden por columna (único caso con `sortBy`/`sortOrder` real).
- **Problemas visuales:** Ninguno grave a nivel CSS; el riesgo es que una futura tabla diverja del patrón por copy-paste manual.
- **Problemas funcionales:** Duplicación real de lógica (paginación, fila-clicable-con-teclado, estado vacío) en 21 lugares — exactamente el caso donde el prompt autoriza extraer un componente reutilizable ("crear componente reutilizable solamente si hoy hay mucha duplicación").
- **Badges de estado:** también duplicados — `PriceStatusBadge`, `OrderStatusBadge`, `ReceiptStatusBadge`, `StockStatusBadge`, más badges inline en `supplier-list.tsx`/`treasury-ui.tsx`/`warehouses-page.tsx` — todos renderizan `<span className="status ...">` con la misma estructura pero cada uno redefine su propio mapa de labels/tonos.
- **Oportunidades de mejora:** (a) extraer un primitive `<StatusBadge tone="success|warning|danger|neutral" label="...">` en un archivo compartido (p.ej. `app/components/ui/status-badge.tsx`) y migrar los ~10 badges existentes a usarlo sin cambiar clases CSS (cero impacto visual); (b) extraer un `<DataTable>`/`usePagination` helper mínimo (columnas + filas + paginación + estado vacío) para las tablas que ya comparten esa forma, empezando por las 2-3 más recientes/parecidas (compras, facturas, gastos) antes de tocar las más antiguas.
- **Prioridad:** P1 (StatusBadge compartido — bajo riesgo, alto valor de consistencia futura), P2 (DataTable compartido — más invasivo, hacerlo incremental).

## 3. Detalle de producto

**Archivos:** `app/(backoffice)/productos/[id]/page.tsx`, `app/components/product-manager.tsx`, `app/components/products/{product-header,product-smart-buttons,product-general-tab,product-operation-tabs}.tsx`, `app/lib/product-{api,contract,rules}.*`.

- **Estado actual:** YA implementa casi exactamente el pedido del prompt: header con nombre/estado/categoría/marca/SKU, acciones Guardar/Duplicar/Más opciones (el botón "Más opciones" `•••` es decorativo — no tiene handler ni menú), smart buttons compactos (Stock/Precio/Costo/Margen/Ventas) que saltan a la tab correspondiente al click, y tabs (Información general/Precios/Inventario/Presentaciones de compra/Tienda online/Configuración).
- **Diseño actual:** Ya en línea con el estilo ERP pedido — no es un CRUD plano.
- **Funcionalidad actual:** Datos reales (categorías/marcas/unidades vienen de la API real, no mock). Presentaciones de compra reales y conectadas.
- **Problemas visuales:** Ninguno grave.
- **Problemas funcionales (reales, verificados en código):**
  1. El uploader de imagen está **deshabilitado** (`<input type="file" ... disabled>` en `product-general-tab.tsx`) — es un botón decorativo que no hace nada, justo lo que el prompt prohíbe explícitamente ("no dejar botones decorativos"). Hoy la única forma de poner imagen es pegar una URL en "URL técnica".
  2. Los campos "Subcategoría", "Contenido / presentación" y "Unidad contenido" están **siempre deshabilitados** con placeholders tipo "Disponible al ampliar categorías" — son honestos (no mienten) pero ocupan espacio de formulario sin función.
  3. El botón "Más opciones" (`•••`) no tiene ninguna acción — es decorativo.
  4. El smart button "Ventas" siempre muestra "—" porque no existe ningún endpoint de ventas por producto en el backend — es un placeholder permanente, no un bug, pero visualmente promete un dato que nunca llega.
- **Oportunidades de mejora:** Implementar upload real de imagen (verificar primero si el backend ya tiene un endpoint de subida de archivos antes de construir uno) o, si no es sencillo, ocultar el control deshabilitado en vez de mostrarlo roto. Dar función real a "Más opciones" (activar/desactivar, eliminar si corresponde) o quitarlo. Ocultar/quitar los 3 campos siempre-deshabilitados hasta que exista el dato real detrás (menos ruido visual, cero botones decorativos).
- **Prioridad:** P1 (uploader deshabilitado + botón "Más opciones" decorativo — ambos violan la regla explícita "no dejar botones decorativos"), P3 (campos deshabilitados de subcategoría/contenido, "Ventas" placeholder).

## 4. Inventario

**Archivos:** `app/(backoffice)/inventario/page.tsx`, `app/components/inventory-manager.tsx` + subcarpeta `app/components/inventory/*` (7 archivos: grid/list/detail-panel/filters-bar/page-header/stats-cards/view-toggle/ui).

- **Estado actual:** Ya está fraccionado en componentes pequeños con responsabilidad clara (no es un archivo gigante). Toggle grid/lista, stats cards arriba, panel de detalle lateral, ajuste de stock vía modal con confirmación explícita (nunca edita stock directo — genera un `InventoryMovement` auditable, tal como pide el prompt: "no se cambia stock directamente sin migración segura").
- **Diseño actual:** Cumple el estándar ERP — tarjetas de producto con estado de stock (badge), no un formulario plano.
- **Funcionalidad actual:** Conectado a backend real (`GET /inventory`, movimientos). Sin threshold de "stock bajo" configurable por producto (documentado como gap conocido de backend en memoria — no hay campo `reorderThreshold`, así que el estado "low" nunca dispara).
- **Problemas visuales:** Ninguno grave.
- **Problemas funcionales:** El estado "bajo stock" nunca se activa en la práctica porque el backend no tiene el campo — esto es un gap de backend, no de UI, y excede el alcance "sólo backoffice" salvo que se decida agregar el campo.
- **Oportunidades de mejora:** Ninguna urgente en el frontend; documentar el gap de backend para una futura tarjeta si se decide.
- **Prioridad:** P3 (depende de backend, fuera del alcance actual salvo decisión explícita del usuario).

## 5. Compras (órdenes de compra + recepciones + presentaciones)

**Archivos:** `app/(backoffice)/compras/**`, `app/components/purchase-orders/*` (5 archivos), `app/components/purchasing/packaging-manager.tsx`, `app/lib/purchase-order-*`, `app/lib/packaging-rules.js`.

- **Estado actual:** Módulo ya "se siente ERP" — listado con filtros por proveedor/depósito/estado/recepción/fecha, paginación servidor, barra de progreso de recepción cuando el backend la entrega, ruta dedicada `/compras/[id]/recibir` con idempotencia y motivo obligatorio para exceso, timeline de eventos, botón Facturar (enlaza a `/facturas/nueva?supplierId=` cuando corresponde).
- **Diseño actual:** Documento-estilo (no un CRUD), consistente con el resto.
- **Funcionalidad actual:** Completo para el alcance operativo acordado (ver memoria — CP-001/003/004; tesorería/facturas ya se sumaron después).
- **Problemas visuales/funcionales:** No se detectaron bloqueantes en esta pasada.
- **Prioridad:** P3 (nada urgente detectado; revalidar con navegador real cuando haya oportunidad).

## 6. Proveedores

**Archivos:** `app/(backoffice)/proveedores/**`, `app/components/suppliers/*`.

- **Estado actual:** Ficha con Resumen por moneda, Compras, Facturas, Pagos, Cuenta corriente, Datos e Historial — exactamente la estructura que pide el prompt ("Información / Productos / Compras / Pagos"). Balance cargado en bloque (`GET /suppliers/balances?supplierIds=`), sin N+1.
- **Diseño/funcionalidad:** Ya completo y verificado (`EVIDENCE.md` "Proveedores y cuenta corriente"). Bug de foco al escribir ya arreglado (`9e4b031`).
- **Problemas:** No se detectaron en esta pasada.
- **Prioridad:** P3.

## 7. Pedidos

**Archivo:** `app/components/order-manager.tsx` (único archivo, 77 líneas densas — no fraccionado en subcarpeta a diferencia de inventario/productos/locations).

- **Estado actual:** Dashboard de conteo por estado arriba, tabla con búsqueda/estado/fecha, detalle lateral con acciones de transición (checklist de empaque obligatorio antes de READY, motivo opcional, historial de eventos reversado). Roles simulados vía `RolePicker` local (viewer/operator/admin) — no es el rol real logueado, a diferencia de proveedores/compras que ya migraron a `getStoredUser().role`.
- **Diseño actual:** Cumple el estilo pedido (badges de estado, timeline).
- **Funcionalidad actual:** Conectado a backend real.
- **Problemas visuales:** Ninguno grave; el archivo es denso (una sola línea gigante por componente, típico de todo el repo) pero no es "ComponentForEverything" en el sentido del prompt — sigue siendo un solo dominio.
- **Problemas funcionales:** El selector de rol es un simulador local (`role-picker`) que no reflejaba el rol real logueado — inconsistente con el patrón ya adoptado en proveedores/compras/facturas ("gatea según el rol real, no un selector"). Esto es una regresión de consistencia UX: dos pantallas del mismo backoffice usan reglas de permisos distintas (una simulada, otra real).
- **Oportunidades de mejora:** Migrar `OrderManager`/`DeliveryManager`/`InventoryManager`/`PriceWorkspace`/`KpiDashboard` (los que aún usan `RolePicker` simulado) al mismo patrón de rol real que ya usan proveedores/compras/facturas/pagos/gastos/inversiones/tesorería, por consistencia y porque simular un rol distinto al logueado es confuso operativamente.
- **Prioridad:** P1 (consistencia de permisos entre dominios — afecta a 5 pantallas: pedidos, entregas, inventario, precios, tablero).

## 8. Entregas

**Archivo:** `app/components/delivery-manager.tsx` (248 líneas, único archivo — el más grande sin fraccionar del repo junto con order-manager).

- **Estado actual:** Zonas + franjas horarias en un mismo panel, edición inline con diálogos, permisos por rol (simulado, ver punto 7).
- **Diseño actual:** Cumple el estilo pedido.
- **Funcionalidad actual:** Conectada a backend real (zonas/slots).
- **Problemas:** Mismo gap de rol simulado que pedidos (punto 7). Es el archivo más grande del repo sin dividir — no es bloqueante pero si crece más conviene fraccionarlo como se hizo con inventario/productos/ubicaciones.
- **Oportunidades de mejora:** Migrar a rol real (junto con pedidos). Fraccionar en subcomponentes si se le agrega funcionalidad nueva, no como tarea aislada.
- **Prioridad:** P1 (rol real, junto con pedidos), P3 (fraccionar archivo).

## 9. Zonas → ver "Entregas" (punto 8); "Ubicaciones" es un módulo aparte (depósitos/posiciones de picking)

**Archivos:** `app/(backoffice)/ubicaciones/**`, `app/components/locations/*`, `app/components/location-{list,detail,ui}.tsx`.

- **Estado actual:** Ya dividido en 3 pantallas navegables (depósitos → ubicaciones → detalle), con vista de stock por producto en cada depósito — construido y documentado en `EVIDENCE.md` como trabajo reciente y deliberado.
- **Problemas:** No se detectaron en esta pasada.
- **Prioridad:** P3.

## 10. Dashboard(s)

**Archivos:** `app/(backoffice)/tablero/page.tsx` + `app/components/kpi-dashboard.tsx` + `app/lib/metrics-*` · `app/(backoffice)/administracion/page.tsx` + `app/components/dashboard/dashboard-workspace.tsx`.

- **Estado actual:** Hay **dos dashboards distintos**, ambos en la sidebar: "Tablero" (KPIs operativos: pedidos, GMV, cancelaciones, stockouts, fill rate, tiempos de picking/entrega) y "Administración" (dashboard financiero/compras: obligaciones, tesorería — construido en la sesión más reciente, con datos reales).
- **Diseño actual:** Ambos ya con jerarquía visual, sin gráficos decorativos superfluos — el de Tablero tiene un gráfico de barras simple de pedidos/día, justificado (ayuda a ver tendencia, no decorativo).
- **Funcionalidad actual — hallazgo real:** `app/lib/metrics-api.ts` (el que alimenta "Tablero") es **100% mock**, explícitamente marcado `/** Mock TEMPORAL: reemplazar por GET /api/metrics/overview. Todas las cifras las define y calcula el backend. */` — genera datos pseudo-aleatorios deterministas. No existe ningún endpoint de métricas en el backend (confirmado en sesiones previas). Esto contradice la regla explícita del prompt "NO usar datos falsos si existen datos reales" — aquí no existen datos reales aún, pero la pantalla no lo comunica: se ve como un dashboard con cifras reales.
- **Problemas funcionales:** Un dashboard con datos 100% inventados sentado junto a uno con datos 100% reales, sin ninguna señal visual de que uno es demo y el otro no — riesgo real de que un operador tome una decisión sobre una cifra de "Tablero" creyendo que es real.
- **Oportunidades de mejora:** Corto plazo (sin tocar backend): agregar un aviso visible en `/tablero` ("Datos de demostración — pendiente de conectar al backend") en vez de dejarlo indistinguible de una pantalla real. Largo plazo (requiere backend, fuera de alcance salvo decisión explícita): construir `GET /metrics/overview` real.
- **Prioridad:** P1 (etiquetar honestamente los datos demo — bajo esfuerzo, evita una decisión operativa mal informada), P3 (endpoint real de métricas — requiere backend).

## 11. Resto de módulos (facturas, pagos, gastos, inversiones, tesorería)

**Archivos:** `app/(backoffice)/{facturas,pagos,gastos,inversiones,tesoreria}/**`, componentes homónimos en `app/components/{invoices,payments,expenses,assets,treasury}/*`.

- **Estado actual:** Construidos en la ronda de 14 tarjetas (2026-09-19/20), cada uno con contrato + adapter real + reglas puras + tests, documentados en `EVIDENCE.md`. Dinero en `BigInt` centavos para cálculos críticos, strings decimales para transporte — patrón correcto y consistente.
- **Problemas:** No se detectaron en esta pasada (no releídos línea por línea por presupuesto de tiempo — se confía en la verificación ya documentada en `EVIDENCE.md`, que incluye typecheck/lint/test/build en verde para cada uno).
- **Prioridad:** P3 (revisar con navegador real cuando sea posible, no releer código sin motivo).

## 12. Picking y Reparto (pantallas móviles, fuera de AdminShell)

**Archivos:** `app/picking/*`, `app/reparto/*`.

- **Estado actual:** Fuera del alcance del prompt (que lista dashboard/productos/precios/inventario/ubicaciones/compras/proveedores/pedidos/entregas/zonas/administración/finanzas/configuración — no picking/reparto explícitamente, aunque son parte real del backoffice). Ya wireadas a backend real, con su propio login (`?next=/picking`).
- **Prioridad:** no priorizado en este plan — mismo estilo squared ya aplicado, sin cambios pedidos.

## 13. Feedback global (toasts/loading/confirmación/disabled)

- **Estado actual:** `window.alert` **no se usa en ningún lugar** del código de aplicación (grep limpio) — cumple la regla del prompt. Cada `*-manager`/`*-workspace` implementa su propio patrón de `notice`/`loadError`/estados de carga (`ListSkeleton`) y confirmación (diálogos modales `role="alertdialog"`) de forma consistente entre dominios, aunque no comparten un componente `<Toast>` único — cada uno reimplementa el mismo patrón `{kind:"success"|"error", text}` con su propio JSX.
- **Prioridad:** P3 (unificar en un componente `<Notice>` compartido — bajo impacto, alta duplicación pero de bajo riesgo).

---

## Resumen de prioridades

| Prioridad | Cantidad | Ítems |
|---|---|---|
| P0 | 0 | Ninguno detectado — no hay errores bloqueantes en esta auditoría. |
| P1 | 5 | StatusBadge compartido · uploader de imagen deshabilitado + botón "Más opciones" decorativo en ficha de producto · rol simulado vs. rol real (pedidos/entregas/inventario/precios/tablero) · etiquetar "Tablero" como datos demo |
| P2 | 2 | Agrupar sidebar por secciones · DataTable compartido (incremental) |
| P3 | ~10 | Búsqueda real en command palette · campos deshabilitados de producto · fraccionar delivery-manager.tsx · endpoint real de métricas (backend) · threshold de stock bajo (backend) · Toast/Notice compartido · revisión visual en navegador real de todos los módulos |

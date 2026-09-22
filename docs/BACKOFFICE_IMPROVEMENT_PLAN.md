# Plan de mejora del backoffice SuperX

Basado en `docs/BACKOFFICE_AUDIT.md` (2026-09-22). Cada ítem está escrito para ser una tarea acotada delegable a Codex (pocos archivos, un resultado claro), respetando las reglas del prompt de origen: no rehacer, no duplicar, no romper lo que funciona, no usar datos falsos sin avisar, no dejar botones decorativos.

Etiquetas: **KEEP** (ya funciona bien, no tocar) · **IMPROVE** (funciona pero necesita mejor UI/UX) · **COMPLETE** (existe parcial, terminarlo) · **REMOVE** (duplicado/innecesario) · **ADD** (falta de verdad y aporta valor).

Orden de ejecución (adaptado del prompt según lo que reveló la auditoría — la mayoría de "estructura visual general" y "detalle de producto" ya está hecho, así que el orden real prioriza los gaps encontrados):

---

### 1. StatusBadge compartido — IMPROVE (P1)
**Qué:** Extraer un primitive único `app/components/ui/status-badge.tsx` con `<StatusBadge tone="success|warning|danger|neutral|info" label="...">`, usando las mismas clases CSS que ya existen (`status`, `status-*`) para no cambiar nada visualmente. Migrar los badges duplicados uno por uno: `PriceStatusBadge` (price-workspace.tsx), `OrderStatusBadge`/`ReceiptStatusBadge` (purchase-order-ui.tsx), `StockStatusBadge` (inventory-ui.tsx), badges de `supplier-list.tsx`, `treasury-ui.tsx`, `warehouses-page.tsx`, estado de pedidos en `order-manager.tsx`.
**Por qué ahora:** Bajo riesgo (es una extracción, no un rediseño), alta duplicación real (10+ implementaciones del mismo patrón), y sienta la base para cualquier ajuste visual futuro de estados en un solo lugar.
**Alcance:** Solo estos ~10 archivos + el nuevo primitive. No tocar layout, no tocar lógica de negocio, no tocar CSS existente (reutilizar clases).
**Verificación:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build`; confirmar visualmente (o por diff de clases) que ningún badge cambió de clase CSS.

### 2. Uploader de imagen y botón "Más opciones" en ficha de producto — COMPLETE (P1)
**Qué:**
- (a) Investigar primero si el backend ya tiene un endpoint de subida de archivos (buscar en `superx_back` algo como `/uploads`, `/media`, o multer/S3 config) antes de decidir el enfoque.
  - Si existe: conectar el `<input type="file">` de `product-general-tab.tsx` (hoy `disabled`) a ese endpoint real.
  - Si no existe y no es trivial agregarlo: quitar el control deshabilitado (dejar solo el campo "URL técnica" que ya funciona) en vez de mostrar un botón que no hace nada — cumple la regla "no dejar botones decorativos" sin inventar backend nuevo fuera de alcance.
- (b) Dar función real al botón "Más opciones" (`•••` en `product-header.tsx`) — al menos activar/desactivar el producto (ya existe esa acción en algún lugar del flujo, reutilizarla) — o quitarlo si no hay ninguna acción real que colgar ahí todavía.
**Por qué ahora:** Viola directamente la regla explícita del prompt ("no dejar botones decorativos") en la pantalla que el prompt marca como prioridad máxima.
**Alcance:** `app/components/products/product-general-tab.tsx`, `app/components/products/product-header.tsx`, `app/components/product-manager.tsx`. Backend solo si la investigación confirma que el endpoint ya existe.
**Verificación:** typecheck/lint/test/build + probar manualmente el flujo de guardar producto con y sin imagen.

### 3. Rol real en lugar de rol simulado (pedidos, entregas, inventario, precios, tablero) — IMPROVE (P1)
**Qué:** Reemplazar el `RolePicker` local (`useState<UserRole>("admin")` + selector manual) por el rol real del usuario logueado (`getStoredUser().role`), siguiendo exactamente el patrón que ya usan proveedores/compras/facturas/pagos/gastos/inversiones/tesorería. Afecta: `order-manager.tsx`, `delivery-manager.tsx`, `inventory-manager.tsx` (vía `inventory-page-header.tsx`), `price-workspace.tsx`, `kpi-dashboard.tsx`.
**Por qué ahora:** Es una inconsistencia real de UX/seguridad percibida entre pantallas del mismo backoffice — un operador puede "simular" ser admin en pedidos pero no en proveedores, lo cual es confuso y no refleja permisos reales.
**Alcance:** 5 archivos, cambio mecánico y acotado (reemplazar `useState` + `<select>` de rol por lectura de `getStoredUser()`, igual que en `purchase-order-list.tsx`). No tocar la lógica de permisos en sí (`get*Permissions(role)` ya existente), solo la fuente del `role`.
**Verificación:** typecheck/lint/test/build; confirmar que cada pantalla sigue mostrando/ocultando acciones según el rol real logueado (probar con la cuenta admin real documentada en memoria).

### 4. Etiquetar "Tablero" como datos de demostración — COMPLETE (P1)
**Qué:** En `kpi-dashboard.tsx` (ruta `/tablero`), agregar un aviso visible (banner o nota junto al header) que indique que las cifras son de demostración hasta que exista un endpoint real de métricas — mismo patrón que ya usan otros avisos del sistema (`notice`/`form-summary`). No borrar la pantalla ni el mock: sigue siendo útil para previsualizar el diseño.
**Por qué ahora:** Evita que un operador confunda una cifra inventada con una real — cumple la regla "no usar datos falsos si existen datos reales" en su espíritu (si no hay datos reales, decirlo, no disimularlo).
**Alcance:** Un archivo (`kpi-dashboard.tsx`), un componente visual nuevo pequeño, sin tocar `metrics-api.ts` ni pedir backend nuevo.
**Verificación:** typecheck/lint/test/build.

### 5. Agrupar sidebar por secciones — IMPROVE (P2)
**Qué:** Dividir los 15 ítems planos de `admin-shell.tsx` en 3-4 grupos con un header de sección pequeño y sobrio (ej.: "Catálogo" → Productos/Precios/Inventario/Ubicaciones; "Compras y proveedores" → Proveedores/Compras/Facturas/Pagos; "Finanzas" → Gastos/Inversiones/Tesorería; "Operación" → Tablero/Administración/Pedidos/Entregas), manteniendo el mismo `<nav>`/mismos `Link`/mismos íconos — solo agregar agrupación visual, no reordenar de forma que rompa el command palette.
**Por qué ahora:** El prompt pide explícitamente "agrupación" en el sidebar y hoy no existe ninguna con 15 ítems en una lista plana.
**Alcance:** Solo `admin-shell.tsx` (y su CSS si hace falta un `<h3>`/separador nuevo). Cero cambios de rutas.
**Verificación:** typecheck/lint/test/build; confirmar que el orden de tabulación/teclado del sidebar sigue siendo lógico.

### 6. DataTable compartido — incremental — IMPROVE (P2)
**Qué:** NO reescribir las 21 tablas de una vez (riesgo alto, prohibido por "no reemplazar tablas funcionales sin necesidad"). Empezar por extraer un helper mínimo reutilizable (paginación + fila-clicable-con-teclado + estado vacío, sin forzar columnas genéricas) a partir de las 2-3 tablas más recientes y más parecidas entre sí (`purchase-order-list.tsx`, la tabla de `invoice-manager.tsx`, la de `expense-list.tsx`), y usarlo en esas tres primero. Dejar las demás tablas (pedidos, precios, inventario, tesorería) sin tocar hasta validar que el patrón funciona bien en esas tres.
**Por qué ahora:** Cumple el umbral que el prompt exige ("solamente si hoy hay mucha duplicación" — hay 21 implementaciones) pero de forma incremental y de bajo riesgo, no como reescritura masiva.
**Alcance:** Un nuevo archivo compartido + 3 archivos migrados en esta primera pasada.
**Verificación:** typecheck/lint/test/build; diff visual de las 3 tablas migradas (deben verse idénticas).

### 7. Command palette con búsqueda real — ADD (P3)
**Qué:** El input `⌘K` hoy solo repite la lista de navegación sin filtrar. Agregar filtro de texto libre sobre los 15 ítems (fuzzy simple, sin librería nueva).
**Por qué:** Bajo esfuerzo, mejora real de navegación, no rompe nada existente.
**Alcance:** Solo `admin-shell.tsx`.

### 8. Limpiar campos siempre-deshabilitados en ficha de producto — REMOVE (P3)
**Qué:** Quitar (u ocultar tras un "próximamente" más honesto) los campos "Subcategoría", "Contenido / presentación" y "Unidad contenido" en `product-general-tab.tsx`, que están permanentemente deshabilitados sin dato real detrás.
**Por qué:** Ruido visual sin función — no es urgente porque son honestos (dicen "disponible al ampliar categorías"), pero ocupan espacio de formulario.
**Alcance:** Un archivo.

### 9. Fraccionar `delivery-manager.tsx` — IMPROVE (P3)
**Qué:** Si se toca este archivo para el ítem 3 (rol real), aprovechar para dividirlo siguiendo el mismo patrón que ya se usó en inventario/productos/ubicaciones (subcarpeta `app/components/delivery/` con zona-list, zona-detail, slot-panel, etc.) — solo si el cambio de rol ya obliga a tocarlo; no abrir esta tarea de forma aislada.
**Por qué:** Es el archivo más grande sin fraccionar (248 líneas) y el patrón de fraccionamiento ya es el estándar del repo — pero no amerita una tarea propia sin otro motivo para tocarlo.
**Alcance:** Condicional al ítem 3.

### 10. Notice/Toast compartido — IMPROVE (P3)
**Qué:** Extraer el patrón `{kind:"success"|"error", text}` + su JSX (repetido en casi todos los `*-manager`/`*-workspace`) a un componente `<Notice>` común.
**Por qué:** Duplicación real pero de bajo riesgo/bajo impacto visual — hacerlo cuando se toque cualquiera de esos archivos por otro motivo, no como tarea aislada prioritaria.

### 11. Backend: threshold de stock bajo y endpoint de métricas — ADD, FUERA DE ALCANCE actual (P3)
**Qué:** Ambos requieren trabajo de backend (`superx_back`), no solo backoffice. No iniciar sin decisión explícita del usuario, siguiendo el mismo criterio que ya se usó para el alcance de compras/tesorería (ver memoria del proyecto).

---

## Módulos ya evaluados como KEEP (no tocar salvo que la auditoría los haya marcado arriba)

Compras/recepciones · Proveedores · Ubicaciones (depósitos) · Inventario (estructura y flujo de ajuste) · Ficha de producto (estructura general: header/smart buttons/tabs) · Facturas · Pagos · Gastos · Inversiones · Tesorería · Login · Picking · Reparto. Todos ya construidos, conectados a backend real y verificados (typecheck/lint/test/build) en sesiones previas documentadas en `EVIDENCE.md`.

## Siguiente paso

Empezar por los ítems 1-4 (P1), en ese orden, delegando cada uno a Codex como una tarea independiente con su propio commit, verify y evidencia — sin pedir confirmación por cada cambio menor, según el modo de trabajo acordado.

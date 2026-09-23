# Compras ERP — auditoría y plan por etapas

Fuente: `/home/dev/superx/prompt_compras.md` (2026-09-23). Roles: Claude orquesta/revisa, Codex implementa.

## 1. Arquitectura encontrada

- **Backend** `superx_back` (NestJS + TypeORM + PostgreSQL, migraciones versionadas, sin `synchronize`).
  - `src/purchasing/`: `Supplier`, `SupplierEvent`, `PurchasePackaging` (presentaciones por producto, genérica o por proveedor, con `supplierCode`, `barcode`, `isDefault`), `PurchaseOrder` + `PurchaseOrderItem` (snapshot de presentación, packs, unidades, costo pack/unit., descuento $, IVA %, totales), `PurchaseOrderEvent` (auditoría), `GoodsReceipt` + `GoodsReceiptItem` (recepciones parciales múltiples, idempotencia, sobre-recepción autorizada con motivo).
  - `src/payables/`: `SupplierInvoice` (tipo comprobante, PV/número, emisión, vencimiento, varianza vs OC), `Payment` + `PaymentAllocation` (pagos parciales, reversa), cuenta corriente por proveedor, saldos/vencidos derivados.
  - `src/treasury/`: cuentas y movimientos (los pagos impactan tesorería).
  - `src/inventory/`: `InventoryMovement` (tipo `PURCHASE`, `RETURN`, …) + `StockSnapshot` (con `reorder_threshold`) — la recepción ya usa `applyPurchaseReceipt` + `LocationStock` por ubicación.
  - `src/catalog/`: `Product` (`cost` único, sin historial), `Barcode[]`, `Unit` dinámica, `Category`, `Brand`.
  - `src/pricing/`: listas de precio, `PriceRule` (margen mínimo + redondeo por categoría/global), `PriceChangeLog` (historial de precio **y** costo), helpers `calculateMarginPercent`/`suggestedPriceFromCost`.
  - RBAC: roles `admin | picker | driver | customer`. Todo compras/finanzas es `ADMIN`. No hay rol comprador/depósito.
- **Backoffice** `superx_backoffice` (Next 16 / React 19, CSS propio en `app/globals.css` con tokens `--ink --muted --line --canvas --surface --green --red --yellow`, estética ERP cuadrada). Patrón por dominio: `app/lib/<x>-{api,contract}.ts` + `<x>-rules.js` (tests `node --test`) + `app/components/<x>/…`. Componentes compartidos: `ui/notice`, `ui/status-badge`, `ui/table-pagination`.
  - Rutas: `/compras` (lista), `/compras/nueva`, `/compras/[id]`, `/compras/[id]/editar`, `/compras/[id]/recibir`, `/proveedores(+[id] con tabs)`, `/facturas(+nueva,[id])`, `/pagos`, `/tesoreria`, `/administracion`.

## 2. Funcionalidades existentes (✅) vs faltantes (❌)

| Área | Estado |
|---|---|
| OC borrador/confirmar/cancelar/cerrar con auditoría | ✅ backend + UI |
| Confirmar no toca stock | ✅ |
| Presentaciones (pack/caja x N) por producto/proveedor, conversión a unidades | ✅ (`PurchasePackaging`) — sin tipo (UNIDAD/PACK/CAJA/BULTO/…) ni costo habitual |
| Recepción parcial múltiple → `InventoryMovement PURCHASE` + stock por ubicación | ✅ — sin lote/vencimiento/rechazado |
| Facturas proveedor, pagos parciales, CxP, vencidos | ✅ |
| Descuento $ e IVA % por línea | ✅ backend, UI no los expone en la grilla |
| Condición de pago/vencimiento/flete/otros en la OC | ❌ |
| Contexto de proveedor al elegirlo | ❌ |
| Grilla densa editable con teclado, combobox de producto con stock/último costo | ❌ (formulario básico) |
| Crear producto inline (drawer) | ❌ |
| Scanner EAN (enter) → agregar / crear | ❌ (búsqueda de producto ya matchea barcode exacto) |
| Historial de costos por producto+proveedor, último costo, variación | ❌ (solo `Product.cost` + `PriceChangeLog`) |
| Precio de venta actual / margen / sugerido en la OC | ❌ (helpers existen en pricing) |
| Descuento %/general, bonificaciones | ❌ |
| Duplicar / eliminar borrador | ❌ |
| Lista con recibido/pagado/saldo/creador | parcial |
| Devoluciones a proveedor | ❌ (existe tipo `RETURN`) |
| Compra desde faltantes / sugerida | ❌ (`reorder_threshold` existe) |
| Importar CSV/XLSX a la OC | ❌ |

## 3. Problemas detectados

1. `purchase-order-form.tsx` es un formulario vertical, sin teclado, búsqueda con `setTimeout` sin cancelar (resultados viejos pueden pisar nuevos), sin último costo, sin totales separados.
2. `packageQuantity` en UI admite decimales (`step 0.01`) pero backend exige entero → error tardío.
3. El fixture/mock sigue mezclado en `purchase-order-api.ts` (convención del repo: fallback cuando no hay `NEXT_PUBLIC_SUPERX_API_BASE_URL`); se mantiene, pero los nuevos endpoints no deben inventar datos en modo real.
4. La recepción no actualiza `Product.cost` ni deja historial de costo.
5. Estados: el modelo ya separa `status` + `receiptStatus`; el estado de pago se deriva de facturas/allocations. **Decisión: no crear enum gigante**; `paymentStatus` se expone derivado (ETAPA 10).

## 4. Decisiones de arquitectura

- **No se crean** `SupplierProduct` ni `ProductPackaging` nuevos: `PurchasePackaging` ya es la presentación con proveedor/código proveedor; se amplía (tipo, costo habitual, mínimo de compra, lead time) cuando toque.
- **Historial de costos**: nueva tabla `product_cost_history` (producto, proveedor, presentación, costo unitario, origen OC/recepción) escrita en la recepción (y opcionalmente al confirmar). `Product.cost` = último costo recibido.
- **Margen objetivo**: reutilizar `PriceRule.minMarginPercent` (categoría → global). Precedencia futura producto > categoría > proveedor > global se agrega sólo si hace falta.
- **Fórmulas**: una sola fuente en frontend (`purchase-order-rules.js`) y otra en backend (`purchasing-rules.ts`, BigInt). El backend es la verdad de totales.
- **RBAC**: se mantiene `ADMIN` (no se inventa RBAC nuevo).

## 5. Plan por etapas

| # | Etapa | Backend | Backoffice |
|---|---|---|---|
| 1 | Auditoría y arquitectura | — | este documento |
| 2 | Rediseño visual de Nueva compra | condiciones de pago, vencimiento, flete/otros, `confirmedBy/updatedBy`, `GET /suppliers/:id/purchase-context`, duplicar, eliminar borrador | editor de OC: cabecera compacta, contexto de proveedor, resumen sticky, Guardar borrador / Confirmar pedido, Ctrl/Cmd+S, duplicar/eliminar |
| 3 | Grilla editable | `GET /purchasing/product-search` (nombre/EAN/código proveedor + stock + último costo + presentaciones) | grilla densa con teclado, combobox, scanner, advertencia de duplicado, descuento %/$ e IVA por línea |
| 4 | Creación inline de productos | `POST /purchasing/quick-products` (producto + barcode + presentación + costo + precio opcional, transaccional) | drawer lateral "Crear producto y agregar a compra" |
| 5 | Packs y presentaciones | `PurchasePackaging.type` (UNIDAD/PACK/CAJA/BULTO/CAJÓN/DISPLAY/PALLET), costo habitual | selector de presentación en la grilla + alta rápida |
| 6 | Costos e historial | `product_cost_history`, último costo por proveedor, precio actual y margen objetivo | columnas último costo/variación/precio/margen/sugerido + "Aplicar sugerencia" |
| 7 | Recepción parcial | lote, vencimiento, rechazado + motivo por línea | pantalla de recepción densa con escaneo |
| 8 | Inventario | movimientos con referencia a OC/recepción; devoluciones a proveedor (`RETURN`) | devolución desde la OC |
| 9 | Facturas | vínculo factura↔OC ya existe; atajo "Registrar factura" desde la OC | drawer factura desde OC |
| 10 | Pagos y CxP | `paymentStatus` derivado por OC | registrar pago desde OC, lista con pagado/saldo |
| 11 | Proveedores | KPIs (total comprado, ticket promedio, lead time) | ficha con KPIs, productos, costos |
| 12 | Reposición | `GET /purchasing/replenishment` (stock ≤ umbral, agrupado por proveedor) | "Desde faltantes", "Repetir última compra", importar CSV |
| 13 | Testing y refinamiento UX | e2e flujo completo | revisión visual 1366/1920 |

Cada etapa: Codex implementa → Claude revisa diff + corre `typecheck/lint/test/build` (+ e2e focalizado) → corrige → commit + push → siguiente.

# Evidencia de implementación DOC-006

## Cambios realizados

- Se incorporó un layout administrativo compartido con una única sidebar clara, compacta y con navegación real a `/productos`, `/precios` e `/inventario`.
- Se movieron los tres managers a rutas App Router y se corrigió la metadata específica de cada sección. La ruta `/` redirige a `/inventario`.
- Se eliminaron las sidebars internas de los managers, sin modificar adaptadores, contratos, reglas ni operaciones.
- Se aplicaron los tokens DOC-006: Geist, verde `#149C3B` (pressed `#0F7F30`), amarillo de advertencia `#FFD51E`, fondos claros, radio de 12px y objetivos táctiles de al menos 44px.
- Se reemplazaron las cargas principales por skeletons y se agregó detección offline con mensaje y acción de reintento.

## Verificación ejecutada

| Comando | Resultado |
| --- | --- |
| `pnpm lint` | Correcto |
| `pnpm typecheck` | Correcto |
| `pnpm test` | Correcto: 7 pruebas aprobadas |
| `pnpm build` | Correcto: rutas `/productos`, `/precios` e `/inventario` generadas |
| `rg -n -i 'fintech|banco|banking|tarjeta|crédito|credito|cuenta|transferencia bancaria' app` | Sin coincidencias de vocabulario fintech/bancario |
| `rg -n -- '--blue|#285cc5' app` | Sin coincidencias |

Las pruebas existentes de RBAC y validaciones se mantienen sin cambios y aprobaron: permisos de ajuste de inventario, actualización masiva de precios, eliminación de productos, barcode y validación de importes/stock. Las confirmaciones de acciones sensibles permanecen en los managers.

## Decisiones y supuestos

- Se conservó la ruta raíz como redirección a Inventario para preservar el punto de entrada anterior sin duplicar contenido.
- El estado offline se detecta antes de cargar mediante `navigator.onLine`; los errores continúan mostrando el patrón existente de estado de error y reintento.
- No hubo bloqueos. Las pruebas emiten avisos preexistentes de Node sobre módulos `.js` sin `type: module`; no afectan sus resultados y no se modificó `package.json` por estar fuera del alcance visual/navegacional.

## BO-006 · Detalle administrativo de pedido

### Cambios

- `app/lib/order-contract.ts`: se enriqueció `Order` con `deliveryZone`, `deliverySlot`, `payment { method, status }`, `substitutionPreference`, `customerNotes`, `charges { subtotal, deliveryFee, discount }` y `OrderLine.substitution { replacedBy, note }`. `OrderEvent` suma `role`. `OrderApi` suma `getOrder(id)`. `OrderTransitionInput` suma `performedByRole`. Contrato objetivo: `GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/status` (BE-014 + BE-015).
- `app/lib/order-rules.js` (funciones puras y testeables): `ORDER_PAYMENT_METHOD_LABELS`, `ORDER_PAYMENT_STATUS_LABELS`, `ORDER_SUBSTITUTION_LABELS`; `formatDeliveryWindow(slot)`; `summarizeOrderCharges(order)` (devuelve el desglose y `balanced` si el total cuadra); `describeOrderTransition(order, next)` (copy del diálogo, marca la cancelación como `danger`); `buildOrderTransitionEvent(input, occurredAt, id)` (arma el evento de auditoría: estado + actor + rol + timestamp + nota saneada).
- `app/lib/order-api.ts`: mock con los 7 pedidos enriquecidos (incluye una línea con sustitución y un pedido con desglose inconsistente para probar la alerta), `getOrder(id)` y `transitionOrder` usando `buildOrderTransitionEvent`. Todas las respuestas se clonan para no filtrar el estado mutable.
- `app/components/order-manager.tsx`: el panel de detalle ahora muestra entrega (dirección + zona + ventana horaria), pago (medio + estado), preferencia de sustitución, nota del cliente, sustituciones por línea, desglose de cargos con alerta si el total no cuadra, e historial con rol del actor. Botón **Actualizar pedido** (`orderApi.getOrder`). El diálogo de confirmación incorpora un campo **Nota para el historial** que se persiste en el evento de auditoría; el copy sale de `describeOrderTransition`.
- `docs/order-operations.md`: guía breve para el operador.

### Criterios de aceptación

- **Audit trail en toda acción**: cada transición agrega un `OrderEvent` con estado, actor, rol, timestamp y nota (verificado en `buildOrderTransitionEvent` y visible en el historial).
- **Errores de transición claros**: si el pedido cambió de estado, `transitionOrder` lanza un mensaje accionable que el manager muestra como `notice error`; las transiciones inválidas ni se ofrecen. Acciones sensibles (cancelación) piden confirmación explícita y van marcadas como peligrosas.
- Flujo completable sin editar la BD: el mock cubre el recorrido; errores esperables se muestran sin filtrar internos.

### Verificación ejecutada

| Comando | Resultado (cola) |
| --- | --- |
| `pnpm lint` | Correcto: `eslint` sin hallazgos. |
| `pnpm typecheck` | Correcto: `tsc --noEmit` sin errores. |
| `pnpm test` | Correcto: 15 pruebas (`node --test`), 4 nuevas en `tests/order-rules.test.mjs` (ventana de entrega, desglose inconsistente, cancelación sensible, evento de auditoría). |
| `pnpm build` | Correcto: 6 rutas, `/pedidos` incluida. |

_Nota: sin navegador/Playwright en el entorno; pendiente validación visual manual del panel de detalle._

## BO-007 · Gestión de zonas y franjas

### Cambios

- Nueva ruta `app/(backoffice)/entregas/page.tsx` + `app/components/delivery-manager.tsx`. Entrada "Entregas" agregada a `admin-shell.tsx`.
- `app/lib/delivery-contract.ts`: tipos `DeliveryZone` (name, cityName, postalCodes[], neighborhoods[], deliveryFee, freeDeliveryThreshold, priority, active, history) y `DeliverySlot` (zoneId, date, start/end, capacity, bookedCount, active, history), sus inputs y `DeliveryApi` (listZones/createZone/updateZone/listSlots/createSlot/updateSlot). Contrato objetivo: endpoints admin de BE-012 (zonas) y BE-013 (franjas).
- `app/lib/delivery-rules.js` (puro/testeable): `DELIVERY_PERMISSIONS` + `getDeliveryPermissions`; `validateZoneInput` (nombre, ciudad, fee ≥ 0 con 2 decimales, umbral > 0 u opcional, prioridad entero ≥ 0, al menos un CP o barrio); `validateSlotInput` (no fecha pasada, fin > inicio, capacidad ≥ 1 y ≥ reservas al editar, sin solapamiento con otra franja activa de la zona ese día); `slotWindowsOverlap`; `slotOccupancy`; `summarizeCheckoutImpact` (texto de lo que ve el cliente); `buildDeliveryChangeEvent` (auditoría).
- `app/lib/delivery-api.ts`: mock temporal con 3 zonas (una inactiva, una sin envío gratis) y franjas de ejemplo (una completa). Cada create/update valida con las reglas y agrega un evento de auditoría; respuestas clonadas.
- `delivery-manager.tsx`: lista de zonas + detalle con recuadro "en el checkout", cobertura, historial de la zona, y sección de franjas con barra de ocupación. Modales `ZoneForm` y `SlotForm` con validación inline (`role="alert"`), permisos por rol y campo de motivo. Estados carga / error (con reintento y detección offline) / vacío.
- `docs/delivery-operations.md`: guía para el operador.

### Criterios de aceptación

- **Impacta el checkout sin deploy**: los cambios de zona/franja se aplican al estado que consume el checkout (mismo contrato); la UI lo comunica explícitamente ("impacta el checkout de inmediato").
- **Validado y auditado**: toda alta/edición pasa por `validateZoneInput`/`validateSlotInput` (server y cliente) y deja un `DeliveryChange` con actor, rol, timestamp y resumen, visible en el historial.
- Errores esperables (capacidad por debajo de reservas, solapamiento, zona inexistente) se muestran claros y sin filtrar internos.

### Verificación ejecutada

| Comando | Resultado (cola) |
| --- | --- |
| `pnpm lint` | Correcto: `eslint` sin hallazgos. |
| `pnpm typecheck` | Correcto: `tsc --noEmit` sin errores. |
| `pnpm test` | Correcto: 21 pruebas (`node --test`), 7 nuevas en `tests/delivery-rules.test.mjs`. |
| `pnpm build` | Correcto: 7 rutas, `/entregas` incluida. |

_Nota: sin navegador/Playwright en el entorno; pendiente validación visual manual._

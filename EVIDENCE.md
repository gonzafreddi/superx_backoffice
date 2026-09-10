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

# Detalle administrativo de pedido

## Uso para operadores

1. En **Operaciones / Pedidos** buscá por código o cliente y filtrá por estado o fecha. El tablero superior resume la carga por etapa.
2. Seleccioná un pedido para abrir el detalle a la derecha. Ahí ves:
   - **Entrega**: dirección, zona y franja horaria (`día DD mes · HH:MM–HH:MM`).
   - **Pago**: medio (efectivo / transferencia / Mercado Pago) y estado (pendiente / acreditado / rechazado / reintegrado). Si el pedido requiere acreditación, no habilita picking hasta estar pagado.
   - **Sustituciones**: la preferencia elegida por el cliente. Cada línea reemplazada durante el picking muestra el producto sustituto y la nota.
   - **Productos** y el **desglose de cargos** (subtotal, envío, descuento, total). Si el total no coincide con el desglose aparece una alerta: no operar y escalar a administración.
   - **Historial operativo**: cada transición con usuario, rol, fecha/hora y nota.
3. **Actualizar pedido** vuelve a pedir el detalle al backend para trabajar con el último estado antes de accionar.
4. En **Acciones disponibles** elegí la transición válida. Se abre una confirmación donde podés dejar una **nota para el historial** (obligatoria en la práctica para cancelaciones e incidencias). Toda acción queda registrada con tu usuario, tu rol y la hora.

Sólo se ofrecen transiciones válidas según la máquina de estados (BE-015). Perfiles de consulta sólo ven; operador avanza pedidos; sólo administración cancela. Si el pedido cambió de estado en paralelo, la acción se rechaza con un mensaje claro y hay que actualizar el listado.

## Estado de integración

`app/lib/order-api.ts` es un mock temporal marcado explícitamente. El contrato tipado objetivo es `GET /api/orders`, `GET /api/orders/:id` y `PATCH /api/orders/:id/status` (BE-014 + BE-015). Al conectar el backend real, reemplazar el mock por el cliente HTTP y mapear los eventos de `GET /orders/:id/events` al `Order.events` del contrato. No hay migraciones en este cambio.

## Evidencia de verificación

- Reglas testeadas (`tests/order-rules.test.mjs`): permisos por rol, máquina de transiciones, agrupación del tablero, `formatDeliveryWindow`, `summarizeOrderCharges` (detección de total inconsistente), `describeOrderTransition` (marca la cancelación como sensible) y `buildOrderTransitionEvent` (audit trail: estado + actor + rol + timestamp + nota).
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (15) y `pnpm build` finalizaron correctamente.
- Pendiente de navegador: el entorno no tiene Playwright/Chromium. Al disponer de backend o navegador, verificar: abrir un pedido en `CONFIRMED` con pago requerido y comprobar que no ofrece "En picking" hasta acreditar el pago; confirmar una transición con nota y verla en el historial con usuario y hora; intentar cancelar como operador y comprobar que la acción está deshabilitada.

# SuperX Backoffice

## Panel operativo de pedidos

En **Pedidos** se puede buscar por código o cliente y filtrar por estado y fecha. El detalle muestra entrega, pago, productos e historial. **Consulta** sólo visualiza; **operador** avanza el flujo permitido; **administración** también puede cancelar antes de que el pedido esté empacado. Cada cambio exige confirmación.

El flujo visible es `CREATED → CONFIRMED → PAID (si aplica) → PICKING → PACKED → READY → OUT_FOR_DELIVERY → DELIVERED`. El panel sólo usa esas reglas para habilitar la UI; el adaptador temporal valida la operación como simulación del futuro backend. Mientras no exista el módulo de órdenes, `app/lib/order-api.ts` conserva datos en memoria y representa `GET /api/orders` y `POST /api/orders/:id/transition`, sin modificar una base de datos.

## Gestión de precios

La pantalla principal permite buscar y filtrar precios por producto, categoría y estado. Al seleccionar un producto se ve el precio vigente y su historial básico con actor, fecha, importe anterior y motivo. **Consulta** sólo puede ver; **operador** actualiza un precio individual; **administración** también puede seleccionar varios productos y aplicar un importe masivo. Toda actualización exige confirmación y rechaza importes negativos, no numéricos o con más de dos decimales.

BE-007 todavía no expone precios. Por ello `app/lib/price-api.ts` es un mock temporal en memoria, aislado detrás del contrato tipado `PriceApi`, cuyo reemplazo previsto consume `GET /api/prices` y `PUT /api/prices`. No hay persistencia real ni modificación de la base de datos hasta que se integre ese backend.

## Gestión de productos

La pantalla principal permite buscar por nombre, SKU o barcode y filtrar por categoría, marca y estado. Seleccioná un producto para ver el detalle y editarlo. El selector de rol permite verificar los permisos: **consulta** sólo ve; **operador** crea, edita y activa/inactiva; **administración** además puede eliminar, siempre con confirmación.

No hay un contrato backend disponible en este repositorio. Por eso `app/lib/product-api.ts` implementa el contrato `ProductApi` con un mock tipado, persistente durante la sesión. El adaptador está aislado para sustituirlo por el cliente HTTP real sin modificar componentes ni reglas de validación.

## Verificación

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

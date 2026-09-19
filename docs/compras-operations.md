# Órdenes de compra

## Uso operativo

1. En **Operaciones / Compras**, filtrá las órdenes por proveedor, depósito y estado. Abrí una fila para ver el documento completo.
2. Para crear una orden, elegí proveedor y depósito. Agregá cada producto desde el buscador y seleccioná una presentación disponible para ese proveedor. Si no existe una presentación, cargá el nombre y las unidades por pack manualmente.
3. Indicá cantidad de packs y costo por pack. El formulario muestra unidades, costo unitario y total como estimación; los importes definitivos son los que devuelve el backend al guardar.
4. Una orden nueva queda en **Borrador**. Desde el detalle se puede editar o confirmar; la confirmación solicita una validación explícita. Un borrador o una orden confirmada puede cancelarse mientras no tenga unidades recibidas.

## Acceso e integración

La interfaz consulta el usuario guardado por inicio de sesión y sólo habilita Compras a rol `admin`. El adaptador `app/lib/purchase-order-api.ts` envía Bearer token a los endpoints de órdenes, productos y presentaciones. Sin `NEXT_PUBLIC_SUPERX_API_BASE_URL`, usa fixtures mutables para probar altas, edición y transiciones.

## Verificación

- `tests/purchase-order-rules.test.mjs` cubre packs a unidades, redondeo de costo unitario y validaciones de proveedor, depósito, líneas y cantidades positivas.
- Verificar manualmente con backend: crear con una presentación del proveedor, crear con carga manual, editar una orden en borrador, confirmar y cancelar. El backend es la fuente de verdad de totales y transiciones.

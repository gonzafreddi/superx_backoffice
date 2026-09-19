# Operación de proveedores y cuenta corriente

- El listado carga los balances de los proveedores visibles en una única consulta a `GET /suppliers/balances?supplierIds=`. El filtro **Con deuda** se aplica a esas respuestas, sin solicitudes por fila.
- La ficha es sólo para administradores y agrupa resumen financiero, compras, facturas, pagos, cuenta corriente, datos e historial. Los importes, vencidos y saldos acumulados son los devueltos por la API.
- **Registrar pago** abre el flujo existente de pagos con el proveedor preseleccionado; **Nueva factura** abre `/facturas/nueva?supplierId=`.
- La edición valida el CUIT argentino (módulo 11) antes de enviar el `PATCH`. Un proveedor inactivo queda señalado como no utilizable en nuevas órdenes. Si presenta saldo abierto, el formulario informa esa advertencia antes del cambio de estado.
- En cuenta corriente, los filtros de fecha se envían a `GET /suppliers/:id/movements`; el saldo de apertura y el acumulado no se recalculan en el cliente.

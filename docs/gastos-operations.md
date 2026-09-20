# Gastos

La pantalla `/gastos` es exclusiva de administradores. Permite filtrar y revisar gastos, crear uno con pago inmediato, mantener categorías sin borrarlas y consultar el detalle.

El pago inmediato usa una cuenta activa de la misma moneda y el `idempotencyKey` se genera por intento. Si la API rechaza fondos insuficientes, no se considera creado el gasto. Los importes, pagado y saldo visibles proceden de la API; el gráfico sólo agrupa el resumen recibido.

Para pagos posteriores, abrí el detalle y elegí **Registrar pago** para continuar en Pagos. Un gasto con pagos confirmados no admite edición ni anulación.

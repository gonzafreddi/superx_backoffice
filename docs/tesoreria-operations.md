# Tesorería

La pantalla `/tesoreria` es exclusiva para administradores y administra las cuentas de Caja, Banco, Digital y Cuenta socios. Los saldos que muestra son los devueltos por la API: nunca se calculan totales oficiales en el navegador.

## Operación

- Al crear una cuenta se informa nombre, tipo, moneda, saldo inicial, fecha de apertura y si permite saldo negativo. La fecha de un movimiento no puede ser anterior a la apertura.
- La edición no incluye saldo: el saldo sólo cambia con movimientos. Activar/desactivar cuenta y cambiar moneda son operaciones validadas finalmente por el backend.
- El libro (`/tesoreria/[id]`) permite filtrar por período, tipo, referencia y texto; la columna saldo acumulado usa `runningBalance` entregado por el servidor.
- Los ingresos y egresos manuales exigen importe positivo de hasta dos decimales y descripción. Conservan una misma `idempotencyKey` si se reintenta el envío.
- Las transferencias requieren dos cuentas activas, distintas y de la misma moneda. Un rechazo del backend se muestra en la interfaz.
- Los movimientos que aún no fueron revertidos muestran la acción Revertir. La reversa exige motivo y queda como un nuevo movimiento en el libro; para una transferencia, usa la reversa atómica de su transferencia.

Sin `NEXT_PUBLIC_SUPERX_API_BASE_URL`, el adapter usa el fixture mutable local para recorrer el flujo. Con URL configurada usa bearer contra los endpoints `/treasury`.

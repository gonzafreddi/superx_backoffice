# Gestión de stock y ajustes

## Uso para operadores

1. Buscá el producto y filtrá por depósito o estado de stock.
2. Seleccioná una posición para ver el mínimo y los últimos movimientos.
3. Elegí **Ajustar stock**, ingresá unidades positivas o negativas y un motivo obligatorio.
4. Revisá el stock resultante y confirmá. La acción crea un `InventoryMovement` auditable; nunca edita el stock directamente.

Los perfiles de consulta sólo pueden ver información. Operador y administración pueden crear ajustes.

## Estado de integración

BE-008 todavía no implementa inventario por movimientos. La interfaz consume el contrato tipado objetivo: `GET /api/inventory` y `POST /api/inventory/movements`. El archivo `app/lib/inventory-api.ts` es un mock temporal y explícitamente marcado; debe reemplazarse por el cliente HTTP cuando BE-008 esté disponible. No hay migraciones en este cambio.

## Evidencia de verificación

- Reglas testeadas: permisos, estado bajo/agotaado y validación del ajuste (motivo, entero, saldo no negativo).
- Flujo de integración verificado: las reglas cubren permisos, estado y validación; lint, typecheck, tests y build finalizaron correctamente.
- Pendiente de navegador: el entorno no tiene Playwright ni un navegador Chromium disponible, por lo que la interacción visual no pudo automatizarse aquí. Al disponer de BE-008 o de un navegador, verificar: seleccionar posición, registrar +2 con motivo, confirmar, y comprobar el movimiento en el historial; luego intentar descontar más que el saldo y comprobar el error inline.

# Ubicaciones de depósito

## Uso para operadores

1. En **Operaciones / Ubicaciones**, elegí un depósito. **Por ubicación** muestra el resumen de ubicaciones, filtros por estado/pasillo/rack, búsqueda, orden y vistas de lista o cuadrícula; usá **Por producto** para buscar por nombre, `slug` o código de barras y ver todas las ubicaciones con stock, total, reservado y disponible.
2. Seleccioná una ubicación para consultar su código, pasillo, rack, nivel, estado, capacidad, ocupación y última actualización. El código QR se genera en el navegador desde el código de ubicación.
3. El inventario muestra cantidad total, reservada y disponible. Se puede buscar por nombre, `slug` (identificador mostrado en lugar de SKU) o código de barras y navegar páginas.
4. Administración y operador pueden agregar stock, transferirlo, o ajustarlo; cada operación se registra en el historial. La transferencia exige destino activo/no bloqueado y confirmación con cantidad y código de destino reales. El ajuste exige motivo y muestra el cálculo de saldo antes de guardar.
5. Al agregar un producto, el resultado seleccionado informa el stock global disponible y la ubicación que ya tiene en el depósito. También admite referencia y notas opcionales.
6. **Quitar** no borra silenciosamente: con stock o reservas ofrece moverlo o ajustarlo a cero con motivo; sin saldo llama a la eliminación de la relación producto-ubicación. **Vaciar ubicación** confirma y registra un ajuste a cero por cada producto cargado.
7. Operador y administración pueden crear o editar ubicaciones. Código, pasillo, rack y nivel son obligatorios; el orden de recorrido debe ser un entero no negativo. Desactivar una ubicación la conserva para consulta pero la identifica como inactiva.
8. En **Asignar producto a ubicación**, buscá y elegí un producto. La pantalla consulta su asignación sólo para el depósito activo: cada producto puede tener como máximo una ubicación por depósito. Elegí otra ubicación para reemplazarla o usá **Quitar asignación** para dejarla vacía.
9. En el menú de una ubicación podés ver su código QR. **Mover stock** y **Ajustar stock** llevan al detalle para elegir el producto concreto; **Bloquear** y **Desactivar** abren el editor con el estado ya seleccionado. No hay eliminación de ubicaciones desde este listado.

Los perfiles de consulta sólo ven ubicaciones y asignaciones.

## Estado de integración

`app/lib/location-api.ts` usa bearer token y conecta `GET /warehouses/:warehouseId/locations` con agregados de stock por ubicación (productos, cantidades, ocupación y producto principal), y `GET /warehouses/:warehouseId/stock` para la vista por producto, además de `GET /warehouses/:warehouseId/locations/:locationId`, `GET .../stock`, `GET .../movements`, y `POST .../stock`, `/stock/transfer`, `/stock/adjust`, además de `DELETE .../stock/:productId` y el PATCH estructural. El ajuste envía `reason` obligatorio (`PHYSICAL_COUNT`, `BREAKAGE`, `LOSS`, `LOAD_ERROR`, `RETURN` u `OTHER`). Sin URL configurada mantiene fixtures mutables en memoria para revisar altas, transferencias, ajustes y bajas.

## Evidencia de verificación

- Reglas testeadas (`tests/location-rules.test.mjs`): permisos por rol; campos de ubicación obligatorios; orden de recorrido entero y no negativo.
- Verificar manualmente contra backend: crear una ubicación, editar el orden, asignar un producto, reemplazar su ubicación y quitar la asignación; el producto debe seguir teniendo como máximo una asignación en el depósito activo.

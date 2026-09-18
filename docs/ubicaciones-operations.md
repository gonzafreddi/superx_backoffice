# Ubicaciones de depósito

## Uso para operadores

1. En **Operaciones / Ubicaciones**, elegí un depósito. El listado siempre muestra únicamente las ubicaciones de ese depósito, ordenadas por el orden de recorrido de picking.
2. Seleccioná una ubicación para consultar su código, pasillo, rack, nivel, estado y última actualización.
3. Operador y administración pueden crear o editar ubicaciones. Código, pasillo, rack y nivel son obligatorios; el orden de recorrido debe ser un entero no negativo. Desactivar una ubicación la conserva para consulta pero la identifica como inactiva.
4. En **Asignar producto a ubicación**, buscá y elegí un producto. La pantalla consulta su asignación sólo para el depósito activo: cada producto puede tener como máximo una ubicación por depósito. Elegí otra ubicación para reemplazarla o usá **Quitar asignación** para dejarla vacía.

Los perfiles de consulta sólo ven ubicaciones y asignaciones.

## Estado de integración

`app/lib/location-api.ts` usa el backend real cuando existe `NEXT_PUBLIC_SUPERX_API_BASE_URL`, con bearer token de `auth-api.ts`: `GET /warehouses`, `GET/POST /warehouses/:warehouseId/locations`, `PATCH /picking/locations/:id`, búsqueda en `GET /products`, y asignación mediante `GET/PUT/DELETE /products/:productId/location`. La consulta individual devuelve 404 cuando no hay asignación; el adaptador lo representa como un estado normal de “Sin ubicación asignada”. Sin URL configurada usa fixtures en memoria, igual que los demás dominios.

## Evidencia de verificación

- Reglas testeadas (`tests/location-rules.test.mjs`): permisos por rol; campos de ubicación obligatorios; orden de recorrido entero y no negativo.
- Verificar manualmente contra backend: crear una ubicación, editar el orden, asignar un producto, reemplazar su ubicación y quitar la asignación; el producto debe seguir teniendo como máximo una asignación en el depósito activo.

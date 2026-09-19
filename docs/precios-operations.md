# Gestión de precios

## Uso

La pantalla **Comercial / Precios** permite buscar, filtrar y ordenar el catálogo por costo, precio, margen y estado. El panel lateral muestra la promoción, regla aplicable y últimos cambios del producto seleccionado.

Administración puede guardar un costo/precio inmediato o programarlo para una fecha futura. El margen se recalcula en el navegador; precio menor o igual al costo se advierte sin bloquear, mientras que una regla de margen mínimo rechazada por el backend se muestra como error y no guarda el cambio. Aplicar reglas pide confirmación y puede ejecutarse para una categoría o para todo el catálogo.

## Estado de integración

`app/lib/price-api.ts` usa bearer token y conecta `GET /prices`, `/prices/stats`, `/prices/:productId`, `/prices/:productId/history`, `PATCH /prices/:productId`, `POST /prices/apply-rules`, `/prices/bulk-update` y CRUD de `/price-rules`. Sin `NEXT_PUBLIC_SUPERX_API_BASE_URL` conserva fixtures temporales en memoria.

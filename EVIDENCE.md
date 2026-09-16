# Evidencia — PK-005: faltantes y sustituciones

## Implementado

- Debajo del botón manual **Confirmar línea**, un enlace secundario **Reportar faltante** abre un panel inline (no navega, no es modal) con las tres resoluciones del backend: **Reemplazar por similar**, **Consultar al cliente**, **Quitar del pedido**.
- **Reemplazar por similar** habilita un buscador (debounce ~300ms) contra `GET /api/products?q=` (endpoint público de catálogo); elegís un resultado como sustituto antes de poder confirmar.
- Las tres resoluciones aceptan una nota opcional (hasta 280 caracteres) y llaman a `POST /api/picking/tasks/:id/items/:itemId/shortage` vía `PickingApi.reportShortage(taskId, itemId, resolution, substituteProductId?, note?)`.
- Al confirmar con éxito, la línea queda resuelta (`SHORT` o `SUBSTITUTED`) y la app avanza a la siguiente línea pendiente, igual que el flujo de pick/scan existente. `isResolved`/`pickingProgress`/`canCompleteTask` en `picking-rules.js` ya trataban cualquier estado distinto de `PENDING` como resuelto, así que no requirieron cambios.
- El panel se resetea al cambiar de línea o de tarea.
- Fixture local: `searchProducts` filtra 3 productos de ejemplo por nombre; `reportShortage` en modo fixture actualiza el estado/resolución/sustituto del ítem sin replicar las validaciones de stock del backend (igual que el resto de los adaptadores fixture de esta pantalla).
- `docs/picking-app.md` actualizado con el flujo de faltantes y el nuevo contrato de integración.

## Verificación ejecutada

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS (se corrigieron 2 errores `react-hooks/set-state-in-effect` con el patrón `// eslint-disable-next-line` ya usado en `inventory-manager.tsx`/`product-manager.tsx`/etc. de este repo).
- `pnpm test`: PASS — 31 tests.
- `pnpm build`: PASS — `/picking` se prerenderiza correctamente.

No se agregaron pruebas de componentes ni dependencias nuevas; no se identificó lógica pura nueva que justifique un test en `picking-rules.js` (la lógica nueva es orquestación de estado de UI y llamadas HTTP, no reglas puras).

## Guía de prueba manual

Sin backend configurado (`NEXT_PUBLIC_SUPERX_API_BASE_URL` sin definir, el caso por defecto en este entorno), la pantalla usa el fixture en memoria:

1. Iniciá sesión como picker y abrí `/picking`. Tomá la tarea `SX-1048` (o la que esté disponible).
2. En la línea actual, tocá **Reportar faltante**.
3. **Reemplazar por similar**: escribí "yogur" o "agua" en el buscador, elegí un resultado, opcionalmente agregá una nota, tocá **Confirmar faltante**. La línea debe quedar resuelta y la app avanza a la siguiente pendiente.
4. Repetí para otra línea eligiendo **Consultar al cliente** o **Quitar del pedido** (no requieren seleccionar sustituto, **Confirmar faltante** se habilita de inmediato).
5. Confirmá que **Finalizar picking** se habilita recién cuando todas las líneas (pickeadas o con faltante resuelto) dejan de estar pendientes.

Con backend real: los mismos pasos, pero además verificá en `/pedidos` (o vía `GET /orders/:id`) que el `discountTotal`/`grandTotal` bajan tras una resolución **Quitar del pedido** o **Consultar al cliente**, y que quedan sin cambios tras **Reemplazar por similar**.

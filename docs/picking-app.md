# Interfaz móvil de picking

Ruta `/picking` (fuera del shell de administración: pantalla completa, mobile-first, para usar con una mano).

## Uso para el picker

1. **Tus tareas** lista lo que tenés **En curso** (asignado a vos) y lo **Disponible** en la cola (ordenado por prioridad y franja).
2. Tocá una tarea:
   - Si es tuya, abre directo en el punto donde quedó.
   - Si está en la cola, la app te la **asigna y la inicia** en un paso ("Tomar").
3. En la tarea ves, arriba, el **progreso** (`líneas resueltas / total`) y una barra. La tarjeta central muestra, para la línea actual: la **ubicación** en grande, el producto y la cantidad pedida.
4. Ajustá la cantidad con el stepper (por defecto = lo pedido) y tocá **Confirmar línea**. La app avanza sola a la siguiente línea pendiente, siguiendo el orden de recorrido por ubicación. **Anterior / Siguiente** te dejan moverte libremente.
5. Cuando **todas las líneas están resueltas**, se habilita **Finalizar picking**. Mientras haya líneas sin resolver, el botón está deshabilitado y se indica cuántas faltan.

La app **nunca modifica stock**: sólo registra la cantidad pickeada por línea, con tu usuario y la hora. La cantidad no puede superar lo pedido (los faltantes y sustituciones se resuelven en PK-005).

## Estado de integración

`app/lib/picking-api.ts` es un adaptador temporal marcado. El contrato objetivo son los endpoints `/api/picking/tasks` del backend (PK-002 + PK-003): `?assignedTo=me`, `?status=PENDING`, `GET /:id`, `POST /:id/assign|start|complete`, `POST /:id/items/:itemId/pick`. `app/lib/picking-rules.js` (progreso, secuencia, `canCompleteTask`) refleja las reglas del backend y debe mantenerse alineado. Sin base URL usa un fixture en memoria. No hay migraciones en este cambio (las del backend están en `superx_back`).

## Evidencia de verificación

- Reglas testeadas (`tests/picking-rules.test.mjs`): `sequenceItems` (orden de recorrido), `pickingProgress`/`pendingLines`, `canCompleteTask` (IN_PROGRESS + cero pendientes), `nextPendingIndex` (avance con wrap), `clampPickQuantity`.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (31) y `pnpm build` finalizaron correctamente; `/picking` se prerenderiza y opera en el cliente.
- Pendiente de navegador: sin Playwright/Chromium. Con backend o navegador verificar: tomar una tarea de la cola, confirmar líneas parciales y comprobar que no se puede finalizar hasta resolver todas; intentar pickear más de lo pedido y ver el error.

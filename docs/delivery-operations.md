# Zonas y franjas de entrega

## Uso para operadores

1. En **Logística / Entregas** buscá una zona por nombre, ciudad, CP o barrio y seleccionala.
2. El detalle muestra, en un recuadro verde, **lo que ve el cliente en el checkout** (costo de envío y umbral de envío gratis, o "zona inactiva"). Debajo, la cobertura (CP y barrios) y la prioridad (a mayor prioridad, gana ante zonas solapadas).
3. **Editar zona** (sólo administración): cambiá nombre, ciudad, costo de envío, umbral de envío gratis (vacío = sin envío gratis), prioridad, estado y cobertura. Podés dejar un motivo. Al guardar, el cambio **impacta el checkout de inmediato, sin deploy**, y queda en el historial de la zona con tu rol y la fecha.
4. **Franjas**: cada zona lista sus franjas con el rango horario y una barra de ocupación (`reservas/capacidad`; roja si está completa). Operador y administración pueden **crear** y **editar** franjas (fecha, horario, capacidad, estado).
   - No se permite una fecha pasada, un horario de fin anterior o igual al de inicio, ni una franja que se **superponga** con otra franja activa de la misma zona ese día.
   - Al editar, la capacidad **no puede quedar por debajo de las reservas ya tomadas**.

Perfiles de consulta sólo ven la configuración.

## Estado de integración

`app/lib/delivery-api.ts` es un mock temporal marcado. El contrato tipado objetivo son los endpoints admin de BE-012 (`GET/POST/PATCH /api/delivery-zones`) y BE-013 (`GET/POST/PATCH /api/delivery/slots`). Al conectarlos, reemplazar el mock por el cliente HTTP; las validaciones de `app/lib/delivery-rules.js` reflejan las reglas del backend (fee ≥ 0, umbral > 0 u opcional, capacidad ≥ reservas, no solapamiento) y deben mantenerse alineadas. No hay migraciones en este cambio.

## Evidencia de verificación

- Reglas testeadas (`tests/delivery-rules.test.mjs`): permisos por rol; `validateZoneInput` (nombre, ciudad, fee, umbral, prioridad, cobertura mínima); `validateSlotInput` (fecha pasada, rango invertido, capacidad < reservas, solapamiento); `slotWindowsOverlap`; `slotOccupancy`; `summarizeCheckoutImpact`; `buildDeliveryChangeEvent` (auditoría con actor + rol + timestamp).
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (21) y `pnpm build` finalizaron correctamente.
- Pendiente de navegador: sin Playwright/Chromium en el entorno. Al disponer de backend o navegador, verificar: bajar la capacidad de una franja por debajo de sus reservas y comprobar el error inline; editar el costo de envío de una zona y ver el recuadro de checkout y el historial actualizados; crear una franja superpuesta y comprobar el rechazo.

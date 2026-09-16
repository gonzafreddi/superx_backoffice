# Panel móvil de repartidor

Ruta `/reparto` (fuera del shell de administración: pantalla completa, mobile-first, para usar con una mano).

## Uso para el repartidor

1. La pantalla lista **tus entregas** asignadas, en el orden sugerido manual (`sortOrder` — no es ruteo automático ni usa geolocalización, es un orden fijo que carga quien asigna).
2. Cada tarjeta muestra: código de pedido, cliente, dirección y zona, teléfono (tocable, abre el marcador), un enlace **Cómo llegar** (deep-link universal a Google Maps con la dirección y la zona — abre la app si está instalada, o el mapa en el navegador si no; sin ruteo ni optimización automática, es una sola ubicación), forma de pago y monto, estado actual y el historial de cambios con fecha/hora y nota.
3. Acciones según el estado:
   - **Pendiente** → **Iniciar** (acción directa, sin confirmación, pasa a *En camino*).
   - **En camino** → **Entregado** (abre un panel con nota opcional antes de confirmar) o **Incidencia** (abre un panel con motivo obligatorio de una lista corta — Cliente ausente / Dirección incorrecta / Rechazado por el cliente / Otro — y nota opcional).
   - **Entregado** / **Con incidencia** son estados terminales: no quedan acciones disponibles.
4. Sin conexión, la pantalla lo indica y ofrece reintentar (mismo patrón que `/pedidos`).

## Estado de integración

`app/lib/driver-api.ts` es un adaptador 100% fixture, marcado como tal (`Mock TEMPORAL`). A diferencia de `/picking` (cuyo backend ya existe desde PK-002..006), el backend de LG-001 (`superx_back`, módulo `drivers`) sólo expone lectura para el repartidor (`GET /delivery-assignments`, `GET /orders/:id/assignment`); **no** tiene todavía mutaciones para iniciar, entregar o reportar una incidencia — esas son las tarjetas LG-003 (transición a reparto) y LG-004 (entrega e incidencias). Por eso esta pantalla no llama a ningún endpoint real todavía: el fixture simula tanto la lectura como las tres acciones. Cuando LG-003/LG-004 agreguen esos endpoints, `driver-api.ts` se reemplaza por una implementación HTTP siguiendo el mismo contrato (`DriverApi` en `app/lib/driver-contract.ts`), igual que está documentado como pendiente para `order-api.ts`/`picking-api.ts`.

`app/lib/driver-rules.js` contiene toda la lógica pura: `sortDeliveries` (orden sugerido), `getAvailableActions`/`canStartDelivery`/`canMarkDelivered`/`canReportIncident` (guards de transición — no se puede entregar ni reportar incidencia sin haber iniciado), `validateIncidentInput` (motivo obligatorio de la lista permitida, nota ≤280 caracteres), `describeDeliveryProgress`, `formatPaymentSummary` (copy operativo) y `buildMapsUrl` (arma `https://www.google.com/maps/search/?api=1&query=<dirección + zona>`; devuelve `null` si no hay dirección). No hay reglas de negocio en el componente.

No hay migraciones en este cambio (el modelo de `drivers`/`delivery_assignments` es de LG-001, en `superx_back`).

## Evidencia de verificación

- Reglas testeadas (`tests/driver-rules.test.mjs`, 5 tests): orden sugerido sin mutar el array de entrada, guards de transición y acciones disponibles por estado, validación de incidencia (motivo + longitud de nota), copy de estado y de forma de pago, `buildMapsUrl` (arma la URL con dirección+zona, sólo dirección, y `null` sin dirección).
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (37 tests en todo el repo) y `pnpm build` finalizaron correctamente; `/reparto` se prerenderiza.
- Verificación manual: `pnpm dev` + `curl http://localhost:3000/reparto` devuelve 200 con el shell de la pantalla (eyebrow "REPARTO", título "Tus entregas", skeleton de carga) en el HTML servido por el servidor; el contenido de las tarjetas se carga del lado del cliente desde el fixture (no hay navegador disponible en este entorno para una verificación visual completa).
- Pendiente con navegador real: confirmar que **Iniciar** habilita **Entregado**/**Incidencia**, que el panel de incidencia no deja confirmar sin motivo, y que el enlace de teléfono abre el marcador en un dispositivo móvil.

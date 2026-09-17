# IQ-001 — Convenciones de repositorio y quickstart

## Implementado

- `.editorconfig` (2 espacios, UTF-8, LF, newline final, sin trim en Markdown).
- `.env.example` documentando `NEXT_PUBLIC_SUPERX_API_BASE_URL` (opcional; sin valor cae a los fixtures tipados de `app/lib/*-api.ts`).
- `CONVENTIONS.md`: ramas (trunk-based sobre `main`), commits (Conventional Commits + footer de coautoría), el patrón manager+api+contract+rules por dominio, la restricción de `*-rules.js` (ESM plano, sin importar `.ts`), y el aviso de leer `AGENTS.md`/`node_modules/next/dist/docs/` antes de codear.
- README: sección `## Quickstart` (clone → install → env opcional → dev → verify).

## Verificación ejecutada

| Comando | Resultado |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS |
| `pnpm test` | PASS — 38 tests (`node --test`) |
| `pnpm build` | PASS |
| Prueba real de arranque | `pnpm exec next dev -p 3200` → `curl localhost:3200/` → `307` (redirect esperado a la ruta por defecto). **Mismo hallazgo que en `superx_front`**: `pnpm dev -- -p 3200` no pasa el flag correctamente; el Quickstart usa `pnpm exec next dev -p 3200`, ya verificado. |

## Decisiones y supuestos

- Puerto de desarrollo recomendado 3200 (3000 y 3100 quedan reservados para backend y frontend cliente) para poder levantar los tres repos en simultáneo en la misma máquina sin colisión.

# Evidencia — LG-005: integrar apertura de mapas

## Implementado

- Nueva función pura `buildMapsUrl(delivery)` en `app/lib/driver-rules.js`: arma `https://www.google.com/maps/search/?api=1&query=<dirección>, <zona>` (URL-encoded), o `null` si la entrega no tiene dirección. Es el formato universal de Google Maps: en un dispositivo móvil abre la app si está instalada, y cae solo al mapa en el navegador si no — sin depender de esquemas nativos por plataforma (`geo:`/`intent://`) que no garantizan ese fallback.
- En `app/reparto/driver-app.tsx`, cada tarjeta de entrega muestra un enlace **Cómo llegar** (`target="_blank" rel="noopener noreferrer"`) construido con `buildMapsUrl`, junto al teléfono. No hay ruteo ni optimización de múltiples paradas — es siempre una sola ubicación, tal como pide la tarjeta ("sin optimización automática de rutas").
- `docs/driver-app.md` actualizado.

## Verificación ejecutada

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 38 tests (1 nuevo: `buildMapsUrl` en `tests/driver-rules.test.mjs`, cubre dirección+zona, sólo dirección, y ausencia de dirección → `null`).
- `pnpm build`: PASS — `/reparto` se prerenderiza.

## Guía de prueba manual

1. Abrí `/reparto`. En cualquier tarjeta, tocá **Cómo llegar**.
2. En un navegador de escritorio abre Google Maps en una pestaña nueva con la dirección de esa entrega. En un teléfono con la app de Google Maps instalada, la abre directamente en la ubicación correcta; sin la app instalada, abre el mapa en el navegador igual (mismo enlace, sin lógica adicional de detección de plataforma).

## Decisiones y supuestos

- No se ampliar alcance: es un único enlace por entrega a la ubicación del pedido, sin ruteo multi-parada, geolocalización del repartidor ni integración con un SDK de mapas — exactamente lo que pide la tarjeta.
- Se usa `deliveryAddress` + `deliveryZone` (sin ciudad fija en el string) porque el modelo de `DriverDelivery` no incluye una ciudad explícita; si en el futuro se agrega, sumarla a `buildMapsUrl` mejoraría la precisión del geocoding de Google.

# Evidencia — LG-002: panel móvil de repartidor

## Implementado

- Nueva ruta `/reparto` (fuera del shell de administración), componente `driver-app.tsx` + `driver.module.css`, siguiendo el mismo patrón que `/picking`: pantalla completa mobile-first, sin login propio (la autorización real la hace el backend, rol `driver`; la UI sólo maneja el 401/403 resultante igual que `picking-api.ts`).
- `app/lib/driver-contract.ts` (tipos: `DriverDelivery`, `DriverDeliveryEvent`, interfaz `DriverApi`), `app/lib/driver-api.ts` (adaptador **100% fixture**, 4 entregas de ejemplo en distintos estados) y `app/lib/driver-rules.js` (lógica pura: orden sugerido, guards de transición, validación de incidencia, copy de estado/pago).
- Cada tarjeta de entrega muestra pedido, cliente, dirección/zona, teléfono (enlace `tel:`), forma de pago + monto, estado, nota y trazabilidad completa (historial de eventos con fecha/hora y nota).
- Acciones **Iniciar** (directa), **Entregado** (panel con nota opcional) e **Incidencia** (panel con motivo obligatorio de una lista corta + nota opcional), con guards que impiden entregar o reportar sin haber iniciado.
- Manejo de sin-conexión y reintento igual que `order-manager.tsx` (`navigator.onLine`).
- `docs/driver-app.md` nuevo documentando el flujo y dejando explícito que las acciones no llaman a ningún endpoint real todavía: LG-001 (ya en `04 · Testing` en `superx_back`) sólo expone lectura para el repartidor; los endpoints para iniciar/entregar/reportar incidencia son las tarjetas LG-003/LG-004.

## Verificación ejecutada

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

- `pnpm typecheck`: PASS (se corrigieron dos errores de tipos: un `string | undefined` sin fallback al construir `DriverApiError`, y una anotación de tipo explícita para el callback de `events.map`/el resultado de `sortDeliveries`, ya que viene de un `.js` sin tipos).
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 37 tests (4 nuevos en `tests/driver-rules.test.mjs`). Se corrigió un import roto: `driver-rules.js` importaba `ORDER_PAYMENT_METHOD_LABELS` desde `./order-contract` (un `.ts`), lo que rompe `node --test` (ESM no puede resolver `.ts`); se cambió a `./order-rules.js`, que ya duplica esas labels (mismo patrón documentado para `*-rules.js`/`*-contract.ts` en este repo).
- `pnpm build`: PASS — `/reparto` se prerenderiza.
- Manual: `pnpm dev` + `curl http://localhost:3000/reparto` → 200, con el shell de la pantalla en el HTML servido (el listado de tarjetas se hidrata en cliente desde el fixture).

## Guía de prueba manual

Sin backend configurado (`NEXT_PUBLIC_SUPERX_API_BASE_URL` sin definir, caso por defecto), la pantalla usa el fixture en memoria:

1. Abrí `/reparto`. Deberías ver 4 entregas: una **Pendiente**, una **En camino**, una **Entregada** y una **Con incidencia**.
2. En la entrega **Pendiente**, tocá **Iniciar** → pasa a **En camino** y aparecen **Entregado**/**Incidencia**.
3. Tocá **Entregado**, agregá una nota opcional y confirmá → pasa a **Entregado** (estado terminal, sin acciones) y la nota queda en el historial.
4. En otra entrega **En camino**, tocá **Incidencia** → intentá confirmar sin elegir motivo (debe estar deshabilitado), elegí un motivo, confirmá → pasa a **Con incidencia** con el motivo y la nota concatenados en el historial.
5. Confirmá que el teléfono es tocable y arma un enlace `tel:`.

## Decisiones y supuestos

- No se ampliar alcance hacia LG-003/LG-004: las tres acciones actualizan sólo el fixture local; no hay ningún endpoint real de mutación todavía en `superx_back` para un repartidor (LG-001 sólo agregó lectura). Esto queda documentado en `docs/driver-app.md` para quien tome esas tarjetas.
- `deliveryProgress` (`PENDING`/`EN_CAMINO`/`ENTREGADO`/`INCIDENCIA`) es un concepto de esta pantalla, separado del `status` de `DeliveryAssignment` del backend (`ACTIVE`/`REASSIGNED`/`CANCELLED`/`COMPLETED`) — no hay que confundirlos ni intentar mapearlos 1:1 cuando se conecte al backend real, son ejes distintos (uno es "de quién es la asignación", el otro es "en qué paso operativo está la entrega").
- El "orden sugerido manual" es sólo un campo `sortOrder` ordenable; no hay ruteo, geolocalización ni optimización de recorrido — explícitamente fuera de alcance de esta tarjeta.

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

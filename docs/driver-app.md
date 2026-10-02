# Reparto: carga y ruta

La ruta `/reparto` es la pantalla operativa de conductores y administradores. Vive fuera del shell administrativo y adapta el mismo flujo a escritorio, tablet y móvil.

## Flujo de dos fases

1. **Por cargar:** los pedidos `READY` aparecen ordenados por ventana horaria y número. El conductor selecciona los que subió al vehículo y confirma **Cargar**. `POST /dispatch/assign { orderIds }` cambia todos los seleccionados a `DISPATCHED`.
2. **Cargados:** los pedidos `DISPATCHED` pueden reordenarse antes de salir con teclado (↑/↓) o los botones táctiles **Subir** y **Bajar**. En móvil, **Ver ruta para iniciar** abre el mapa y la confirmación de salida. **Iniciar ruta** llama `POST /dispatch/start { orderIds }` y los cambia a `OUT_FOR_DELIVERY`. En reparto se puede completar con `POST /dispatch/:id/delivered` o registrar una novedad con `POST /dispatch/:id/incident`.
3. **En reparto:** los pedidos iniciados se muestran separados de los cargados.
4. **Entregados:** esta fase conserva el historial del día en estado `DELIVERED`.

La transición completa es `READY → DISPATCHED → OUT_FOR_DELIVERY → DELIVERED`. Cargar no equivale a iniciar la ruta: permite preparar el vehículo en una o varias tandas sin declarar todavía los pedidos en reparto.

## Visibilidad por rol

- **Admin:** `GET /dispatch` muestra todos los pedidos operativos de la fecha y permite inspeccionar el flujo completo.
- **Driver:** ve los listos para cargar y los pedidos que devuelve el backend. La UI permite ordenar e iniciar únicamente sus propios cargados, muestra quién cargó los ajenos y deja a ADMIN iniciar cualquier cargado. El backend valida nuevamente los permisos.

El detalle permite cargar directamente un pedido `READY`, informa cuando uno está `DISPATCHED`, y habilita entrega e incidencia únicamente para `OUT_FOR_DELIVERY`. La interfaz nunca presenta montos: sólo comunica el estado operativo del pago.

## Reglas puras

`app/lib/dispatch-rules.js` mantiene fuera del componente las reglas reutilizables:

- `defaultPhase(board)` elige Por cargar, Cargados, En reparto o Entregados al abrir una fecha.
- `phaseOrders(board, phase)` ordena los pedidos visibles de cada fase.
- `routeOrders(board)` combina `DISPATCHED` y `OUT_FOR_DELIVERY` por posición.
- `unitCount(order)` suma las unidades de los ítems.
- `moveItem`, `nextStop`, `progressLabel`, `paymentHint`, `timeRange`, `mapsUrl` y los formateadores resuelven reordenamiento, navegación y copy sin lógica de negocio en React.

La elección manual de fase se conserva durante refrescos de la misma fecha. Al cambiar de fecha se recalcula; al cargar el último pedido listo o iniciar una ruta se avanza automáticamente a Cargados o En reparto, respectivamente.

Los errores 409 y 403 muestran instrucciones en español. Después de un conflicto, **Actualizar tablero** permite volver a seleccionar los pedidos con el estado vigente.

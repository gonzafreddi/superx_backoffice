# Administración — operación

`/administracion` concentra información financiera y operativa de solo lectura para administradores. Los filtros de período, proveedor y moneda se aplican a cada consulta de `/admin-dashboard`; el período **Mes** es el mes calendario local completo y **7 días** incluye hoy y los seis días anteriores.

Los datos monetarios, saldos, deudas y movimiento neto se presentan exactamente como responde el backend. Tesorería muestra el saldo oficial por cuenta: no se ofrece un “saldo total” calculado en el navegador porque el endpoint no lo entrega. La tarjeta correspondiente indica esa limitación y enlaza al detalle de cuentas.

Cada bloque se recupera de forma independiente. Si alguno falla, el botón **Reintentar** vuelve a pedir sólo ese bloque; el resto del tablero continúa disponible. Las órdenes pendientes permiten abrir la orden o ir directo a **Recibir**. El flujo diario tiene una tabla alternativa para lectores de pantalla y para consultar los importes exactos.

Con `NEXT_PUBLIC_SUPERX_API_BASE_URL` ausente, el adaptador usa datos financieros vacíos, sin simular compromisos, saldos ni movimientos.

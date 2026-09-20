# Inversiones y activos

La ruta `/inversiones` está disponible sólo para el rol real `admin`. Permite filtrar activos por período, estado, categoría, proveedor y estado de pago; los importes, saldo y resumen son los que devuelve la API.

Para crear un activo se requiere nombre, categoría, fecha, costo y adjuntos (vacío es válido). **Pagar ahora** se envía dentro de la misma solicitud de alta: si el pago falla, el activo no se crea. Para pagos posteriores se usa la ficha, que imputa el saldo consultado al endpoint de pagos con `targetType: ASSET`.

Los estados válidos son Planificado → Adquirido → En uso, con disposición posible desde cualquiera de los tres estados activos. Disponer exige motivo. Costo y moneda sólo se modifican mientras esté planificado y sin pagos, regla que también valida la API.

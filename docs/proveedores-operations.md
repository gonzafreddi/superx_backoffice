# Proveedores y presentaciones de compra

## Uso operativo

1. En **Operaciones / Proveedores**, buscá por razón social, CUIT o contacto y filtrá por estado. Seleccioná una fila para abrir la ficha.
2. Creá o editá un proveedor desde el formulario reutilizado. La razón social es obligatoria; CUIT, contacto, dirección, condición de pago y notas son opcionales. La condición de pago se informa en días enteros no negativos.
3. Desde el detalle, **Presentaciones de compra** relaciona los productos con la forma concreta en que ese proveedor los entrega. Buscá un producto, elegí el resultado, indicá nombre de presentación y unidades por pack; podés guardar código de barras, código del proveedor, estado y si es la predeterminada.
4. Las presentaciones se pueden editar desde la misma sección. El producto de una presentación existente no se reasigna: para otra relación, creá una presentación nueva.

## Acceso e integración

El módulo consulta el usuario almacenado por el inicio de sesión y sólo habilita la interfaz para rol `admin`; sin sesión muestra el acceso correspondiente y para otro rol muestra "No autorizado". `app/lib/supplier-api.ts` usa Bearer token para los endpoints de proveedores y presentaciones. Si no se configuró `NEXT_PUBLIC_SUPERX_API_BASE_URL`, conserva fixtures mutables en memoria para probar altas y ediciones.

## Evidencia de verificación

- Reglas cubiertas en `tests/supplier-rules.test.mjs`: nombre de proveedor requerido, condición de pago válida, producto/nombre requeridos y unidades enteras positivas para una presentación.
- Verificar manualmente contra backend: alta con CUIT único, edición de proveedor, búsqueda de producto y alta/edición de presentación; un CUIT o combinación producto-proveedor-presentación duplicados deben recibir el mensaje del backend.

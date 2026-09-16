# Evidencia — PK-004: escaneo de código de barras

## Implementado

- La pantalla móvil `/picking` ahora prioriza el escaneo: el campo de texto se enfoca al abrir o avanzar de línea, acepta lectores USB/Bluetooth HID que escriben como teclado y confirma con el Enter final del lector.
- El botón existente **Confirmar línea** continúa como alternativa manual y envía el pick sin `barcode`, para la anulación manual auditada.
- `PickingApi.pickItem` acepta `barcode?: string`; el adaptador HTTP lo incorpora al cuerpo sólo cuando existe.
- Una respuesta del backend `400` con `"Scanned barcode does not match this item."` se transforma en `PickingApiError` con código `barcode_mismatch` y un mensaje accionable en español. La línea y la cantidad no se modifican y el campo vuelve a tomar foco.
- El fixture local contiene códigos realistas en algunas líneas y deja otras sin código para probar la alternativa manual. Un código incorrecto en fixture también devuelve `barcode_mismatch` sin mutar la línea.
- Se actualizó `docs/picking-app.md` con el uso scan-first y el contrato de integración.

No se agregaron pruebas de componentes ni dependencias: el cambio no introduce lógica pura nueva en `picking-rules.js`.

## Verificación ejecutada

Comando exacto ejecutado:

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Resultado: **PASS**.

- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm test`: PASS — 31 tests, 31 aprobados.
- `pnpm build`: PASS — compilación de producción y prerender de `/picking` correctos.

Nota: `pnpm test` muestra advertencias preexistentes de Node sobre archivos `*-rules.js` que se reinterpretan como ES modules; no afectan el resultado de los tests.

## Instrucciones breves para probar el circuito en depósito

1. Con el backend configurado, iniciá sesión como picker y abrí `/picking`. Tomá o abrí una tarea en curso.
2. Confirmá que el cursor quedó en **Escaneá el código de barras** para la línea actual. Si no, tocá el campo una vez.
3. Ajustá la cantidad con el stepper si corresponde y escaneá el código del producto con el lector HID. El Enter o salto de línea que emite el lector debe enviar la línea automáticamente.
4. Verificá que la pantalla avance a la siguiente línea pendiente y que el progreso aumente.
5. Para comprobar la protección, escaneá a propósito el código de otro producto. Debe aparecer **“El código escaneado no corresponde a este producto.”**; la línea, la cantidad elegida y el progreso deben permanecer sin cambios, y el cursor debe volver al campo de escaneo.
6. Para probar el respaldo manual, ajustá la cantidad y tocá **Confirmar línea** bajo **“o confirmá manualmente”**, sin escanear. Debe registrar la línea y avanzar igual que antes.
7. Como prueba sin lector, escribí manualmente el código en el campo y presioná Enter. En el fixture local, la primera línea de `SX-1048` acepta `7791234567891`; `7791234567890` debe fallar por no corresponder. La línea de pan no tiene código de fixture y se confirma manualmente.

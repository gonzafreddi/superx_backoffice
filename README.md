# SuperX Backoffice

## Gestión de productos

La pantalla principal permite buscar por nombre, SKU o barcode y filtrar por categoría, marca y estado. Seleccioná un producto para ver el detalle y editarlo. El selector de rol permite verificar los permisos: **consulta** sólo ve; **operador** crea, edita y activa/inactiva; **administración** además puede eliminar, siempre con confirmación.

No hay un contrato backend disponible en este repositorio. Por eso `app/lib/product-api.ts` implementa el contrato `ProductApi` con un mock tipado, persistente durante la sesión. El adaptador está aislado para sustituirlo por el cliente HTTP real sin modificar componentes ni reglas de validación.

## Verificación

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

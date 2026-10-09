# EVIDENCE — peso + compra mínima (backoffice)

Implementado por codex (cortado por límite de uso al final; verificación y fix de test por el orquestador).
Contrato: /home/dev/superx/prompt_peso_minimo.md + EVIDENCE del backend (8cc5e62).

- /entregas: Compra mínima por zona (minimumOrderAmount).
- Productos: Se vende por Unidad/Peso, mínimo/incremento en g, precio por kg; listados y precios con /kg.
- Stock/inventario/compras/recepción/depósito/ubicaciones: cantidades WEIGHT en kg (gramos en API), helper app/lib/quantity-rules.js.
- Picking: peso real obligatorio (POST /picking/tasks/:id/items/:itemId/weight), sin precios.
- Pedido: "500 g pedidos · 530 g reales", $/kg, total final.

Verificación: typecheck OK, lint OK, test 221/221, build OK.

# Tablero de KPIs

## Uso

1. En **Dirección / Tablero** elegí un rango: presets (Hoy / 7 / 30 / 90 días) o fechas personalizadas (no se admiten fechas futuras, rango invertido ni períodos mayores a 92 días).
2. Las tarjetas muestran los KPIs del rango: **pedidos** (y promedio diario), **GMV** y **ticket promedio** (sólo operador/administración), **cancelaciones** (cantidad y tasa), **stockouts**, **fill rate** y **tiempos de picking y entrega**. El gráfico inferior muestra pedidos por día.
3. Si un KPI todavía no tiene histórico suficiente aparece como "—" y se lista en "Pendientes de datos". Si no hubo pedidos en el rango, se muestra el estado **"Todavía no hay datos suficientes"**.

Todas las cifras las **define y calcula el backend**; el frontend sólo elige el rango y las presenta (no recalcula GMV, promedios ni tasas).

## RBAC

- **Consulta**: ve los KPIs operativos (pedidos, cancelaciones, stockouts, fill rate, tiempos) pero **no** los financieros (GMV, ticket promedio).
- **Operador / Administración**: ven todos los KPIs.

## Estado de integración

`app/lib/metrics-api.ts` es un mock temporal marcado. El contrato objetivo es `GET /api/metrics/overview?from=&to=` devolviendo un `KpiSnapshot` (o `null` si no hay datos). Las métricas se definen en backend; `metrics-rules.js` sólo valida el rango y arma los presets. No hay migraciones en este cambio.

## Evidencia de verificación

- Reglas testeadas (`tests/metrics-rules.test.mjs`): visibilidad financiera por rol; `validateRange` (fecha inválida, invertida, futura, rango > 92 días); `presetRange`; `rangeDays`; `describeDataCoverage` (métricas pendientes y estado sin datos).
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (26) y `pnpm build` finalizaron correctamente.
- Pendiente de navegador: sin Playwright/Chromium. Al disponer de backend o navegador, verificar: cambiar de rol a Consulta y comprobar que desaparecen GMV y ticket; elegir el preset "Hoy" y comprobar el estado "sin datos suficientes"; ingresar un rango invertido y ver el error inline.

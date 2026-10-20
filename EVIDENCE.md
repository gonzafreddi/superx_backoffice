# Evidencia — módulo Ventas (backoffice)

Fecha: 2026-10-17. Contrato leído completo: `/home/dev/superx/prompt_ventas.md`.

## Archivos tocados

- `app/(backoffice)/ventas/page.tsx`: ruta y metadata `SuperX · Ventas`, con Suspense para los parámetros de búsqueda.
- `app/components/sales/sales-workspace.tsx`: las seis pestañas, períodos y filtros, KPIs con comparación, resultados e inventario, permisos y estados independientes de carga/error/reintento.
- `app/components/sales/sales-charts.tsx`: barras y línea, donut, barras apiladas y horizontales; SVG propios, leyendas, títulos, detalle al hover/tap/foco y selección por teclado.
- `app/components/sales/sales-tables.tsx`: ventas y caja con totales, métodos dinámicos, ranking ordenable, stock, paginación y scroll contenido.
- `app/components/sales/sales.css`: estilos limitados al módulo, tokens existentes, skeletons, filtros sticky y ajustes responsive.
- `app/lib/sales-contract.ts`: tipos que conservan las formas JSON del contrato y los importes decimales como strings.
- `app/lib/sales-api.ts`: cliente autenticado para summary, daily, cash-daily, breakdown y stock-valuation.
- `app/lib/sales-rules.ts`: períodos en hora argentina, validación de fechas/rango, formato ARS, porcentajes, URLs y aritmética monetaria entera.
- `app/lib/sales-fixtures.ts`: datos deterministas con variación diaria, días vacíos, comparación, cobros, gastos, categorías y stock por depósito.
- `app/lib/download-csv.ts`: admite exclusivamente las dos nuevas rutas CSV de Ventas, conserva authFetch y genera CSV de demostración con el helper existente.
- `app/lib/navigation.ts`: grupo Ventas inmediatamente antes de Finanzas.
- `app/lib/permissions.ts`: permiso sales.read para accountant; admin conserva acceso general.
- `tests/sales.test.tsx`: períodos, formato, URLs/parámetros/errores API, tablas/totales, métodos futuros, ordenamiento, conciliación y CSV.
- `tests/permissions.test.tsx`: matriz de permisos y navegación actualizadas.
- `EVIDENCE.md`: este informe.

## Decisiones

- Se siguió la estructura real del repo: los clientes están en `app/lib/*-api.ts`; no existía `app/api/`. El nuevo cliente usa authFetch y api-mode igual que los existentes.
- Se consultaron las guías locales de Next 16 sobre páginas y History API. `?tab=`, `?from=` y `?to=` se sincronizan con useSearchParams y pushState; funcionan atrás/adelante y los enlaces directos.
- Ventas entregadas, caja por movimientos y fotos actuales de inventario/pendiente se presentan como conceptos distintos. No se recalculan los resultados del backend ni se convierten los strings monetarios de las respuestas.
- Los fixtures requieren fixturesEnabled y ambiente fuera de producción, incluso si se habilitan fixtures explícitamente en producción. Sus sumas monetarias usan BigInt en centavos, compatible con el target ES2017 mediante BigInt(...). Las conversiones a number se usan para presentación, proporciones y coordenadas de gráficos.
- Se reutilizan ExportCsvButton, MobileFilters, Notice y TablePagination, además del endpoint existente de depósitos (locationApi.listWarehouses).
- Las tablas mantienen columnas y totales en un contenedor con scroll horizontal propio. El período y las pestañas también tienen scroll contenido en teléfonos. Se corrigió un desborde de la grilla detectado a 375 px y el corte de cifras en las cards.
- Se conservan los tokens y la tipografía del backoffice. No se modificaron estilos globales, dependencias, reportes existentes ni backend. No se agregaron librerías de gráficos.
- Los avisos explican IVA, cobertura de costos, ventas entregadas y fotos actuales. Stock contempla enlaces para completar productos sin costo/precio; Rentabilidad explica ROI anualizado y días de inventario.

## Verificaciones

Todas terminaron correctamente:

1. `pnpm lint`: exit 0; sin errores ni warnings.
2. `NEXT_PUBLIC_SUPERX_API_BASE_URL=http://127.0.0.1:4000 pnpm typecheck`: exit 0; tipos de rutas generados y tsc sin errores.
3. `pnpm test` sin NEXT_PUBLIC_SUPERX_API_BASE_URL: exit 0; **260 tests, 260 aprobados, 0 fallidos**, 0 cancelados/omitidos.
4. `NEXT_PUBLIC_SUPERX_API_BASE_URL=http://127.0.0.1:4000 pnpm build`: exit 0; compilación y TypeScript correctos, 46/46 páginas generadas, `/ventas` incluida. Build repetido tras el último ajuste exclusivamente CSS.
5. `git diff --check`: correcto.

Logs locales: `/tmp/ventas-final-{lint,typecheck,test,build}.log`.

### Navegador (Playwright / Chromium)

- **1440 px y 375 px**: las seis pestañas; URL y navegación atrás; tablas con totales; descarga real de ambos CSV; stock por producto; sin desborde horizontal del documento ni errores JavaScript.
- Capturas inspeccionadas de tablero desktop/mobile; capturas adicionales de cada pestaña: `/tmp/ventas-{1440,375}-{dashboard,daily,cash,products,stock,profitability}.png`.
- **Build de producción**, cuenta accountant y respuestas HTTP simuladas con las formas del contrato: fallo 503 aislado en categorías sin romper KPIs ni evolución; reintento exitoso; sin fixtures de producción; validación de rango invertido; período personalizado reflejado en URL; mobile y reduced-motion.
- Resultados: `/tmp/ventas-browser.log` y `/tmp/ventas-prod-browser.log`. Scripts locales en `/tmp/ventas-browser.py` y `/tmp/ventas-prod-browser.py`.

La validación HTTP de navegador usa respuestas simuladas; no reemplaza una integración E2E contra el backend que se implementa en paralelo.

No se hizo commit ni push. Los cambios quedan en el árbol de este worktree.

## Corrección 2026-10-17

- Contrato actualizado con `netSales` en summary (actual, anterior y delta), filas/totales diarios y breakdown. Los importes siguen siendo strings decimales recibidos del backend.
- Fixtures: venta neta = venta bruta − descuentos; margen bruto = venta neta − CMV y porcentaje sobre venta neta. Facturación de demostración = venta neta + envíos; resultado neto, comparación y ROI usan los márgenes corregidos. Participación del breakdown calculada sobre venta neta, con ranking descendente (hora/día conservan el orden cronológico).
- Tablero y Rentabilidad comparten la secuencia Venta bruta → − Descuentos → = Venta neta → − CMV → = Margen bruto → + Envíos → − Devoluciones → − Gastos operativos → = Resultado neto. Se conserva el desglose expandible de gastos y se explicita la base del porcentaje en el KPI Margen bruto.
- Ventas diarias y CSV de fixtures incluyen Venta neta inmediatamente después de Descuentos. Productos y categorías muestra Venta neta como importe principal, conserva Venta bruta y usa venta neta en las barras de categorías; la participación conserva el `share` del backend.
- Tests actualizados: contrato decimal, columna/totales, conciliación de venta neta y margen (incluidos días vacíos y período anterior), delta, participación/ranking, CSV y secuencia/detalle del estado de resultados.

Verificaciones de esta corrección, todas con exit 0:

1. `pnpm lint`.
2. `NEXT_PUBLIC_SUPERX_API_BASE_URL=http://127.0.0.1:4000 pnpm typecheck`.
3. `pnpm test` con `NEXT_PUBLIC_SUPERX_API_BASE_URL` eliminada del ambiente: **261 tests aprobados, 0 fallidos**.
4. `NEXT_PUBLIC_SUPERX_API_BASE_URL=http://127.0.0.1:4000 pnpm build`: `/ventas` generada correctamente.
5. `git diff --check`.

Logs: `/tmp/ventas-correction-{lint,typecheck,test,build}.log`. Esta corrección se verificó con tests y build; no se repitió la prueba de navegador ni se validó contra el backend en desarrollo paralelo. Sin commit ni push.

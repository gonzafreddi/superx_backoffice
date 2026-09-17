# Convenciones — superx_backoffice

Repositorio independiente (no monorepo): `superx_backoffice` (este, panel
administrativo), `superx_back` (API) y `superx_front` (PWA cliente), cada uno
con su propio remoto en `github.com/gonzafreddi`. Se coordinan por contrato
HTTP y por las tarjetas de Trello del board **superx**, no por dependencias
de código compartido.

## Ramas

Trunk-based: todo el trabajo normal (una tarjeta = un cambio acotado) se
commitea directo a `main` una vez verificado (lint/typecheck/test/build en
verde). No se abren pull requests para el flujo estándar. Reservá una rama de
corta vida (`feature/<CARD-ID>-slug`, ej. `feature/BO-009-reportes`) sólo
para trabajo experimental o riesgoso; borrala apenas mergea.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `tipo(scope):
resumen en imperativo`. Tipos usados en este repo: `feat`, `fix`, `refactor`,
`test`, `docs`, `chore`. El scope es el dominio operativo afectado, ej.
`feat(delivery): zonas y franjas`.

Los commits generados por un agente llevan el footer:

```
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```

## Naming

- Rutas (`app/`): `kebab-case`, App Router de Next.js. Las pantallas para
  trabajadores móviles (picking, reparto) viven **fuera** del grupo
  `(backoffice)`/`AdminShell` — son vistas de una sola mano, sin navegación
  administrativa.
- Patrón por dominio: `app/components/<dominio>-manager.tsx` (lista +
  detalle) + `app/lib/<dominio>-api.ts` (adaptador, comentario
  `/** Mock TEMPORAL: ... */` mientras no exista el endpoint real) +
  `app/lib/<dominio>-contract.ts` (tipos) + `app/lib/<dominio>-rules.js`
  (reglas puras, JS plano).
- `*-rules.js` corre bajo `node --test` (ESM sin compilar): nunca usar
  sintaxis TypeScript ahí (`import type`, `export type` rompen la carga) ni
  importar desde un `*-contract.ts` — si un label hace falta en ambos lados,
  se duplica la constante en el `.js`. Los imports relativos entre
  `*-rules.js` llevan extensión `.js` explícita.
- Documentación operativa por feature en `docs/<dominio>-operations.md`.

## Estilo de código

ESLint (`eslint.config.mjs`) + `.editorconfig` (2 espacios, UTF-8, LF,
newline final). Ejecutar antes de commitear:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

`pnpm test` corre `node --test tests/**/*.test.mjs` — sólo pruebas de las
funciones puras en `app/lib/*-rules.js`, no hay tests de componentes.

## Next.js: leer antes de codear

Este proyecto usa una versión de Next.js con cambios respecto a lo
entrenado en los modelos — ver `AGENTS.md` y `node_modules/next/dist/docs/`
antes de escribir código nuevo.

## Evidencia y trazabilidad

Cada tarjeta implementada agrega una entrada a `EVIDENCE.md` con lo
implementado, la verificación ejecutada y las decisiones/supuestos no
obvios. El board Trello es la fuente de verdad del estado de cada tarjeta;
leer DOC-001..006 y PLAN-001 antes de tomar una tarjeta nueva.

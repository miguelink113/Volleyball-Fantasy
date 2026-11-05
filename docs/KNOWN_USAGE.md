# Known Usage (Falsos Positivos y Zonas Protegidas)

Este documento es la **fuente de la verdad** para el deslop. Si una herramienta (`knip`, `ts-prune`) marca algo de esta lista como "código muerto" o "export sin usar", la herramienta se equivoca. **NO BORRAR, NO RENOMBRAR, NO MODIFICAR sin permiso explícito.**

## 1. Framework y Entry Points (Next.js)
Next.js importa estos archivos dinámicamente, por lo que `ts-prune` los marca como no usados. Son el corazón de la app:
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
- `app/dashboard/page.tsx`, `app/fantasy/page.tsx`, `app/login/page.tsx`, `app/results/page.tsx`
- `proxy.ts` (Middleware de Supabase para refrescar sesiones)
- `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`
- **Todos los archivos `route.ts` dentro de `app/api/`**. Son endpoints HTTP expuestos, aunque ningún archivo TypeScript los importe explícitamente.

## 2. Scripts Administrativos y CLI
Son archivos ejecutados manualmente desde la terminal o por tareas programadas (Cron). No son importados por la app de Next.js, pero son esenciales:
- `scripts/ingest/ingest-roster.ts`
- `scripts/ingest/ingest-matches.ts`
- `scripts/ingest/ingest-standings.ts` (¡El que acabamos de crear!)
- `scripts/ingest/ingest-market-values.ts`
- `scripts/ingest/calculate-scores.ts`
- `scripts/tests/**/*` (Todos los scripts de test, se ejecutan con `npm run test:*`)
- `scripts/tools/**/*` (Herramientas de diagnóstico manual)

## 3. Falsos Positivos de Knip (Código Vivo Reciente)
Knip a veces no detecta el uso interno entre servicios o el uso desde scripts CLI.
- `lib/scraper/fetch-competition-standings.ts` (Usado por `ingest-standings.ts` y `/api/standings/route.ts`).
- `lib/services/fantasy/fantasy-round-score.service.ts` (Usado por la API de scoring y scripts).
- `lib/services/ingestion/map-scraped-match.ts` (Usado en tests de ingesta).
- `lib/services/fantasy/fantasy-team.service.ts` (Puede que otras partes del equipo sí se usen. Revisar antes de borrar).

## 4. Tipos y Dominio
Knip y ts-prune a veces fallan con exportaciones de tipos (especialmente si se usan como `import type`).
- Todos los archivos en `domain/` (ej. `fantasy.types.ts`, `team-player.types.ts`, `round.types.ts`, `match.types.ts`).
- Los tipos exportados en `lib/scraper/fetch-match-statistics.ts` (`FormationValue`, `StatValue`, `TeamStats`).
- `MappedTeam` en `lib/services/ingestion/map-scraped-match.ts`.
- `TeamAliasSource` en `lib/services/ingestion/team-alias-resolver.ts`.

## 5. Base de Datos e Infraestructura
**Bajo ningún concepto** tocar los strings literales que conectan con Supabase.
- **Migraciones SQL**: Todo en `supabase/migrations/**`.
- **RPCs (Funciones SQL)**: `transfer_player`, `save_lineup`, `create_private_league`, `join_private_league`, `leave_private_league`.
- **Nombres de tablas y columnas**: Cualquier string dentro de `.from('...')`, `.select('...')` o `.rpc('...')` (ej. `team_standings`, `player_market_values`, `group_name`, `sets_ratio`).

## 6. Dependencias del Sistema
- `supabase`, `depcheck`, `madge`, `ts-prune` (Herramientas de desarrollo/CLI, no se importan en el código).
- `lucide-react`, `recharts`: Knip los marca como no usados. *Pendiente de verificación manual*. Si el usuario confirma que no se usan en la UI, se borrarán en la Fase 2.

## 7. Next.js / React (No tocar)
- `hooks/useAuth.ts` (Usado dinámicamente en componentes cliente).
- Cualquier `components/ui/*` que sea importado por `app/` o `components/`.
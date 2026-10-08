# Estado del proyecto

## Resumen

Las fases 1–4 del plan están completadas. Dominio, scoring, migración
Supabase, verificación remota del esquema e **ingesta idempotente del catálogo
deportivo** están operativas. El catálogo de la competición 152 (temporada
186) ya está persistido en Supabase: 12 equipos y 180 jugadores, verificados
     mediante ejecución repetida sin duplicación.

Auth y perfiles se conectan a Supabase. La ingesta de partidos y estadísticas
todavía no está implementada. La UI de producto (`/fantasy`) continúa siendo
una demo en memoria que consulta RFEVB en vivo; la migración a datos
persistidos corresponde a la Fase 5.

## Implementado

### Dominio y scoring

- Contratos de competición, temporada, equipos, jugadores, partidos,
  estadísticas, rondas, fantasy y puntuación.
- Posiciones internas normalizadas, estado de partido explícito y sets
  opcionales (`number | null` en TypeScript).
- `ScoringSystemV1` basado en datos disponibles del scraper, versionado y
  documentado en `docs/SCORING.md`.
- Tests de dominio en `npm run test:domain`.

### Autenticación y perfiles

- Supabase Auth con email y contraseña.
- Perfil `username` único; no existe `full_name`.
- Trigger de perfil y política de lectura propia documentados en la migración.

### Esquema Supabase

- Migración `supabase/migrations/20260925190000_create_fantasy_schema.sql`.
- Migración `supabase/migrations/20261008120000_require_rfevb_ids.sql` que
  exige `rfevb_id NOT NULL` en `competitions`, `seasons`, `teams` y `players`.
- Catálogo deportivo, rondas, valores de mercado, ligas, membresías, equipos,
  plantilla, alineaciones, puntuaciones y transacciones.
- Claves foráneas y restricciones para aislar competición/temporada y evitar
  propiedad activa duplicada de un jugador dentro de una liga.
- RLS, políticas de lectura y RPC para mutaciones fantasy.
- Propiedad de la liga transferida al miembro restante más antiguo; si sale el
  único miembro, se elimina la liga.

### Verificación remota del esquema (Fase 3A)

- `npm run test:supabase:schema` ejecutado con éxito contra el proyecto
  Supabase remoto.
- Confirma las 19 tablas, columnas, tipos, RLS, FKs compuestas, constraints,
  índice de propiedad activa, políticas de lectura, permisos RPC y trigger de
  perfil.
- Verifica además que `rfevb_id` es `NOT NULL` en `competitions`, `teams` y
  `players`.
- No se detectaron discrepancias entre la migración aplicada y el modelo
  documentado.

### Ingesta idempotente del catálogo (Fase 4)

- Cliente administrativo server-only en `lib/supabase/admin.server.ts`, con
  protección contra ejecución en navegador y test reproducible
  (`npm run test:supabase:admin`).
- Mappers puros `mapTeam` y `mapPlayer` en `lib/services/ingestion/`, con
  validación estricta de `rfevb_id` (invariante del sistema).
- Tests unitarios de mappers en `npm run test:ingestion-mappers`.
- Script administrativo `scripts/ingest-roster.ts` que realiza:
  1. Upsert idempotente de `competitions` y `seasons`.
  2. Scrape del roster desde RFEVB.
  3. Upsert idempotente de `teams` y `players` con
     `onConflict: "season_id,rfevb_id"`.
  4. Verificación de conteos contra RFEVB.
- Ejecución verificada dos veces consecutivas sobre la competición 152,
  temporada 186: 12 equipos y 180 jugadores, sin duplicación.

## Cargar el catálogo en local

Con `.env.local` configurado (URL, publishable key y secret key de Supabase):

```bash
npx tsx scripts/ingest-roster.ts \
  --competition=152 \
  --season=186 \
  --season-name="2025/26"
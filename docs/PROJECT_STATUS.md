# Estado del proyecto

## Resumen

Las fases 1–4 del plan están completadas, y también la resolución de alias de equipos que bloqueaba la Fase 5. Dominio, scoring, migración Supabase, verificación remota del esquema, ingesta idempotente del catálogo deportivo y resolución de nombres desalineados entre roster y actas están operativos.

El catálogo de las cuatro competiciones de liga 25/26 está persistido en Supabase: **94 equipos y 1449 jugadores**, verificados mediante ejecución repetida sin duplicación.

Auth y perfiles se conectan a Supabase. La ingesta de partidos y estadísticas todavía no está implementada; es el siguiente paso de la Fase 5.

## Implementado

### Dominio y scoring

- Contratos de competición, temporada, equipos, jugadores, partidos, estadísticas, rondas, fantasy y puntuación.
- Posiciones internas normalizadas, estado de partido explícito y sets opcionales (`number | null` en TypeScript).
- `ScoringSystemV1` basado en datos disponibles del scraper, versionado y documentado en `docs/SCORING.md`.
- Tests de dominio en `npm run test:domain`.

### Autenticación y perfiles

- Supabase Auth con email y contraseña.
- Perfil `username` único; no existe `full_name`.
- Trigger de perfil y política de lectura propia documentados en la migración.

### Esquema Supabase

- Migración `supabase/migrations/20260925190000_create_fantasy_schema.sql`.
- Migración `supabase/migrations/20261008120000_require_rfevb_ids.sql`, que exige `rfevb_id NOT NULL` en `competitions`, `seasons`, `teams` y `players`.
- Migración `../supabase/migrations/20261013230000_create_team_source_aliases.sql`, que introduce la tabla de alias de nombres de equipo.
- Catálogo deportivo, rondas, valores de mercado, ligas, membresías, equipos, plantilla, alineaciones, puntuaciones y transacciones.
- Claves foráneas y restricciones para aislar competición/temporada y evitar propiedad activa duplicada de un jugador dentro de una liga.
- RLS, políticas de lectura y RPC para mutaciones fantasy.
- Propiedad de la liga transferida al miembro restante más antiguo; si sale el único miembro, se elimina la liga.

### Verificación remota del esquema (Fase 3A)

- `npm run test:supabase:schema` ejecutado con éxito contra el proyecto Supabase remoto.
- Confirma las 20 tablas, columnas, tipos, RLS, FKs compuestas, constraints, índice de propiedad activa, políticas de lectura, permisos RPC y trigger de perfil.
- Verifica además que `rfevb_id` es `NOT NULL` en `competitions`, `teams` y `players`, y que `team_source_aliases` tiene su FK compuesta y su política de lectura.
- No se detectaron discrepancias entre la migración aplicada y el modelo documentado.

### Ingesta idempotente del catálogo (Fase 4)

- Cliente administrativo server-only en `lib/supabase/admin.server.ts`, con protección contra ejecución en navegador y test reproducible (`npm run test:supabase:admin`).
- Mappers puros `mapTeam` y `mapPlayer` en `lib/services/ingestion/`, con validación estricta de `rfevb_id` (invariante del sistema).
- Tests unitarios de mappers en `npm run test:ingestion-mappers`.
- Script administrativo `scripts/ingest-roster.ts` que realiza:
  1. Upsert idempotente de `competitions` y `seasons`.
  2. Scrape del roster desde RFEVB.
  3. Upsert idempotente de `teams` y `players` con `onConflict: "season_id,rfevb_id"`.
  4. Registro automático de los nombres del roster como aliases `source: "roster"` en `team_source_aliases`.
  5. Verificación de conteos contra RFEVB.

### Resolución de alias de equipos (bloqueante previo a Fase 5) ✅

- Migración `team_source_aliases` con RLS de solo lectura para authenticated.
- `TeamAliasResolver` en `lib/services/ingestion/team-alias-resolver.ts`: normaliza nombres (stopwords societarias, sin diacríticos ni apóstrofos) y resuelve por coincidencia exacta o por subset de tokens con tolerancia a prefijos, exigiendo candidato único o prefiriendo el nombre más específico cuando hay varios candidatos.
- `mapScrapedMatch` acepta `MatchMappingContext` opcional con `teamId`/`rfevbId`/`name` por lado, sin romper el camino sin contexto.
- `diagnose:team-aliases` valida las 4 competiciones 25/26 contra las actas: 0 colisiones, 0 nombres de acta sin resolver salvo un partido de playoff cuyo equipo no está en el roster regular, que se omitirá en la ingesta.
- `ingest-roster` registra automáticamente los nombres del roster como aliases `source: "roster"` al ingerir equipos.

### Catálogo persistido tras las 4 ingestas

| Competición | RFEVB | Equipos | Jugadores |
| --- | --- | ---: | ---: |
| Superliga Masculina 25/26 | 152/186 | 12 | 180 |
| Superliga Femenina 25/26 | 151/185 | 12 | 167 |
| Superliga 2 Masculina 25/26 | 153/187 | 34 | 550 |
| Superliga 2 Femenina 25/26 | 150/183 | 36 | 552 |
| **Total** | | **94** | **1449** |

## Cargar el catálogo en local

Con `.env.local` configurado (URL, publishable key y secret key de Supabase):

```bash
npx tsx scripts/ingest-roster.ts --competition=152 --season=186 --season-name="2025/26"
npx tsx scripts/ingest-roster.ts --competition=151 --season=185 --season-name="2025/26"
npx tsx scripts/ingest-roster.ts --competition=153 --season=187 --season-name="2025/26"
npx tsx scripts/ingest-roster.ts --competition=150 --season=183 --season-name="2025/26"
```

Cada ejecución es idempotente y verifica los conteos contra RFEVB al final.

## Fase 5 — Catálogo persistente (en curso)

### Fase 5.1 — Ingesta de partidos ✅

- Script `scripts/ingest-matches.ts` con ingesta idempotente de
  `rounds`, `matches` y `match_player_stats`.
- `rounds.starts_at` / `ends_at` derivados de las fechas reales de los
  partidos de cada jornada (00:00 del primer día → 00:00 del día siguiente
  al último). Timezone Europe/Madrid → UTC con manejo de DST.
- Cruce de jugadores de acta → roster: **primero por nombre** (dentro del
  equipo), **dorsal como fallback**. Si no resuelve unívocamente, se omite
  con warning.
- `position` se toma siempre del roster, nunca del acta.
- Aliases de actas resueltas se registran con `source: "matches"`.
- `TeamAliasResolver.registerAliases` con `ignoreDuplicates: true` para
  no pisar los aliases `source: "roster"` con los de acta.

**Resultado en competición 152 / temporada 186 (Superliga Masculina 25/26):**

| Métrica | Valor |
| --- | ---: |
| Jornadas procesadas | 25 (1–22 regulares + 23–25 playoffs) |
| Partidos en RFEVB | 150 |
| Partidos persistidos | 150 / 150 |
| Stats de jugador | 3.859 |
| Equipos sin resolver | 0 |
| Partidos sin stats | 1 (`13920`, acta sin tabla de equipos) |
| Stats sin cruce de jugador | 73 (1.9 %) |

Las 73 stats huérfanas se concentran en ~15 jugadores con nombres de acta
ruidosos (dorsal cambiante, nombre fragmentado, typos). Deuda menor
documentada: no bloquea la Fase 5 y se revisará si Fase 9 lo requiere.

### Pendiente

1. **Fase 5.2** — Ingesta de `player_market_values` (9M fijos para todos
   los jugadores).
2. **Fase 5.3** — Repositorios de lectura tipados `lib/repositories/`
   sobre el catálogo persistido.
3. **Fase 5.4** — Migrar `/fantasy` y las rutas API
   (`/api/competition-roster`, `/api/matches`, `/api/match-statistics`,
   `/api/competition-statistics`, `/api/fantasy-round-scores`) de
   lecturas en vivo desde RFEVB a Supabase.
# Volleyball Fantasy

Aplicación web de fantasy de voleibol construida con Next.js, TypeScript y Supabase. El repositorio combina la extracción de datos de RFEVB, un dominio tipado, persistencia del catálogo y una interfaz con autenticación, ligas privadas y gestión del equipo fantasy.

> **Estado de esta revisión:** Fases 1 a 12 completadas. Fase 13 (automatización) y mercado dinámico implementados. La aplicación está desplegada en producción en Vercel con un workflow diario de GitHub Actions que actualiza datos, puntuaciones y precios de mercado sin intervención manual.

## Estado actual

### Catálogo documentado

| Entidad | 2025/26 | 2026/27 (Actual) |
| --- | ---: | ---: |
| Equipos | 94 | 96 |
| Jugadores | 1.449 | 1.388 |
| Partidos | 1.045 | 266 |
| Estadísticas de jugador | 25.262 | 6.368 |

Las competiciones base son Superliga Masculina, Liga Iberdrola, Superliga Femenina 2 y Superliga 2 Masculina. Los precios de mercado se calculan dinámicamente tras cada ingesta.

### Funcionalidad implementada en el código

- Autenticación y perfil con Supabase Auth (configurado para producción).
- Ingesta administrativa del roster, jornadas, partidos y estadísticas desde RFEVB.
- **Soporte multi-grupo:** Capacidad de procesar competiciones divididas en grupos. La UI unifica las jornadas para el usuario.
- **TeamAliasResolver v2:** Resolución automática de equipos con containment y asignación greedy.
- **Normalización de grupos:** El scraper detecta nombres de patrocinadores ("Alcudia", "Egido") y los reasigna al grupo canónico del equipo, evitando rondas fantasma y partidos duplicados.
- **Cache de ingesta:** `ingest-matches.ts` carga los partidos ya completados en BD y evita descargar sus stats. Reduce la ingesta de ~15 min a ~2 min.
- **Escudo anti-duplicados:** Detecta si un equipo ya tiene partido en la misma jornada, incluso con partidos servidos desde cache.
- Repositorios de lectura para equipos, jugadores, jornadas, partidos, estadísticas y valores de mercado.
- `GET /api/competition-roster` lee el catálogo y los precios dinámicos de la última jornada con precios.
- `GET /api/fantasy-round-scores` calcula bajo demanda puntuaciones por jornada (con desglose) a partir de partidos y estadísticas persistidos.
- **Mercado dinámico:** Fórmula `1 + (pts * 0.07) + min(media * 0.3, 5)`, piso 1M y techo 20M. Se recalcula tras cada ingesta.
- Dashboard dinámico con gestión de ligas y validaciones corregidas.
- Pantalla fantasy con pestañas (Alineación, Mercado, Clasificación), validación de límites estrictos en backend y bloqueos temporales.
- **Resultados (`/results`):** Lista de partidos por jornada con separación por grupos y clasificación real.
- **Mercado Diario:** Rotación automática de 14 jugadores cada día para incentivar la conexión.
- **Estadísticas de Jugador:** Modal detallado con desglose de puntos fantasy y stats reales por jornada. Muestra también `pts · PJ` (partidos jugados) en cada tarjeta.
- **Alineaciones:** Guardado masivo para todas las jornadas futuras. Si no hay jornadas futuras publicadas por DataProject, se guarda un borrador en `localStorage` con feedback visual (botón ámbar "Borrador guardado").
- **Automatización (Fase 13):** GitHub Actions ejecuta diariamente `check:new-matches`, ingesta (si hay cambios), cálculo de scores y mercado. Node 22.
- **Despliegue:** Frontend y API alojados en Vercel. CI/CD automático.

### Incompleto o pendiente de confirmar

- **Rediseño UI Fantasy:** Las pestañas de Alineación, Mercado y Clasificación mantienen el estilo de color antiguo.
- **Jornadas futuras:** DataProject publica el calendario de las jornadas progresivamente. La UI maneja la ausencia con borradores locales.

## Arquitectura

- **Ingesta:** `lib/scraper/` extrae datos de RFEVB; `scripts/ingest/` los guarda en Supabase.
- **Dominio:** `domain/` contiene tipos y `ScoringSystemV1`.
- **Persistencia:** Supabase almacena el catálogo y las tablas de fantasy.
- **Repositorios:** `lib/repositories/` encapsula lecturas tipadas.
- **Utils:** `lib/utils/` contiene helpers puros (ej. `round-label.ts`).
- **API de datos persistidos:** `app/api/competition-roster/`, `app/api/fantasy-round-scores/`, `app/api/fantasy-team/`, `app/api/league-ranking/` y `app/api/standings/`.
- **Endpoints de extracción:** `/api/matches`, `/api/match-statistics` y `/api/competition-statistics` siguen consultando RFEVB en directo.
- **Frontend:** `/dashboard` gestiona las ligas; `/fantasy` presenta plantilla, mercado, puntos y acciones de transferencia; `/results` muestra la clasificación real y los partidos.

## Inicio rápido

Requisitos: Node.js 22+ (por `@supabase/supabase-js` y el WebSocket nativo), npm, variables de entorno de Supabase y, para la verificación de esquema remoto, `SUPABASE_REMOTE_DB_URL`.

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. No incluyas claves secretas ni URIs PostgreSQL en Git.

## APIs principales

### Roster de competición

```text
GET /api/competition-roster?competition=152
```

Consulta en Supabase la competición indicada y su temporada dinámica `is_current=true`. Devuelve equipos y jugadores con precio obtenido de `player_market_values` de la última jornada con precios.

### Puntuaciones fantasy

```text
GET /api/fantasy-round-scores?competition=152&season=186
GET /api/fantasy-round-scores?competition=152&season=186&round=1
```

Calcula bajo demanda las puntuaciones usando datos persistidos. `round` es opcional. La respuesta incluye `playerId`, `roundNumber`, `score`, `breakdown`, `matchesPlayed` y `scoringVersion`.

### Equipo fantasy y Clasificación

```text
GET /api/fantasy-team?league_id=<uuid-de-liga>
GET /api/league-ranking?league_id=<uuid-de-liga>
GET /api/standings?seasonId=<uuid-de-temporada>
```

Devuelve el equipo visible para el usuario, la clasificación privada de la liga y la clasificación oficial de los equipos reales, respectivamente.

Para más detalles, consulta `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/SCRAPER.md`, `docs/SCORING.md` y `docs/DEVELOPMENT.md`.

## Comandos de desarrollo y validación

Los scripts declarados en `package.json` incluyen:

```bash
npm run build
npm run test:domain
npm run test:supabase
npm run test:supabase:schema
npm run test:supabase:admin
npm run test:ingestion-mappers
npm run test:repositories
npm run test:team-alias-resolver
npm run test:match-date-parser
npm run test:market-rules
npm run test:league-seeding
npm run test:lineup-rules
npm run test:scoring-persistence
npm run test:lockout
npm run calculate:scores
npm run calculate:market
npm run check:new-matches
npm run test:match-parser -- 1 1
npm run show:match-scores -- 1 1
# Ingesta de clasificaciones
npx tsx --env-file=.env.local scripts/ingest/ingest-standings.ts <competition_id> <season_id> <dp_id> <dp_pid>
```

## Próximas prioridades

1. Rediseño visual de la vista de Fantasy (unificar colores con Sidebar/Dashboard).
2. Resolver cruces de jugadores sin emparejar (~150 stats).
3. Ajustar la fórmula de mercado si algún tester detecta desequilibrios.
# Volleyball Fantasy

Aplicación web de fantasy de voleibol construida con Next.js, TypeScript y Supabase. El repositorio combina la extracción de datos de RFEVB, un dominio tipado, persistencia del catálogo y una interfaz con autenticación, ligas privadas y gestión del equipo fantasy.

> **Estado de esta revisión:** Las fases 1 a 8 están **completadas y verificadas**. El objetivo del plan es un MVP para 2026/27, y la interfaz ya está preparada para usar temporadas dinámicas.

## Estado actual

### Catálogo documentado

| Entidad | Último conteo documentado |
| --- | ---: |
| Equipos | 94 |
| Jugadores | 1.449 |
| Partidos | 1.045 |
| Estadísticas de jugador | 25.262 |

Las competiciones son Superliga Masculina, Superliga Femenina, Superliga 2 Masculina y Superliga 2 Femenina. El script de mercado permite sembrar un precio fijo (9M por defecto) para cada jugador y jornada.

### Funcionalidad implementada en el código

- Autenticación y perfil con Supabase Auth.
- Ingesta administrativa del roster, jornadas, partidos y estadísticas desde RFEVB.
- Resolución de alias de equipos entre el roster y las actas.
- Repositorios de lectura para equipos, jugadores, jornadas, partidos, estadísticas y valores de mercado.
- `GET /api/competition-roster` lee el catálogo y los precios persistidos en Supabase.
- `GET /api/fantasy-round-scores` calcula bajo demanda puntuaciones por jornada (con desglose) a partir de partidos y estadísticas persistidos.
- Dashboard para listar ligas propias y llamar a las operaciones RPC de creación, unión y salida.
- Pantalla fantasy que lee el equipo y el mercado persistidos y llama a la RPC `transfer_player` para comprar o vender jugadores.
- Validación de límite de plantilla (14), presupuesto y bloqueo de jornada en la base de datos.
- Guardado de alineaciones validado en base de datos (RPC `save_lineup`) con bloqueo por jornada.

### Incompleto o pendiente de confirmar

- El cálculo de puntuaciones se devuelve desde la API; no hay persistencia del resultado en `player_match_scores`, `player_round_scores` o `fantasy_scores`, ni clasificación por liga. (Fase 9).

## Arquitectura

- **Ingesta:** `lib/scraper/` extrae datos de RFEVB; `scripts/ingest/` los guarda en Supabase.
- **Dominio:** `domain/` contiene tipos y `ScoringSystemV1`.
- **Persistencia:** Supabase almacena el catálogo y las tablas de fantasy.
- **Repositorios:** `lib/repositories/` encapsula lecturas tipadas.
- **API de datos persistidos:** `app/api/competition-roster/`, `app/api/fantasy-round-scores/` y `app/api/fantasy-team/`.
- **Endpoints de extracción:** `/api/matches`, `/api/match-statistics` y `/api/competition-statistics` siguen consultando RFEVB en directo.
- **Frontend:** `/dashboard` gestiona las ligas; `/fantasy` presenta plantilla, mercado, puntos y acciones de transferencia.

## Inicio rápido

Requisitos: Node.js compatible con Next.js 16, npm, variables de entorno de Supabase y, para la verificación de esquema remoto, `SUPABASE_REMOTE_DB_URL`.

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

Consulta en Supabase la competición indicada y su temporada `is_current=true`. Devuelve equipos y jugadores con precio obtenido de los valores de mercado de la primera jornada disponible; si falta precio para un jugador, aplica un fallback de 9M.

### Puntuaciones fantasy

```text
GET /api/fantasy-round-scores?competition=152&season=186
GET /api/fantasy-round-scores?competition=152&season=186&round=1
```

Calcula bajo demanda las puntuaciones usando datos persistidos. `round` es opcional. La respuesta incluye `playerId`, `roundNumber`, `score`, `breakdown`, `matchesPlayed` y `scoringVersion`.

### Equipo fantasy

```text
GET /api/fantasy-team?league_id=<uuid-de-liga>
```

Devuelve el equipo visible para el usuario, los jugadores activos, el nombre de la temporada y los identificadores de la primera alineación encontrada.

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
npm run test:match-parser -- 1 1
npm run show:match-scores -- 1 1
```

## Próximas prioridades

1. Añadir persistencia de scoring y clasificación privada (Fase 9).
2. Integración end-to-end y despliegue en staging (Fases 10-12).

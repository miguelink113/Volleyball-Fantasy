# Volleyball Fantasy

Aplicación web de fantasy de voleibol construida con Next.js, TypeScript y Supabase[cite: 10]. El repositorio combina la extracción de datos de RFEVB, un dominio tipado, persistencia del catálogo y una interfaz con autenticación, ligas privadas y gestión del equipo fantasy[cite: 10].

> **Estado de esta revisión:** Las fases 1 a 10 están **completadas y verificadas**. El objetivo del plan es un MVP para 2026/27, y la interfaz gráfica es 100% dinámica basándose en la temporada actual.

## Estado actual

### Catálogo documentado

| Entidad | Último conteo documentado |
| --- | ---: |
| Equipos | 94 |
| Jugadores | 1.449 |
| Partidos | 1.045 |
| Estadísticas de jugador | 25.262 |

Las competiciones son Superliga Masculina, Superliga Femenina, Superliga 2 Masculina y Superliga 2 Femenina[cite: 10]. El script de mercado permite sembrar un precio fijo (9M por defecto) para cada jugador y jornada[cite: 10].

### Funcionalidad implementada en el código

- Autenticación y perfil con Supabase Auth[cite: 10].
- Ingesta administrativa del roster, jornadas, partidos y estadísticas desde RFEVB[cite: 10].
- Resolución de alias de equipos entre el roster y las actas[cite: 10].
- Repositorios de lectura para equipos, jugadores, jornadas, partidos, estadísticas y valores de mercado[cite: 10].
- `GET /api/competition-roster` lee el catálogo y los precios persistidos en Supabase de forma dinámica (`is_current = true`).
- `GET /api/fantasy-round-scores` calcula bajo demanda puntuaciones por jornada (con desglose) a partir de partidos y estadísticas persistidos[cite: 10].
- Dashboard dinámico para listar ligas propias y llamar a las operaciones RPC de creación, unión y salida[cite: 10].
- Pantalla fantasy 100% dinámica que lee el equipo, el mercado persistido y la temporada activa.
- Validación de límite de plantilla (14), presupuesto y bloqueo estricto de jornada en la base de datos basado en `starts_at`.
- Guardado de alineaciones validado en base de datos (RPC `save_lineup`) con bloqueo por jornada estricto.
- Persistencia de puntuaciones y clasificación privada mediante `/api/league-ranking`[cite: 10].

## Arquitectura

- **Ingesta:** `lib/scraper/` extrae datos de RFEVB; `scripts/ingest/` los guarda en Supabase[cite: 10].
- **Dominio:** `domain/` contiene tipos y `ScoringSystemV1`[cite: 10].
- **Persistencia:** Supabase almacena el catálogo y las tablas de fantasy[cite: 10].
- **Repositorios:** `lib/repositories/` encapsula lecturas tipadas[cite: 10].
- **API de datos persistidos:** `app/api/competition-roster/`, `app/api/fantasy-round-scores/`, `app/api/fantasy-team/` y `app/api/league-ranking/`[cite: 10].
- **Endpoints de extracción:** `/api/matches`, `/api/match-statistics` y `/api/competition-statistics` siguen consultando RFEVB en directo[cite: 10].
- **Frontend:** `/dashboard` gestiona las ligas; `/fantasy` presenta plantilla, mercado, puntos y acciones de transferencia 100% dinámicos[cite: 10].

## Inicio rápido

Requisitos: Node.js compatible con Next.js 16, npm, variables de entorno de Supabase y, para la verificación de esquema remoto, `SUPABASE_REMOTE_DB_URL`[cite: 10].

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`[cite: 10]. No incluyas claves secretas ni URIs PostgreSQL en Git[cite: 10].

## APIs principales

### Roster de competición

```text
GET /api/competition-roster?competition=152
```

Consulta en Supabase la competición indicada y su temporada dinámica `is_current=true`. Devuelve equipos y jugadores con precio obtenido de los valores de mercado de la primera jornada disponible; si falta precio para un jugador, aplica un fallback de 9M[cite: 10].

### Puntuaciones fantasy

```text
GET /api/fantasy-round-scores?competition=152&season=186
GET /api/fantasy-round-scores?competition=152&season=186&round=1
```

Calcula bajo demanda las puntuaciones usando datos persistidos[cite: 10]. `round` es opcional[cite: 10]. La respuesta incluye `playerId`, `roundNumber`, `score`, `breakdown`, `matchesPlayed` y `scoringVersion`[cite: 10].

### Equipo fantasy y Clasificación

```text
GET /api/fantasy-team?league_id=<uuid-de-liga>
GET /api/league-ranking?league_id=<uuid-de-liga>
```

Devuelve el equipo visible para el usuario y la clasificación privada de la liga[cite: 10].

Para más detalles, consulta `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/SCRAPER.md`, `docs/SCORING.md` y `docs/DEVELOPMENT.md`[cite: 10].

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
npm run test:lockout
npm run test:scoring-persistence
npm run calculate:scores
npm run test:match-parser -- 1 1
npm run show:match-scores -- 1 1
```

## Próximas prioridades

1. Integración end-to-end y despliegue en staging (Fases 11-12).
2. Verificación de permisos e infraestructura en la nube.
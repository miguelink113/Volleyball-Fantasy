# Volleyball Fantasy

Aplicación web de fantasy de voleibol construida con Next.js, TypeScript y Supabase. El repositorio combina la extracción de datos de RFEVB, un dominio tipado, persistencia del catálogo y una interfaz con autenticación, ligas privadas y gestión parcial del equipo fantasy.

> **Estado de esta revisión: 2026-10-22.** El objetivo del plan es un MVP para 2026/27, pero la instantánea documentada del catálogo y varios identificadores de la interfaz siguen correspondiendo a 2025/26. No debe darse por lista la temporada 2026/27 sin actualizar y comprobar esos datos.

## Estado actual

### Catálogo documentado

El último estado escrito en la documentación registra estos conteos para la temporada 2025/26. No se han vuelto a consultar las tablas remotas durante esta revisión, por lo que deben tratarse como cifras registradas previamente, no como una comprobación en tiempo real.

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
- `GET /api/fantasy-round-scores` calcula bajo demanda puntuaciones por jornada a partir de partidos y estadísticas persistidos.
- Dashboard para listar ligas propias y llamar a las operaciones RPC de creación, unión y salida.
- Pantalla fantasy que lee el equipo y el mercado persistidos y llama a la RPC `transfer_player` para comprar o vender jugadores.

### Incompleto o pendiente de confirmar

- La edición/guardado de alineaciones **no está implementada**: `toggleLineup` muestra un aviso y no guarda cambios.
- El cálculo de puntuaciones se devuelve desde la API; no hay en el flujo mostrado persistencia del resultado en `player_match_scores`, `player_round_scores` o `fantasy_scores`, ni clasificación por liga.
- El repositorio de esta instantánea no incluye el contenido de las migraciones SQL. Por ello, la inicialización atómica del equipo al crear/unirse a una liga y las reglas internas de las RPC no se pueden certificar solo a partir de este paquete.
- El comportamiento de las RPC de liga/transferencia necesita pruebas funcionales; la prueba de esquema solo inspecciona estructura, RLS, políticas, restricciones y permisos.
- Parte de la UI está fijada a `competition=152` y `season=186` (2025/26). `GET /api/competition-roster` selecciona, en cambio, la temporada marcada `is_current`. Si esa marca cambia a 2026/27, el mercado mostrado y las puntuaciones solicitadas pueden pertenecer a temporadas distintas.

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

Calcula bajo demanda las puntuaciones usando datos persistidos. `round` es opcional. La respuesta incluye `playerId`, `roundNumber`, `score`, `matchesPlayed` y `scoringVersion`; la ruta actual no devuelve el desglose ni persiste el resultado. **Limitación del código:** no comprueba que `season` pertenezca a `competition`; la temporada se resuelve solo por su ID RFEVB.

### Equipo fantasy

```text
GET /api/fantasy-team?league_id=<uuid-de-liga>
```

Devuelve el equipo visible para el usuario, los jugadores activos y los identificadores de la primera alineación encontrada. No implementa guardado de alineaciones.

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
npm run test:match-parser -- 1 1
npm run show:match-scores -- 1 1
```

`npm run test:supabase:schema` requiere `SUPABASE_REMOTE_DB_URL` y es de solo lectura. Que la prueba de esquema pase no sustituye pruebas funcionales de creación de ligas, transferencias, seguridad o persistencia.

## Próximas prioridades

1. Verificar con las migraciones reales la inicialización de equipos y alineaciones al crear o unirse a una liga.
2. Implementar guardado de alineaciones y su bloqueo temporal.
3. Añadir pruebas funcionales para las RPC y para la persistencia de scoring/clasificación.
4. Eliminar los identificadores de temporada hardcodeados y alinear roster, puntos y ligas con la temporada seleccionada.

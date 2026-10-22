# Arquitectura de Volleyball Fantasy

**Revisión de documentación:** 2026-10-22

## Objetivo

La arquitectura separa la extracción desde RFEVB, la ingesta/normalización, el dominio, la persistencia Supabase y la presentación. Hay dos flujos distintos: endpoints de extracción que consultan RFEVB en directo y endpoints de producto que leen el catálogo ya persistido.

## Visión general

```text
RFEVB -- scraper --> endpoints de extracción / scripts de ingesta
                                  |
                                  v
                     mappers + TeamAliasResolver
                                  |
                                  v
                              Supabase
                                  |
                      +-----------+-----------+
                      |                       |
                repositorios              RPC SQL
                      |                       |
                      v                       v
           APIs de datos persistidos     ligas/transferencias
                      |                       |
                      +-----------+-----------+
                                  v
                               Frontend
```

La estructura actual no es exclusivamente API-first: algunos componentes cliente consultan Supabase directamente con el cliente publicable para leer datos protegidos por RLS y llamar a RPC. Las claves privilegiadas se reservan para código de servidor.

## Capas

### 1. Fuente e ingesta

Ubicación:

```text
lib/scraper/
scripts/ingest/
lib/services/ingestion/
```

`lib/scraper/` descarga e interpreta páginas de RFEVB. Los scripts administrativos persisten los datos con `createAdminClient()`.

La ingesta:

- normaliza los datos extraídos y valida identificadores;
- resuelve alias de equipos entre roster y actas;
- cruza jugadores del acta con el roster dentro del equipo, primero por nombre y después por dorsal;
- escribe las entidades y estadísticas en Supabase mediante upserts;
- registra warnings y omite coincidencias ambiguas o no resueltas en lugar de inventar relaciones.

La ingesta es manual; no hay un planificador incluido en el código empaquetado.

### 2. Persistencia

Supabase contiene las tablas del catálogo deportivo, valores de mercado, ligas privadas, membresías, equipos fantasy, plantillas, alineaciones y resultados. El test de esquema en `scripts/tests/test-supabase-schema.ts` define la estructura esperada de 20 tablas y comprueba, mediante lectura, columnas, algunas restricciones, RLS, políticas y privilegios.

La presencia de una tabla o RPC en el esquema no demuestra por sí sola que el flujo funcional esté completo. En particular, la inicialización de equipo al crear o unirse a una liga requiere verificar la implementación de las migraciones y probar las RPC; el SQL de migraciones no forma parte del archivo de repositorio usado para esta revisión.

### 3. Repositorios de lectura

Ubicación: `lib/repositories/`.

Hay repositorios para equipos, jugadores, jornadas, partidos, estadísticas de jugador por partido y valores de mercado. Devuelven entidades tipadas en camelCase y aíslan las consultas SQL de las rutas de producto.

Las rutas que usan el cliente administrativo son:

- `app/api/competition-roster/route.ts`;
- `app/api/fantasy-round-scores/route.ts`.

### 4. Dominio y servicios

Ubicación: `domain/` y `lib/services/`.

`domain/` declara tipos de competición, temporada, equipo, jugador, partido, jornadas, estadísticas y fantasy. `domain/scoring/scoring-v1.system.ts` implementa `ScoringSystemV1` (`v1`). `lib/services/fantasy/fantasy-team.service.ts` contiene validación de plantilla/alineación y un helper heredado para generar una selección diaria de demo; ese helper no es el origen del roster usado actualmente por `FantasyTeamBuilder`.

### 5. API Next.js y fuente de datos

#### Datos persistidos

| Ruta | Comportamiento actual |
| --- | --- |
| `GET /api/competition-roster?competition=152` | Busca la competición por `rfevb_id`, selecciona su temporada `is_current=true` y devuelve equipos, jugadores y precio de la primera jornada disponible. Usa precio de fallback 9M si no encuentra valor. |
| `GET /api/fantasy-round-scores?competition=152&season=186[&round=1]` | Calcula bajo demanda las puntuaciones desde jornadas, partidos y estadísticas persistidos. `round` es opcional. Devuelve jugador, jornada, puntos, partidos jugados y versión. No persiste los resultados ni devuelve `breakdown`. La implementación no valida que el ID de temporada pertenezca a la competición recibida. |
| `GET /api/fantasy-team?league_id=<uuid>` | Lee el equipo fantasy visible, sus jugadores activos y los jugadores de la primera alineación encontrada. No guarda alineaciones. |

#### Extracción en directo

Estas rutas siguen invocando el scraper y pueden consultar RFEVB en cada petición:

- `/api/matches`;
- `/api/match-statistics`;
- `/api/competition-statistics`.

No debe describirse todo `app/api/` como migrado a Supabase: conviven ambos tipos de ruta.

### 6. Frontend y operaciones fantasy

- `/dashboard` usa `LeagueManager` para leer ligas propias y llamar a las RPC `create_private_league`, `join_private_league` y `leave_private_league`.
- `/fantasy` carga `FantasyTeamBuilder` cuando recibe `league_id`.
- `FantasyTeamBuilder` consulta el roster y el equipo a través de APIs de lectura y llama a `transfer_player` por RPC para comprar/vender jugadores.
- El handler `toggleLineup` es todavía un placeholder que muestra una alerta; no guarda cambios en `lineups` ni `lineup_players`.
- No hay una UI funcional de clasificación privada ni una escritura de resultados de scoring en el flujo visible.

Las reglas críticas de negocio deben estar en las RPC/base de datos y no depender únicamente de validaciones React. La prueba de esquema no valida la ejecución funcional de esas operaciones.

## Flujo de datos de producto

### Roster y mercado

```text
Supabase: competitions/seasons/teams/players/player_market_values
                |
                v
         repositorios de lectura
                |
                v
 /api/competition-roster -> FantasyTeamBuilder
```

El precio está persistido por jugador y jornada, pero la ruta de roster elige los precios de la primera jornada de la temporada marcada como actual; no obtiene el precio para la jornada que el usuario esté viendo.

### Puntuación de jugador

```text
Supabase: rounds/matches/match_player_stats
                |
                v
       repositorios de lectura
                |
                v
      ScoringSystemV1 (v1)
                |
                v
     /api/fantasy-round-scores
                |
                v
              /fantasy
```

La puntuación se calcula al solicitarla. Aunque el esquema incluye tablas para resultados versionados, esta ruta no escribe en ellas. Además, la ruta no valida que la temporada RFEVB recibida pertenezca a la competición indicada; debe corregirse antes de aceptar parámetros combinados como fiables.

### Ligas y transferencias

```text
Dashboard/FantasyTeamBuilder
          |
          v
  cliente Supabase + RPC
          |
          v
funciones SQL y restricciones
```

El código cliente invoca las RPC; el detalle transaccional exacto debe revisarse en las migraciones y probarse en una base de pruebas.

## Identificadores y normalización

Los UUIDs de Supabase identifican internamente las filas. Los ID de RFEVB permanecen como identificadores de origen. `TeamAliasResolver` normaliza los nombres de equipo entre roster y actas.

## Fechas y jornadas

`ingest-matches.ts` deriva jornadas de las fechas reales de los partidos y maneja la conversión de Europe/Madrid a UTC. Las entidades de jornada exponen `startsAt` y `endsAt`, pero la UI actual no guarda alineaciones y por tanto todavía no aplica el bloqueo a ese flujo.

## Temporadas: limitación actual

El objetivo del plan es la temporada 2026/27, pero varios elementos del código están fijados a la Superliga Masculina 2025/26 (`competition=152`, `season=186`, etiquetas `25-26`). En cambio, la ruta del roster selecciona `is_current=true`. Si la base se actualiza a 2026/27 sin eliminar esos literales, la UI puede combinar jugadores/precios de una temporada con puntos de otra. Debe existir una selección de temporada compartida y coherente.

## Estado actual y evolución

Las fases de catálogo, ingesta y lectura de datos están implementadas en gran parte. La gestión de ligas y la compra/venta están conectadas a RPC desde la UI, pero la inicialización del equipo y las garantías de negocio requieren confirmación con el SQL y pruebas funcionales. La edición de alineación sigue sin implementar y el scoring/clasificación no están persistidos en el flujo visible. El detalle de tareas está en `docs/PROJECT_STATUS.md` y `docs/plan.md`.

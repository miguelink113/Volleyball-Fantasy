# Arquitectura de Volleyball Fantasy

## Objetivo

La arquitectura separa la fuente de datos deportivos, la normalización, el dominio, la persistencia y la presentación. Esta separación permite mantener la lógica fantasy independiente del formato de origen de RFEVB y de la estructura SQL de Supabase.

## Visión general

```text
                    RFEVB
                      |
                      v
             Scraper y normalización
                      |
                      v
              Mappers de ingesta
                      |
                      v
                  Supabase
                      |
                      v
             Repositorios de lectura
                      |
                      v
              Entidades de dominio
                      |
             +--------+--------+
             |                 |
             v                 v
          API Next.js     Servicios de scoring
             |                 |
             +--------+--------+
                      |
                      v
                Frontend /fantasy
```

El scraper se utiliza para obtener datos de origen durante los procesos de ingesta. Las rutas de producto migradas leen los datos persistidos a través de los repositorios.

## Capas

### 1. Fuente e ingesta

Ubicación principal:

```text
lib/scraper/
scripts/ingest/
lib/services/ingestion/
```

El scraper extrae equipos, jugadores, partidos, estadísticas y clasificaciones de RFEVB. Los scripts administrativos coordinan la ingesta y persisten los resultados en Supabase.

**Soporte multi-grupo:** Competiciones como la Superliga 2 se dividen en grupos (A, B, C). El scraper analiza el DOM para detectar los grupos y asocia cada jornada y partido a su grupo correspondiente, evitando colisiones de `round_number`.

**Resolución de partidos y jornadas:** La ingesta lee la página oficial de cada partido (`MatchStatistics.aspx`) para extraer la jornada oficial (`officialRound`) y el grupo (`officialGroup`), ignorando el orden del listado general que puede incluir partidos aplazados.

La capa de ingesta:
- Normaliza los datos externos.
- **Resolución de alias (v2):** `TeamAliasResolver` utiliza `resolveJornada` para cruzar los nombres de las actas con el roster. Utiliza containment bidireccional y asignación greedy.
- Cruza los jugadores de las actas con los jugadores del roster.
- Realiza upserts idempotentes.
- Registra warnings cuando no es posible resolver un registro de forma unívoca.

**Normalización de grupos:** DataProject a veces usa el nombre de un patrocinador ("Alcudia", "Egido", "Herce", "Renovak") en la pestaña de la jornada. `normalizeGroupName` en `ingest-matches.ts` detecta estos casos (si el nombre no contiene "Superliga", "Grupo" o "Liga Regular") y reasigna el partido al grupo canónico del equipo según `teams.group_name`. Previene rondas fantasma y duplicados.

**Escudo anti-duplicados:** Antes de insertar un partido, el script comprueba si el equipo local o visitante ya tiene un partido en esa misma jornada. Si es así, el segundo se omite. Esto evita duplicados causados por partidos listados en varias pestañas de DataProject.

**Cache de ingesta:** `ingest-matches.ts` precarga los partidos existentes en BD y qué partidos tienen stats. Al procesar el lote de DataProject, si un partido ya está `COMPLETED` con stats, se marca como `source: "db"` en el cache y no se descarga su HTML. Los partidos que vienen del cache **también registran sus equipos en `teamsInThisRound`** para preservar el escudo anti-duplicados. Reduce la ingesta de ~15 min a ~2 min. Flag `--force-refresh` desactiva el cache.

El cliente administrativo se encuentra en `lib/supabase/admin.server.ts` y debe ejecutarse exclusivamente en el servidor.

### 2. Persistencia

Supabase almacena el catálogo deportivo y los datos necesarios para la lógica fantasy.

Las entidades persistidas incluyen:

- Competiciones y temporadas.
- Equipos y jugadores.
- Jornadas y partidos.
- Estadísticas de jugador por partido.
- Clasificaciones por equipo y temporada (`team_standings`).
- Valores de mercado por jugador y jornada.
- Ligas, membresías y equipos fantasy.
- Plantillas, alineaciones, puntuaciones y transacciones.

El esquema utiliza claves foráneas, restricciones, índices y políticas RLS para mantener la integridad y el aislamiento. Las tablas `teams`, `rounds` y `matches` incluyen `group_name` para segmentar competiciones con grupos. Las tablas `matches` tienen FKs `fk_matches_home_team` y `fk_matches_away_team` que habilitan JOINs nativos de PostgREST.

**Nota de paginación:** Supabase devuelve máximo 1000 filas por query por defecto. Los scripts que necesitan leer más (por ejemplo, `calculate-market-values.ts`) usan `.range()` con paginación explícita.

Las mutaciones sensibles deben validarse en backend y base de datos. La interfaz no constituye una frontera de seguridad.

### 3. Repositorios de lectura

Ubicación:

```text
lib/repositories/
```

Los repositorios aíslan las consultas a Supabase y devuelven entidades tipadas del dominio.

La capa incluye repositorios para:

- Equipos.
- Jugadores.
- Jornadas.
- Partidos.
- Estadísticas de jugador por partido.
- Clasificaciones (`standings`).
- Valores de mercado.

Los repositorios convierten los registros de persistencia a entidades de dominio con propiedades camelCase. Las capas superiores no necesitan depender directamente de los nombres de columnas SQL ni de los DTO del scraper.

### 4. Dominio y servicios

Ubicación principal:

```text
domain/
lib/services/
```

El dominio define los contratos y las reglas de negocio independientes de la presentación y de la fuente de datos.

Incluye:

- Competición y temporada.
- Equipo y jugador.
- Jornada y partido.
- Estadísticas de jugador.
- Clasificación real de equipos.
- Mercado fantasy.
- Plantilla y alineación.
- Sistema de puntuación.

`ScoringSystemV1` calcula los puntos a partir de las estadísticas disponibles. La versión del sistema de puntuación forma parte del diseño para permitir reproducir y conservar los resultados históricos.

**Cálculo de valores de mercado:** El script `calculate-market-values.ts` recalcula los precios de todos los jugadores tras cada ingesta. Fórmula: `1 + (puntos_totales * 0.07) + min(media_por_partido * 0.3, 5)`, con piso 1M y techo 20M. Se escribe en `player_market_values` para la última jornada con stats. La API `/api/competition-roster` lee de la última jornada con precios (agregando precios de todos los grupos de esa jornada).

### 5. API de Next.js

Las rutas HTTP coordinan el acceso a datos y los servicios de aplicación.

#### Roster de competición

```text
GET /api/competition-roster?competition=152
```

Consulta el catálogo persistido a través de los repositorios y devuelve los equipos y jugadores con su precio de la última jornada con precios calculados.

#### Clasificaciones de competición

```text
GET /api/standings?seasonId=<uuid>
```

Consulta la tabla `team_standings` y devuelve la clasificación real de los equipos, segmentada por grupo.

#### Puntuaciones de jornadas

```text
GET /api/fantasy-round-scores
```

Consulta las estadísticas persistidas y calcula las puntuaciones de todas las jornadas utilizando `ScoringSystemV1`. Si se le pasa `playerId`, devuelve el historial completo de ese jugador. Si no se le pasa `round`, suma los puntos totales de la temporada.

### 6. Frontend

La página principal del flujo fantasy es `/fantasy`.

La interfaz utiliza pestañas y es 100% dinámica. Lee exclusivamente las temporadas activas (`is_current = true`).

**Manejo de grupos en UI:** Aunque en la base de datos existen 3 jornadas 1 (Grupos A, B, C), el frontend agrupa las jornadas por `round_number` mediante un `Map`.

**Mercado Rotativo:** El frontend calcula un mercado diario de 14 jugadores usando `createDailyFantasyRoster` del servicio. Cambia cada día y es determinista dentro del mismo día.

**Alineaciones:** El usuario edita la alineación una vez y el sistema la guarda en todas las jornadas futuras no bloqueadas mediante la RPC `save_lineup` (guardado masivo con `Promise.all`). Si no hay jornadas futuras, el frontend guarda un borrador en `localStorage` con la clave `draft_lineup_<teamId>`. La UI muestra feedback visual claro: botón verde "¡Guardado!" si se persiste en BD, botón ámbar "Borrador guardado" si se guarda localmente.

## Flujo de datos de producto

### Lectura del roster

```text
Supabase → Repositorio de equipos/jugadores → Entidades → /api/competition-roster → Frontend
```

### Cálculo de puntuaciones

```text
Supabase → Repositorio de partidos/stats → ScoringSystemV1 → /api/fantasy-round-scores → Frontend
```

### Lectura del mercado

```text
Supabase: player_market_values → Repositorio → Entidad → Frontend: precio del jugador
```

## Identificadores y normalización

Los UUIDs de Supabase son los identificadores internos. Los identificadores de RFEVB se conservan como referencias externas para trazabilidad.

Los nombres de los equipos pueden variar entre rosters y actas. `TeamAliasResolver` normaliza y resuelve estas diferencias antes de persistir.

## Fechas y jornadas

Las fechas de las jornadas se derivan de las fechas reales de los partidos.

Los límites temporales se calculan en la zona Europe/Madrid y se convierten a UTC.

Las entidades de jornada exponen `startsAt` y `endsAt`. El bloqueo de alineaciones y transferencias es estricto en el backend: las RPCs se bloquean instantáneamente si `now() >= starts_at`.

**Jornadas futuras no publicadas:** DataProject publica el calendario de cada jornada de forma progresiva. Cuando una jornada aún no existe en la BD, el frontend la trata como "no programada": bloquea fichajes y guarda la alineación como borrador local. Decisión de diseño: no se inventan fechas falsas para evitar ensuciar la BD con datos incorrectos.

## Automatización

### GitHub Actions (Fase 13)

El workflow `.github/workflows/daily-ingest.yml` se ejecuta diariamente a las 06:00 Europe/Madrid (cron `0 6 * * *`) o manualmente vía `workflow_dispatch`.

Flujo:
1. `check:new-matches` — 4 HTTP calls a DataProject para detectar partidos nuevos.
2. Si `has_new=true`: ingesta de 4 competiciones + standings.
3. `calculate:scores` (siempre, idempotente).
4. `calculate:market` (siempre, idempotente).

**Por qué GitHub Actions y no Vercel Cron:** la ingesta de 4 competiciones puede tardar 15-20 min, superando el timeout de las funciones serverless de Vercel (10s-300s). Los runners de GitHub tienen 6 horas de margen.

**Node 22 en el runner:** requerido por `@supabase/supabase-js` 2.119+ (WebSocket nativo).

## Seguridad

- Las claves secretas de Supabase permanecen en el servidor.
- El cliente administrativo no debe importarse desde código ejecutado en el navegador.
- RLS y las políticas de base de datos controlan el acceso a los datos.
- Las mutaciones sensibles deben validarse en servidor y base de datos.
- Las ligas y sus datos deben permanecer aislados por membresía, competición y temporada.

## Estado actual y evolución

Las fases 1 a 11 están completadas y verificadas:
- El catálogo deportivo está persistido y los repositorios de lectura implementados.
- El mercado inicial está sembrado y la UI consume precios dinámicos.
- Las ligas, el mercado de fichajes y las alineaciones están implementados mediante RPC, con validación de límites y bloqueos temporales.
- El scoring se calcula y se persiste en las tablas históricas.
- La clasificación privada y los puntos por jornada se leen de forma rápida desde la base de datos.
- La UI (Login, Dashboard, Fantasy) ha sido refactorizada.
- La aplicación está desplegada en producción (Vercel).
- La ingesta y visualización de clasificaciones oficiales está implementada.

Fase 12 completada:
- Navegación global (Sidebar/Dashboard) y vista de resultados (`/results`) con partidos y clasificación agrupados por grupo.
- Mercado diario rotativo de 14 jugadores (2/2/4/4/2).
- Modal de estadísticas por jugador (`PlayerStatsModal`) con desglose fantasy y stats reales por jornada.
- Gestión masiva de alineaciones con borrador local cuando no hay jornadas futuras.
- Limpieza profunda de la BD con re-ingesta completa (266 partidos limpios, sin rondas fantasma).
- Mercado dinámico con fórmula basada en rendimiento (`1 + pts*0.07 + min(media*0.3, 5)`, piso 1M, techo 20M).
- Ingesta blindada: `normalizeGroupName` + escudo anti-duplicados + cache de partidos.

Fase 13 completada:
- Workflow `.github/workflows/daily-ingest.yml` con Node 22.
- Ejecución diaria: check → ingest → scores → market.
- `check:new-matches` y `calculate:market` implementados.
- Fix de `--env-file=.env.local` en CI (no existe en el runner).
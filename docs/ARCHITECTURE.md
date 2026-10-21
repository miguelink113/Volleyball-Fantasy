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

El scraper extrae equipos, jugadores, partidos y estadísticas de RFEVB. Los scripts administrativos coordinan la ingesta y persisten los resultados en Supabase.

La capa de ingesta:

- Normaliza los datos externos.
- Valida identificadores y relaciones.
- Resuelve las discrepancias de nombres de equipos.
- Cruza los jugadores de las actas con los jugadores del roster.
- Realiza upserts idempotentes.
- Registra warnings cuando no es posible resolver un registro de forma unívoca.

El cliente administrativo se encuentra en `lib/supabase/admin.server.ts` y debe ejecutarse exclusivamente en el servidor.

### 2. Persistencia

Supabase almacena el catálogo deportivo y los datos necesarios para la lógica fantasy.

Las entidades persistidas incluyen:

- Competiciones y temporadas.
- Equipos y jugadores.
- Jornadas y partidos.
- Estadísticas de jugador por partido.
- Valores de mercado por jugador y jornada.
- Ligas, membresías y equipos fantasy.
- Plantillas, alineaciones, puntuaciones y transacciones.

El esquema utiliza claves foráneas, restricciones, índices y políticas RLS para mantener la integridad y el aislamiento de los datos.

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
- Valores de mercado.

Los repositorios convierten los registros de persistencia a entidades de dominio con propiedades camelCase. Las capas superiores no necesitan depender directamente de los nombres de columnas SQL ni de los DTO del scraper.

Las consultas deben respetar el ámbito de competición y temporada y manejar los errores de persistencia de forma explícita.

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
- Mercado fantasy.
- Plantilla y alineación.
- Sistema de puntuación.

`ScoringSystemV1` calcula los puntos a partir de las estadísticas disponibles. La versión del sistema de puntuación forma parte del diseño para permitir reproducir y conservar los resultados históricos cuando se incorpore la persistencia de puntuaciones.

### 5. API de Next.js

Las rutas HTTP coordinan el acceso a datos y los servicios de aplicación.

#### Roster de competición

```text
GET /api/competition-roster?competition=152
```

Consulta el catálogo persistido a través de los repositorios y devuelve los equipos y jugadores de la competición solicitada.

#### Puntuaciones de jornadas

```text
GET /api/fantasy-round-scores
```

Consulta las estadísticas persistidas y calcula las puntuaciones de todas las jornadas utilizando `ScoringSystemV1`. El frontend recibe los resultados en una sola petición.

Las rutas migradas no dependen de lecturas en vivo de RFEVB. Los datos externos se incorporan a través de los procesos de ingesta.

### 6. Frontend

La página principal del flujo fantasy es:

```text
/fantasy
```

La interfaz utiliza los UUIDs de Supabase para identificar equipos y jugadores. Los valores de mercado mostrados proceden de `player_market_values`.

Las puntuaciones de todas las jornadas se cargan en una sola petición para reducir las solicitudes sucesivas y evitar parpadeos durante la actualización de la interfaz.

La persistencia de las operaciones de ligas, equipos, plantillas y alineaciones se completará progresivamente en las siguientes fases.

## Flujo de datos de producto

### Lectura del roster

```text
Supabase
   |
   v
Repositorio de equipos y jugadores
   |
   v
Entidades de dominio
   |
   v
/api/competition-roster
   |
   v
Frontend
```

### Cálculo de puntuaciones

```text
Supabase
   |
   v
Repositorio de partidos y estadísticas
   |
   v
Estadísticas normalizadas
   |
   v
ScoringSystemV1
   |
   v
/api/fantasy-round-scores
   |
   v
Frontend: puntuaciones de todas las jornadas
```

### Lectura del mercado

```text
Supabase: player_market_values
   |
   v
Repositorio de valores de mercado
   |
   v
Entidad de dominio
   |
   v
Frontend: precio del jugador
```

Los valores iniciales del mercado son de 9M para todos los jugadores en todas las jornadas.

## Identificadores y normalización

Los UUIDs de Supabase son los identificadores internos que relacionan las entidades del sistema. Los identificadores de RFEVB se conservan como referencias externas para la ingesta y la trazabilidad.

Los nombres de los equipos pueden variar entre los rosters y las actas de partido. `TeamAliasResolver` normaliza y resuelve estas diferencias antes de persistir las relaciones.

Para cruzar jugadores de actas con el roster, el proceso utiliza primero el nombre dentro del equipo y el dorsal como alternativa. Los registros ambiguos o no resueltos deben generar warnings en lugar de producir asignaciones incorrectas.

## Fechas y jornadas

Las fechas de las jornadas se derivan de las fechas reales de los partidos.

Los límites temporales se calculan en la zona Europe/Madrid y se convierten a UTC, teniendo en cuenta los cambios de horario de verano.

Las entidades de jornada exponen `startsAt` y `endsAt`. Estos límites se utilizarán para validar el bloqueo de alineaciones y transferencias durante una jornada.

## Seguridad

- Las claves secretas de Supabase permanecen en el servidor.
- El cliente administrativo no debe importarse desde código ejecutado en el navegador.
- RLS y las políticas de base de datos controlan el acceso a los datos.
- Las mutaciones sensibles deben validarse en servidor y base de datos.
- Las ligas y sus datos deben permanecer aislados por membresía, competición y temporada.
- Las pruebas del esquema remoto son de solo lectura y no sustituyen las pruebas funcionales de las mutaciones.

## Estado actual y evolución

La Fase 5 está completada: el catálogo deportivo está persistido, el mercado inicial está sembrado, los repositorios de lectura están implementados y las rutas de producto incluidas en el alcance utilizan Supabase.

La siguiente fase es la **Fase 6 — Ligas y equipos fantasy**, centrada en conectar las operaciones de ligas y en crear equipos fantasy persistentes con presupuesto y alineación inicial.

Las fases posteriores completarán el mercado y las transferencias, el bloqueo de alineaciones, la persistencia del scoring, la clasificación privada y la integración end-to-end.
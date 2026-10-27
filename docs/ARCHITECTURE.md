# Arquitectura de Volleyball Fantasy

## Objetivo

La arquitectura separa la fuente de datos deportivos, la normalización, el dominio, la persistencia y la presentación[cite: 1]. Esta separación permite mantener la lógica fantasy independiente del formato de origen de RFEVB y de la estructura SQL de Supabase[cite: 1].

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

El scraper se utiliza para obtener datos de origen durante los procesos de ingesta[cite: 1]. Las rutas de producto migradas leen los datos persistidos a través de los repositorios[cite: 1].

## Capas

### 1. Fuente e ingesta

Ubicación principal:

```text
lib/scraper/
scripts/ingest/
lib/services/ingestion/
```

El scraper extrae equipos, jugadores, partidos y estadísticas de RFEVB[cite: 1]. Los scripts administrativos coordinan la ingesta y persisten los resultados en Supabase[cite: 1].

La capa de ingesta:

- Normaliza los datos externos[cite: 1].
- Valida identificadores y relaciones[cite: 1].
- Resuelve las discrepancias de nombres de equipos[cite: 1].
- Cruza los jugadores de las actas con los jugadores del roster[cite: 1].
- Realiza upserts idempotentes[cite: 1].
- Registra warnings cuando no es posible resolver un registro de forma unívoca[cite: 1].

El cliente administrativo se encuentra en `lib/supabase/admin.server.ts` y debe ejecutarse exclusivamente en el servidor[cite: 1].

### 2. Persistencia

Supabase almacena el catálogo deportivo y los datos necesarios para la lógica fantasy[cite: 1].

Las entidades persistidas incluyen:

- Competiciones y temporadas[cite: 1].
- Equipos y jugadores[cite: 1].
- Jornadas y partidos[cite: 1].
- Estadísticas de jugador por partido[cite: 1].
- Valores de mercado por jugador y jornada[cite: 1].
- Ligas, membresías y equipos fantasy[cite: 1].
- Plantillas, alineaciones, puntuaciones y transacciones[cite: 1].

El esquema utiliza claves foráneas, restricciones, índices y políticas RLS para mantener la integridad y el aislamiento de los datos[cite: 1].

Las mutaciones sensibles deben validarse en backend y base de datos[cite: 1]. La interfaz no constituye una frontera de seguridad[cite: 1].

### 3. Repositorios de lectura

Ubicación:

```text
lib/repositories/
```

Los repositorios aíslan las consultas a Supabase y devuelven entidades tipadas del dominio[cite: 1].

La capa incluye repositorios para:

- Equipos[cite: 1].
- Jugadores[cite: 1].
- Jornadas[cite: 1].
- Partidos[cite: 1].
- Estadísticas de jugador por partido[cite: 1].
- Valores de mercado[cite: 1].

Los repositorios convierten los registros de persistencia a entidades de dominio con propiedades camelCase[cite: 1]. Las capas superiores no necesitan depender directamente de los nombres de columnas SQL ni de los DTO del scraper[cite: 1].

Las consultas deben respetar el ámbito de competición y temporada y manejar los errores de persistencia de forma explícita[cite: 1].

### 4. Dominio y servicios

Ubicación principal:

```text
domain/
lib/services/
```

El dominio define los contratos y las reglas de negocio independientes de la presentación y de la fuente de datos[cite: 1].

Incluye:

- Competición y temporada[cite: 1].
- Equipo y jugador[cite: 1].
- Jornada y partido[cite: 1].
- Estadísticas de jugador[cite: 1].
- Mercado fantasy[cite: 1].
- Plantilla y alineación[cite: 1].
- Sistema de puntuación[cite: 1].

`ScoringSystemV1` calcula los puntos a partir de las estadísticas disponibles[cite: 1]. La versión del sistema de puntuación forma parte del diseño para permitir reproducir y conservar los resultados históricos cuando se incorpore la persistencia de puntuaciones[cite: 1].

### 5. API de Next.js

Las rutas HTTP coordinan el acceso a datos y los servicios de aplicación[cite: 1].

#### Roster de competición

```text
GET /api/competition-roster?competition=152
```

Consulta el catálogo persistido a través de los repositorios y devuelve los equipos y jugadores de la competición solicitada[cite: 1].

#### Puntuaciones de jornadas

```text
GET /api/fantasy-round-scores
```

Consulta las estadísticas persistidas y calcula las puntuaciones de todas las jornadas utilizando `ScoringSystemV1`[cite: 1]. El frontend recibe los resultados en una sola petición[cite: 1].

Las rutas migradas no dependen de lecturas en vivo de RFEVB[cite: 1]. Los datos externos se incorporan a través de los procesos de ingesta[cite: 1].

### 6. Frontend

La página principal del flujo fantasy es:

```text
/fantasy
```

La interfaz utiliza pestañas y es 100% dinámica. Lee exclusivamente las temporadas activas (`is_current = true`), identificando los UUIDs de Supabase correspondientes para la gestión de equipos y jugadores. Los valores de mercado mostrados proceden de `player_market_values`[cite: 1].

Las puntuaciones de todas las jornadas se cargan en una sola petición para reducir las solicitudes sucesivas y evitar parpadeos durante la actualización de la interfaz[cite: 1].

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

Los valores iniciales del mercado son de 9M para todos los jugadores en todas las jornadas[cite: 1].

## Identificadores y normalización

Los UUIDs de Supabase son los identificadores internos que relacionan las entidades del sistema[cite: 1]. Los identificadores de RFEVB se conservan como referencias externas para la ingesta y la trazabilidad[cite: 1].

Los nombres de los equipos pueden variar entre los rosters y las actas de partido[cite: 1]. `TeamAliasResolver` normaliza y resuelve estas diferencias antes de persistir las relaciones[cite: 1].

Para cruzar jugadores de actas con el roster, el proceso utiliza primero el nombre dentro del equipo y el dorsal como alternativa[cite: 1]. Los registros ambiguos o no resueltos deben generar warnings en lugar de producir asignaciones incorrectas[cite: 1].

## Fechas y jornadas

Las fechas de las jornadas se derivan de las fechas reales de los partidos[cite: 1].

Los límites temporales se calculan en la zona Europe/Madrid y se convierten a UTC, teniendo en cuenta los cambios de horario de verano[cite: 1].

Las entidades de jornada exponen `startsAt` y `endsAt`[cite: 1]. El bloqueo de alineaciones y transferencias es estricto en el backend: las operaciones (RPC) se bloquean instantáneamente si `now() >= starts_at`, independientemente del estado de la UI.

## Seguridad

- Las claves secretas de Supabase permanecen en el servidor[cite: 1].
- El cliente administrativo no debe importarse desde código ejecutado en el navegador[cite: 1].
- RLS y las políticas de base de datos controlan el acceso a los datos[cite: 1].
- Las mutaciones sensibles deben validarse en servidor y base de datos[cite: 1].
- Las ligas y sus datos deben permanecer aislados por membresía, competición y temporada[cite: 1].
- Las pruebas del esquema remoto son de solo lectura y no sustituyen las pruebas funcionales de las mutaciones[cite: 1].

## Estado actual y evolución

Las fases 1 a 10 están completadas y verificadas:
- El catálogo deportivo está persistido y los repositorios de lectura implementados[cite: 1].
- El mercado inicial está sembrado y la UI consume precios dinámicos[cite: 1].
- Las ligas, el mercado de fichajes y las alineaciones están implementados mediante RPC, con validación de límites y bloqueos temporales[cite: 1].
- El scoring se calcula y se persiste en las tablas históricas[cite: 1].
- La clasificación privada y los puntos por jornada se leen de forma rápida desde la base de datos[cite: 1].
- La UI (Login, Dashboard, Fantasy) ha sido refactorizada para operar 100% de forma dinámica y manejar correctamentes los estados y bloqueos.
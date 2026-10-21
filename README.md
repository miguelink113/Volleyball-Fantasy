# Volleyball Fantasy

Aplicación web de fantasy de voleibol construida con Next.js, TypeScript y Supabase. Integra la extracción de datos deportivos de RFEVB, un dominio tipado para la lógica fantasy y una capa de persistencia que sirve el catálogo deportivo y las estadísticas desde Supabase.

## Estado actual

La Fase 5 — Catálogo persistente — está completada. La aplicación dispone de datos persistidos para las cuatro competiciones de la temporada 2025/26 y utiliza repositorios de lectura para acceder a ellos.

### Datos persistidos

| Entidad | Registros |
| --- | ---: |
| Equipos | 94 |
| Jugadores | 1.449 |
| Partidos | 1.045 |
| Estadísticas de jugador | 25.262 |

Las cuatro competiciones incluidas son:

- Superliga Masculina.
- Superliga Femenina.
- Superliga 2 Masculina.
- Superliga 2 Femenina.

La tabla `player_market_values` está sembrada con un valor inicial de 9M para todos los jugadores en todas las jornadas.

### Arquitectura actual

- **Ingesta:** scripts administrativos que extraen y normalizan los datos de RFEVB y los persisten en Supabase.
- **Dominio:** contratos tipados para competiciones, temporadas, equipos, jugadores, jornadas, partidos, estadísticas, mercado y puntuación.
- **Repositorios:** capa `lib/repositories/` que encapsula las consultas a Supabase y devuelve entidades de dominio en camelCase.
- **Servicios:** lógica de aplicación, mapeo de datos y cálculo de puntuaciones.
- **API:** rutas HTTP de Next.js que consumen los repositorios y exponen datos normalizados.
- **Frontend:** `/fantasy` utiliza los UUIDs de Supabase, los valores reales del mercado y las puntuaciones calculadas para todas las jornadas en una sola petición.
- **Autenticación:** Supabase Auth con email y contraseña.

La extracción desde RFEVB se mantiene como mecanismo de ingesta. Las rutas de producto migradas consumen los datos persistidos, evitando depender de consultas en vivo a la fuente externa.

## Inicio rápido

### Requisitos

- Node.js compatible con Next.js 16.
- npm.
- Variables de entorno de Supabase para autenticación y acceso a datos.
- `SUPABASE_REMOTE_DB_URL` para ejecutar la verificación del esquema remoto.

Instala las dependencias e inicia el servidor:

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## APIs principales

### Roster de una competición

```text
GET /api/competition-roster?competition=152
```

Devuelve equipos y jugadores de la competición a partir de los datos persistidos en Supabase. Las entidades utilizan los identificadores internos de la base de datos y conservan `rfevbId` como identificador de origen cuando corresponde.

### Puntuaciones fantasy por jornada

```text
GET /api/fantasy-round-scores
```

La ruta calcula las puntuaciones de todas las jornadas utilizando las estadísticas persistidas y `ScoringSystemV1`. Consulta los datos mediante los repositorios y evita que el frontend tenga que solicitar las puntuaciones jornada por jornada.

Consulta `docs/SCRAPER.md` para conocer las rutas adicionales y las herramientas de extracción.

## Estructura del proyecto

```text
app/                    Páginas y rutas HTTP de Next.js
components/             Componentes de presentación
domain/                 Contratos y tipos del dominio
hooks/                  Estado interactivo del cliente
lib/
  repositories/         Lecturas tipadas desde Supabase
  scraper/              Extracción y normalización de RFEVB
  services/              Lógica de aplicación e ingesta
  supabase/              Clientes, sesión y acceso a Supabase
scripts/
  ingest/                Scripts administrativos de ingesta
docs/                   Documentación del proyecto
supabase/
  migrations/            Migraciones SQL
```

## Documentación

- [Estado del proyecto](docs/PROJECT_STATUS.md)
- [Desarrollo local](docs/DEVELOPMENT.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Scraper y endpoints](docs/SCRAPER.md)
- [Sistema de puntuación](docs/SCORING.md)
- [Autenticación](docs/AUTHENTICATION.md)
- [Plan de evolución](docs/plan.md)

## Comandos de desarrollo y validación

```bash
npm run dev
npm run build
npm run start
npm run test:domain
npm run test:match-parser -- 1 1
npm run test:supabase
npm run test:supabase:schema
npm run show:match-scores -- 1 1
```

Otros tests disponibles incluyen los de mappers de ingesta, cliente administrativo y repositorios. Consulta los scripts de `package.json` para verificar los nombres y argumentos disponibles en la versión local.

`npm run test:supabase:schema` compara el esquema remoto con el modelo esperado. Comprueba tablas, columnas, restricciones, índices, RLS, políticas y permisos RPC mediante consultas de solo lectura. Requiere `SUPABASE_REMOTE_DB_URL` y no aplica migraciones.

## Próximo hito

La Fase 6 se centra en **ligas y equipos fantasy**: conectar la creación y unión a ligas con las operaciones persistentes, inicializar los equipos de los participantes y validar sus presupuestos y alineaciones iniciales.
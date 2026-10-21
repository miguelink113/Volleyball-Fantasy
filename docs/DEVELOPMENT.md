# Desarrollo local

## Requisitos

- Node.js compatible con Next.js 16.
- npm.
- Proyecto Supabase configurado.
- Variables de entorno para los clientes de Supabase.
- `SUPABASE_REMOTE_DB_URL` para las pruebas de verificación del esquema remoto.

## Instalación

Instala las dependencias:

```bash
npm install
```

Configura las variables de entorno locales según la configuración de Supabase del proyecto. No incluyas claves secretas en el código del cliente ni en archivos versionados.

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Arquitectura de desarrollo

El flujo de datos deportivos está dividido en cuatro capas principales:

1. **Ingesta:** extracción y normalización desde RFEVB mediante scripts administrativos.
2. **Persistencia:** almacenamiento del catálogo deportivo, jornadas, partidos, estadísticas y valores de mercado en Supabase.
3. **Repositorios y servicios:** consultas tipadas, conversión a entidades del dominio y cálculo de puntuaciones.
4. **API y frontend:** rutas HTTP de Next.js y páginas que consumen datos normalizados.

La ingesta desde RFEVB y la lectura de producto son operaciones separadas. Las rutas migradas consultan Supabase a través de `lib/repositories/`.

## Estructura relevante

```text
app/
  api/                    Rutas HTTP
  fantasy/                Interfaz fantasy
components/               Componentes de presentación
domain/                   Tipos y contratos del dominio
hooks/                    Estado interactivo del cliente
lib/
  repositories/           Lecturas tipadas de Supabase
  scraper/                Scraper y normalización de RFEVB
  services/               Servicios y lógica de aplicación
    ingestion/             Mappers y procesos de ingesta
  supabase/                Clientes y sesión de Supabase
scripts/
  ingest/                  Scripts administrativos
docs/                      Documentación
supabase/
  migrations/               Migraciones SQL
```

## Ingesta de datos

Los scripts de ingesta se ejecutan administrativamente y utilizan el cliente server-only de Supabase cuando necesitan permisos elevados.

### Ingesta del roster

Ejecuta los scripts con los identificadores de competición y temporada correspondientes:

```bash
npx tsx scripts/ingest/ingest-roster.ts \
  --competition=152 \
  --season=186 \
  --season-name="2025/26"

npx tsx scripts/ingest/ingest-roster.ts \
  --competition=151 \
  --season=185 \
  --season-name="2025/26"

npx tsx scripts/ingest/ingest-roster.ts \
  --competition=153 \
  --season=187 \
  --season-name="2025/26"

npx tsx scripts/ingest/ingest-roster.ts \
  --competition=150 \
  --season=183 \
  --season-name="2025/26"
```

### Ingesta de partidos y estadísticas

El proceso de partidos utiliza:

```text
scripts/ingest/ingest-matches.ts
```

El proceso ingiere jornadas, partidos y estadísticas de jugador de forma idempotente. Las fechas de jornada se calculan a partir de las fechas reales de los partidos y se convierten de Europe/Madrid a UTC.

Los jugadores de las actas se cruzan con el roster por nombre dentro del equipo y, cuando hace falta, por dorsal. Las coincidencias ambiguas o no resueltas deben revisarse mediante los diagnósticos y warnings del proceso.

### Valores iniciales del mercado

La tabla `player_market_values` está sembrada con valores de 9M para todos los jugadores en todas las jornadas. La interfaz obtiene los precios a través de los repositorios de lectura.

Antes de repetir cualquier operación de sembrado, comprueba la implementación del script correspondiente y sus claves de conflicto para preservar la idempotencia.

## APIs de producto

### Roster de competición

```text
GET /api/competition-roster?competition=152
```

La ruta devuelve el roster desde Supabase mediante los repositorios. Los UUIDs de la base de datos son los identificadores internos utilizados por la aplicación; `rfevbId` se conserva como identificador de origen cuando corresponde.

### Puntuaciones por jornada

```text
GET /api/fantasy-round-scores
```

La ruta utiliza estadísticas persistidas y `ScoringSystemV1` para calcular las puntuaciones de todas las jornadas en una sola petición.

La interfaz `/fantasy` consume esta respuesta sin tener que cargar las puntuaciones jornada por jornada.

Consulta `docs/SCRAPER.md` para la documentación completa de los endpoints y las herramientas de diagnóstico.

## Tests y validación

Ejecuta los tests relevantes antes de realizar un commit:

```bash
npm run test:domain
npm run test:supabase
npm run test:supabase:schema
npm run build
```

Los tests específicos de mappers, repositorios y scripts de ingesta deben ejecutarse según los cambios realizados. Comprueba los scripts disponibles en `package.json` antes de utilizar comandos adicionales.

### Verificación del esquema remoto

`npm run test:supabase:schema` requiere `SUPABASE_REMOTE_DB_URL`.

El test comprueba el esquema remoto esperado, incluidas tablas, columnas, tipos, restricciones, índices, RLS, políticas y permisos RPC. Es de solo lectura y no aplica migraciones.

No utilices `db reset` ni pruebas destructivas contra la base de datos de producción.

### Verificación de repositorios

Los repositorios deben:

- Mantener las consultas a Supabase encapsuladas en `lib/repositories/`.
- Devolver entidades del dominio con propiedades camelCase.
- Mantener el aislamiento por competición y temporada cuando corresponda.
- Manejar errores de lectura sin ocultarlos.
- Contar con tests de integración para verificar el acceso a los datos persistidos.

## Buenas prácticas

- Mantén los DTO de RFEVB separados de las entidades de dominio.
- No utilices los identificadores externos de RFEVB como sustitutos de los UUIDs internos.
- Mantén el cliente administrativo fuera del bundle del navegador.
- No expongas claves secretas ni credenciales PostgreSQL.
- Valida en backend y base de datos las operaciones que modifican el estado fantasy.
- Actualiza la documentación al cerrar una fase.
- Ejecuta los tests pertinentes y el build antes de hacer commit.

## Próximo hito

La Fase 6 se centra en ligas y equipos fantasy persistentes. El objetivo es conectar la creación y unión a ligas con la inicialización del equipo, su presupuesto y una alineación inicial válida.
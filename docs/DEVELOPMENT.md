# Desarrollo local

**Revisión de documentación:** 2026-11-09

## Requisitos

- Node.js **22+** (`@supabase/supabase-js` requiere WebSocket nativo).
- Proyecto Supabase configurado y variables de entorno locales.
- `SUPABASE_REMOTE_DB_URL` solo si se ejecuta la prueba de esquema remoto.

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. No versionar secretos ni la URI PostgreSQL. `lib/supabase/admin.server.ts` requiere `SUPABASE_SECRET_KEY` y solo debe ejecutarse en servidor.

## Flujo de desarrollo

1. **Extracción:** `lib/scraper/` consulta RFEVB.
2. **Ingesta:** scripts de `scripts/ingest/` persisten el roster, partidos, estadísticas, clasificaciones y valores de mercado.
3. **Cálculo de puntos:** `npm run calculate:scores` procesa dinámicamente todas las temporadas activas.
4. **Cálculo de mercado:** `npm run calculate:market` recalcula los precios de los jugadores.
5. **Lectura de producto:** los repositorios encapsulan consultas de Supabase.
6. **Aplicación:** las APIs de datos persistidos exponen roster, scoring, ranking y clasificaciones.

## Estrategia de Ramas y Despliegue (Vercel)

- **`main`**: Rama de producción. Cualquier push o merge dispara un despliegue automático.
- **`feature/nombre`**: Ramas de desarrollo. Cada push genera una **Preview URL** en Vercel.
- **Variables de Entorno en Vercel**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `CRON_SECRET`.

## CI/CD

- **GitHub Actions**: `.github/workflows/daily-ingest.yml` se ejecuta diariamente a las 06:00 (Europe/Madrid).
- **Flujo**: check → ingest matches → ingest standings → calculate scores → calculate market.
- **Node 22** en el runner (requerido por Supabase WebSocket).
- **Secrets de GitHub**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`. Los antiguos `CRON_SECRET` y `APP_URL` ya no se usan (el workflow ejecuta los scripts directamente, sin curl al endpoint de Vercel).

## Estructura relevante

```text
app/
  (app)/                   Rutas protegidas con Sidebar (dashboard, fantasy, results)
  api/                     Rutas de extracción y de producto
components/
  dashboard/               Operaciones de ligas
  fantasy/                 Gestor fantasy y PlayerStatsModal
  results/                 Componentes de resultados y standings
  auth/                    Componentes de autenticación
domain/                    Contratos de dominio y scoring
lib/
  repositories/            Lecturas tipadas de Supabase
  scraper/                 Extracción RFEVB
  services/                Servicios de fantasy, perfil e ingesta
  supabase/                Clientes de Supabase
  utils/                   Helpers puros (ej. round-label.ts)
scripts/
  ingest/                  Ingestas administrativas
  tests/                   Scripts de pruebas
  tools/                   Herramientas de diagnóstico
docs/                      Documentación
supabase/migrations/       Migraciones SQL
```

## Ingesta

Los comandos siguientes son ejemplos dinámicos (sustituye los IDs por la temporada correspondiente).

### Roster

```bash
npx tsx scripts/ingest/ingest-roster.ts --competition=167 --season=203 --season-name="2026/27" --competition-name="Superliga 2 Masculina"
```

*(Nota: El parámetro `--competition-name` actualiza el nombre de la competición y desmarca temporadas antiguas).*

### Partidos y estadísticas

```bash
npx tsx scripts/ingest/ingest-matches.ts --competition=167 --season=203
```

*(Nota: Este script usa cache de partidos completados para evitar descargas redundantes. Incluye escudo anti-duplicados y normaliza nombres de grupos. Añade `--force-refresh` para ignorar el cache).*

### Valores iniciales del mercado

```bash
npx tsx scripts/ingest/ingest-market-values.ts --competition=167 --season=203 --price=10
```

### Clasificaciones reales

```bash
npx tsx --env-file=.env.local scripts/ingest/ingest-standings.ts <competition_id> <season_id> 167 203
```

### Cálculo y persistencia de puntuaciones

```bash
npm run calculate:scores
```

### Cálculo de valores de mercado dinámicos

```bash
npm run calculate:market
```

### Check de partidos nuevos (para CI)

```bash
npm run check:new-matches
```

Genera `has_new=true|false` en `GITHUB_OUTPUT` para que el workflow decida si ejecutar la ingesta.

## Endpoints

### Roster persistido

```text
GET /api/competition-roster?competition=152
```

### Equipo de una liga

```text
GET /api/fantasy-team?league_id=<uuid-de-liga>
```

### Ranking, puntuaciones y clasificaciones reales

```text
GET /api/standings?seasonId=<uuid-de-temporada>
GET /api/league-ranking?league_id=<uuid-de-liga>
GET /api/league-scores?league_id=<uuid-de-liga>
```

## Tests declarados en `package.json`

```bash
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
npm run build
```

## Limitaciones conocidas que afectan al desarrollo

- **Rediseño UI Fantasy:** Falta unificar el estilo visual de las pestañas de Fantasy con el Sidebar y el Dashboard.
- **Jornadas futuras:** DataProject publica el calendario de forma progresiva. Si las jornadas futuras no existen en BD, el mercado se bloquea y las alineaciones se guardan como borrador en `localStorage`.
- **Partidos aplazados:** El escudo los mete en la primera pestaña donde aparecen y omite las siguientes. Caso raro, bajo impacto.
- **Bloqueo en ligas multi-grupo:** El candado se activa con la fecha del primer partido del grupo más madrugador.
- **Cruce de jugadores:** Quedan ~150 estadísticas sin emparejar en las actas.
- **Duplicidad de cálculo de puntuaciones:** La API y el servicio tienen implementaciones paralelas. Aceptado como deuda técnica.
- **Node 22 requerido** por `@supabase/supabase-js`. En local y en CI.
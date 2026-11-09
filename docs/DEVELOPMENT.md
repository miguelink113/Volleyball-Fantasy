# Desarrollo local

**Revisión de documentación:** 2026-11-09

## Requisitos

- Node.js compatible con Next.js 16 y npm.
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
4. **Lectura de producto:** los repositorios encapsulan consultas de Supabase.
5. **Aplicación:** las APIs de datos persistidos exponen roster, scoring, ranking y clasificaciones.

## Estrategia de Ramas y Despliegue (Vercel)

- **`main`**: Rama de producción. Cualquier push o merge dispara un despliegue automático.
- **`feature/nombre`**: Ramas de desarrollo. Cada push genera una **Preview URL** en Vercel.
- **Variables de Entorno en Vercel**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `CRON_SECRET`.

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

*(Nota: El parámetro `--competition-name` es necesario para actualizar el nombre de la competición en la base de datos y desmarcar automáticamente las temporadas antiguas).*

### Partidos y estadísticas

```bash
npx tsx scripts/ingest/ingest-matches.ts --competition=167 --season=203
```

*(Nota: Este script descarga primero todas las estadísticas en caché para leer la jornada oficial. Incluye un escudo anti-duplicados y normaliza los nombres de grupos para evitar rondas fantasma como "Alcudia" o "Egido").*

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

- **Valores de mercado dinámicos:** Actualmente los precios son estáticos (10M). Pendiente implementar la fórmula en la Fase 12.
- **Rediseño UI Fantasy:** Falta unificar el estilo visual de las pestañas de Fantasy con el Sidebar y el Dashboard.
- **Jornadas futuras:** DataProject publica el calendario de forma progresiva. Si las jornadas futuras aún no existen en la BD, el mercado se bloquea y las alineaciones se guardan como borrador en `localStorage`. La UI muestra feedback claro del estado.
- **Partidos aplazados:** Si un partido de J1 se aplaza y se juega en J5, DataProject lo muestra en ambas pestañas. El escudo anti-duplicados lo mete en la primera y lo omite en la segunda. Caso raro, bajo impacto.
- **Bloqueo en ligas multi-grupo:** El candado se activa con la fecha del primer partido del grupo más madrugador.
- **Cruce de jugadores:** Quedan ~150 estadísticas sin emparejar en las actas.
- **Duplicidad de cálculo de puntuaciones:** La API y el servicio tienen implementaciones paralelas. Se intentó unificar y se revirtió por divergencias. Aceptado como deuda técnica.
- **Automatización:** La ingesta y el cálculo se ejecutan manualmente (pendiente Fase 13).
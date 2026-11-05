# Desarrollo local

**Revisión de documentación:** 2026-11-05

## Requisitos

- Node.js compatible con Next.js 16 y npm.
- Proyecto Supabase configurado y variables de entorno locales.
- `SUPABASE_REMOTE_DB_URL` solo si se ejecuta la prueba de esquema remoto.

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. No versionar secretos ni la URI PostgreSQL. `lib/supabase/admin.server.ts` requiere `SUPABASE_SECRET_KEY` y solo debe ejecutarse en servidor; el cliente de navegador usa la publishable key.

## Flujo de desarrollo

1. **Extracción:** `lib/scraper/` consulta RFEVB.
2. **Ingesta:** scripts de `scripts/ingest/` persisten el roster, partidos, estadísticas, clasificaciones y valores de mercado.
3. **Cálculo de puntos:** `npm run calculate:scores` procesa dinámicamente todas las temporadas activas y actualiza las tablas de puntuaciones.
4. **Lectura de producto:** los repositorios encapsulan consultas de Supabase.
5. **Aplicación:** las APIs de datos persistidos exponen roster, scoring, ranking y clasificaciones; el dashboard, `/fantasy` y `/results` consumen estos datos.

## Estrategia de Ramas y Despliegue (Vercel)

- **`main`**: Rama de producción. Cualquier `push` o *merge* a esta rama dispara un despliegue automático en Vercel.
- **`feature/nombre`**: Ramas para desarrollo de nuevas funcionalidades (ej. rediseño UI, mercado dinámico). Cada `push` a estas ramas genera una **Preview URL** en Vercel para probar los cambios en internet sin afectar a la web pública.
- **Variables de Entorno en Vercel**: Se configuran en el panel del proyecto (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`).

## Estructura relevante

```text
app/
  api/                     Rutas de extracción y de producto
  dashboard/               Dashboard y gestión de ligas
  fantasy/                 Equipo, mercado y puntuación
  results/                 Vista de resultados y clasificaciones
components/
  dashboard/               Operaciones de ligas
  fantasy/                 Gestor fantasy
  results/                 Componentes de resultados y standings
  auth/                    Componentes de autenticación
domain/                    Contratos de dominio y scoring
lib/
  repositories/            Lecturas tipadas de Supabase
  scraper/                 Extracción RFEVB
  services/                Servicios de fantasy, perfil e ingesta
  supabase/                Clientes de Supabase
scripts/
  ingest/                  Ingestas administrativas
  tests/                   Scripts de pruebas y verificaciones
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
*(Nota: El parámetro `--competition-name` es necesario para actualizar el nombre de la competición en la base de datos y desmarcar automáticamente las temporadas antiguas (`is_current = false`), evitando que aparezcan en el Dashboard).*

### Partidos y estadísticas
```bash
npx tsx scripts/ingest/ingest-matches.ts --competition=167 --season=203
```
*(Nota: Este script descarga primero todas las estadísticas en caché para leer la jornada oficial de cada partido. Es normal que tarde un poco más, pero evita duplicar peticiones y asigna correctamente los partidos aplazados).*

### Valores iniciales del mercado
```bash
npx tsx scripts/ingest/ingest-market-values.ts --competition=167 --season=203 --price=10
```

### Clasificaciones reales
```bash
npx tsx --env-file=.env.local scripts/ingest/ingest-standings.ts <competition_id> <season_id> 167 203
```
*Extrae la tabla de clasificación de DataProject (soporta 1 o 3 grupos) y la persiste en `team_standings`.*

### Cálculo y persistencia de puntuaciones
```bash
npm run calculate:scores
```
*Lee los partidos dinámicamente de todas las temporadas con `is_current = true`, calcula los puntos con `ScoringSystemV1` y los persiste en `player_match_scores`, `player_round_scores` y `fantasy_scores`.*

## Endpoints

### Roster persistido

```text
GET /api/competition-roster?competition=152
```

Busca la competición en Supabase y usa la temporada con `is_current=true`.

### Equipo de una liga

```text
GET /api/fantasy-team?league_id=<uuid-de-liga>
```

Consulta equipo, jugadores activos y la primera alineación encontrada.

### Ranking, puntuaciones y clasificaciones reales

```text
GET /api/standings?seasonId=<uuid-de-temporada>
GET /api/league-ranking?league_id=<uuid-de-liga>
GET /api/league-scores?league_id=<uuid-de-liga>
```

*`/api/standings` devuelve la clasificación oficial de la RFEVB (puntos, sets, coeficientes) por grupos.*

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

- **Valores de mercado dinámicos:** Actualmente los precios son estáticos. Pendiente implementar la fórmula en la Fase 12.
- **Página de resultados:** Clasificaciones implementadas. Pendiente crear la vista de partidos (columna izquierda) en la Fase 12.
- **Bloqueo en ligas multi-grupo:** El candado de la jornada fantasy se calcula tomando la fecha del primer partido del grupo más madrugador. Si un grupo juega los viernes y otro los domingos, el bloqueo afecta a ambos el viernes. Pendiente definir la estrategia final.
- **Cruce de jugadores:** Quedan algunas estadísticas de jugadores sin emparejar en las actas (fichajes de última hora o "Unknown Player" de RFEVB).
- La ingesta desde RFEVB y el cálculo de puntuaciones se ejecutan manualmente; el despliegue en producción requerirá tareas programadas (cron) en la Fase 13.
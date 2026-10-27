# Desarrollo local

**Revisión de documentación:** 2026-10-27

## Requisitos

- Node.js compatible con Next.js 16 y npm[cite: 3].
- Proyecto Supabase configurado y variables de entorno locales[cite: 3].
- `SUPABASE_REMOTE_DB_URL` solo si se ejecuta la prueba de esquema remoto[cite: 3].

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`[cite: 3]. No versionar secretos ni la URI PostgreSQL[cite: 3]. `lib/supabase/admin.server.ts` requiere `SUPABASE_SECRET_KEY` y solo debe ejecutarse en servidor; el cliente de navegador usa la publishable key[cite: 3].

## Flujo de desarrollo

1. **Extracción:** `lib/scraper/` consulta RFEVB[cite: 3].
2. **Ingesta:** scripts de `scripts/ingest/` persisten el roster, partidos, estadísticas y valores de mercado[cite: 3].
3. **Cálculo de puntos:** `npm run calculate:scores` procesa dinámicamente todas las temporadas activas y actualiza las tablas de puntuaciones.
4. **Lectura de producto:** los repositorios encapsulan consultas de Supabase[cite: 3].
5. **Aplicación:** las APIs de datos persistidos exponen roster, scoring y ranking; el dashboard y `/fantasy` consumen algunos datos y operaciones mediante RPC[cite: 3].

## Estructura relevante

```text
app/
  api/                     Rutas de extracción y de producto
  dashboard/               Dashboard y gestión de ligas
  fantasy/                 Equipo, mercado y puntuación
components/
  dashboard/                Operaciones de ligas
  fantasy/                  Gestor fantasy
  auth/                     Componentes de autenticación
domain/                    Contratos de dominio y scoring
lib/
  repositories/             Lecturas tipadas de Supabase
  scraper/                  Extracción RFEVB
  services/                 Servicios de fantasy, perfil e ingesta
  supabase/                 Clientes de Supabase
scripts/
  ingest/                   Ingestas administrativas
  tests/                    Scripts de pruebas y verificaciones
  tools/                    Herramientas de diagnóstico
docs/                       Documentación
supabase/migrations/         Migraciones SQL
```

## Ingesta

Los comandos siguientes son ejemplos para los IDs documentados de la temporada 2025/26[cite: 3].

### Roster
```bash
npm run ingest:roster -- --competition=152 --season=186 --season-name="2025/26"
```

### Partidos y estadísticas
```bash
npm run ingest:matches -- --competition=152 --season=186
```

### Valores iniciales del mercado
```bash
npm run ingest:market-values -- --competition=152 --season=186 --price=9
```

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

Busca la competición en Supabase y usa la temporada con `is_current=true`[cite: 3].

### Equipo de una liga

```text
GET /api/fantasy-team?league_id=<uuid-de-liga>
```

Consulta equipo, jugadores activos y la primera alineación encontrada[cite: 3].

### Ranking y puntuaciones reales

```text
GET /api/league-ranking?league_id=<uuid-de-liga>
GET /api/league-scores?league_id=<uuid-de-liga>
```

Lecturas instantáneas de las tablas de resultados persistidos[cite: 3].

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

## Consideraciones sobre el sistema

- La ingesta desde RFEVB y el cálculo de puntuaciones se ejecutan manualmente; el despliegue en producción requerirá tareas programadas (cron)[cite: 3].
- Toda la UI, rutas HTTP, comandos de tests y scripts operativos operan ya sobre IDs dinámicos sin hardcoding.
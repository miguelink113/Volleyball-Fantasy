# Desarrollo local

**Revisión de documentación:** 2026-10-22

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
2. **Ingesta:** scripts de `scripts/ingest/` persisten el roster, partidos, estadísticas y valores de mercado.
3. **Lectura de producto:** los repositorios encapsulan consultas de Supabase.
4. **Aplicación:** las APIs de datos persistidos exponen roster y scoring; el dashboard y `/fantasy` consumen algunos datos y operaciones mediante RPC.

La ingesta desde RFEVB y la lectura del catálogo persistido son flujos separados. `/api/matches`, `/api/match-statistics` y `/api/competition-statistics` aún son endpoints de extracción en directo; `/api/competition-roster` y `/api/fantasy-round-scores` leen Supabase.

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
supabase/migrations/         Migraciones SQL (no incluidas en la instantánea auditada)
```

## Ingesta

Los comandos siguientes son ejemplos para los IDs documentados de la temporada 2025/26. No implican que esos IDs sean válidos para 2026/27; obtén los identificadores actuales desde RFEVB antes de ingerir la nueva temporada.

### Roster

```bash
npm run ingest:roster -- --competition=152 --season=186 --season-name="2025/26"
npm run ingest:roster -- --competition=151 --season=185 --season-name="2025/26"
npm run ingest:roster -- --competition=153 --season=187 --season-name="2025/26"
npm run ingest:roster -- --competition=150 --season=183 --season-name="2025/26"
```

### Partidos y estadísticas

```bash
npm run ingest:matches -- --competition=152 --season=186
```

Consulta `scripts/ingest/ingest-matches.ts` antes de ejecutar el comando: requiere un roster previo y puede excluir partidos o jugadores cuyos equipos/jugadores no se resuelvan de forma inequívoca. Revisa los avisos y los conteos al final de la ejecución.

### Valores iniciales del mercado

```bash
npm run ingest:market-values -- --competition=152 --season=186 --price=9
```

El precio predeterminado es 9M. El script hace upsert por jugador y jornada y verifica el conteo final; repetirlo vuelve a establecer el precio indicado para esa temporada, así que no lo ejecutes sobre un mercado que ya deba tener precios diferenciados sin revisar primero el script.

## Endpoints

### Roster persistido

```text
GET /api/competition-roster?competition=152
```

Busca la competición en Supabase y usa la temporada con `is_current=true`. Los precios se leen de la primera jornada. Si el frontend solicita puntuaciones de una temporada fija distinta de `is_current`, el catálogo y los puntos pueden quedar desalineados.

### Puntuación calculada

```text
GET /api/fantasy-round-scores?competition=152&season=186
GET /api/fantasy-round-scores?competition=152&season=186&round=1
```

Lee partidos y estadísticas persistidos y calcula `ScoringSystemV1` bajo demanda. La ruta devuelve `playerId`, `roundNumber`, `score`, `matchesPlayed` y `scoringVersion`; en el código actual no persiste resultados ni devuelve `breakdown`. La implementación busca la temporada solo por su `rfevb_id`, sin verificar que corresponda a la competición enviada; no uses esa combinación como validación de integridad hasta corregirlo.

### Equipo de una liga

```text
GET /api/fantasy-team?league_id=<uuid-de-liga>
```

Consulta equipo, jugadores activos y la primera alineación encontrada. Es un endpoint de lectura; no permite guardar alineaciones.

### Extracción en directo

```text
GET /api/matches?competition=152&season=186
GET /api/match-statistics?matchId=13881&competition=152&category=362&season=186
GET /api/competition-statistics?competition=152&season=186&round=1
```

Estas rutas consultan la web de RFEVB. Limita las pruebas a una jornada para evitar un volumen innecesario de peticiones.

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
npm run test:match-parser -- 1 1
npm run show:match-scores -- 1 1
npm run build
```

No todos estos scripts son un runner integrado: algunos ejecutan comprobaciones manuales o herramientas de diagnóstico con argumentos. Comprueba `package.json` si cambian los nombres.

### Verificación de esquema remoto

`npm run test:supabase:schema` necesita `SUPABASE_REMOTE_DB_URL`. La prueba abre una transacción `READ ONLY` y compara las 20 tablas esperadas, columnas, tipos relevantes, restricciones, relaciones, índices, RLS, políticas y permisos de RPC. No aplica migraciones ni comprueba la lógica interna o atomicidad de las RPC.

No utilices `supabase db reset` contra una base remota o datos que quieras conservar. Las pruebas de comportamiento de ligas/transferencias deben ejecutarse en un proyecto o fixture no productivo con usuarios de prueba.

## Limitaciones conocidas que afectan al desarrollo

- La UI está parcialmente fijada a `competition=152` y `season=186`; el objetivo 2026/27 requiere hacer coherentes los selectores de roster, liga y scoring. La ruta de scoring además debe comprobar la relación competición-temporada.
- `FantasyTeamBuilder.toggleLineup` es un placeholder y no persiste alineaciones.
- Las compras/ventas llaman a `transfer_player`, pero hacen falta pruebas funcionales que ejerciten presupuesto, límites, pertenencia y bloqueo temporal.
- El scoring se calcula bajo demanda y todavía no se ve una escritura en las tablas históricas de resultados.

## Próximas prioridades

Verifica las RPC con sus migraciones, prueba el ciclo de creación/unión/salida de una liga y la inicialización del equipo; implementa guardado/bloqueo de alineación; alinea las temporadas; y añade pruebas de persistencia y ranking antes de marcar como completadas las fases 6–10.

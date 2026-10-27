# Scraper RFEVB

**Revisión de documentación:** 2026-10-27

Scraper desarrollado con **Next.js + TypeScript + Cheerio** para obtener el
catálogo de competiciones de voleibol, sus equipos, jugadores, partidos y
estadísticas desde RFEVB[cite: 8].

La extracción es un adaptador externo[cite: 8]. Su responsabilidad termina en descargar
HTML, extraer campos, normalizar valores básicos y conservar los identificadores
oficiales[cite: 8]. No renderiza la UI ni persiste directamente en Supabase: la ingesta se
hace mediante scripts `scripts/ingest/*.ts`[cite: 8]. Los endpoints de extracción consultan
RFEVB en directo; los endpoints de producto de roster y puntuaciones leen Supabase[cite: 8].

## Límites del scraper

| Capa | Responsabilidad |
| --- | --- |
| `lib/scraper/` | Descargar e interpretar la web de RFEVB[cite: 8]. |
| `app/api/matches`, `match-statistics`, `competition-statistics` | Validar parámetros HTTP e invocar el scraper en directo[cite: 8]. |
| `app/api/competition-roster`, `fantasy-round-scores`, `fantasy-team` | APIs de producto que leen datos persistidos de Supabase (las dos primeras usan cliente administrativo server-only)[cite: 8]. |
| `domain/` | Definir interfaces de `Competition`, `Team`, `Player`, `Match` y estadísticas[cite: 8]. |
| `lib/services/fantasy/` | Reglas de validación y helpers fantasy; el helper de mercado diario es legado y no alimenta el roster actual de `FantasyTeamBuilder`[cite: 8]. |
| `components/fantasy/` | Mostrar el mercado, el equipo y la alineación[cite: 8]. |
| Supabase | Persistencia del catálogo, jornadas, partidos, estadísticas, precios y datos fantasy mediante ingesta/repositorios/RPC[cite: 8]. El scraper no escribe directamente[cite: 8]. |

## Endpoints

### 1. Obtener partidos

```text
GET /api/matches
```

Obtiene los partidos de una competición y temporada[cite: 8].

Parámetros:

| Parámetro     | Descripción          | Ejemplos |
| ------------- | -------------------- |------|
| `competition` | ID de la competición | `152` |
| `season`      | ID de la temporada   | `186` |
| `round`       | Jornada opcional     | `10` |

#### Ejemplo

```text
http://localhost:3000/api/matches?competition=152&season=186
```

Para obtener únicamente una jornada:

```text
http://localhost:3000/api/matches?competition=152&season=186&round=10
```

La respuesta contiene los partidos encontrados:

```json
{
  "success": true,
  "count": 150,
  "matches": [
    {
      "matchId": "13881",
      "competitionId": "152",
      "categoryId": "362",
      "seasonId": "186",
      "round": 23,
      "url": "[https://rfevb-web.dataproject.com/MatchStatistics.aspx](https://rfevb-web.dataproject.com/MatchStatistics.aspx)?..."
    }
  ]
}
```

---

### 2. Obtener las estadísticas de un partido

```text
GET /api/match-statistics
```

Obtiene las estadísticas de los jugadores de los dos equipos de un partido[cite: 8].

Parámetros:

| Parámetro     | Descripción          | Ejemplo |
| ------------- | -------------------- | ------- |
| `matchId`     | ID del partido       | `13881` |
| `competition` | ID de la competición | `152`   |
| `category`    | ID de la categoría   | `362`   |
| `season`      | ID de la temporada   | `186`   |

#### Ejemplo

```text
http://localhost:3000/api/match-statistics?matchId=13881&competition=152&category=362&season=186
```

La respuesta contiene los equipos y sus jugadores con las estadísticas disponibles[cite: 8].

Ejemplo simplificado:

```json
{
  "success": true,
  "match": {
    "matchId": "13881",
    "teams": [
      {
        "name": "Equipo A",
        "players": [
          {
            "number": 7,
            "name": "Jugador Ejemplo",
            "points": {
              "total": 23,
              "bp": 7,
              "wonLost": 12
            },
            "serve": {
              "total": 16,
              "errors": 5,
              "directPoints": 1
            }
          }
        ]
      }
    ]
  }
}
```

---

### 3. Obtener una competición con las estadísticas de sus partidos

```text
GET /api/competition-statistics
```

Este endpoint combina los dos anteriores:

1. Obtiene los partidos de la competición[cite: 8].
2. Accede a cada partido[cite: 8].
3. Obtiene sus estadísticas[cite: 8].

Parámetros:

| Parámetro     | Descripción          | Ejemplo |
| ------------- | -------------------- | ------- |
| `competition` | ID de la competición | `152`   |
| `season`      | ID de la temporada   | `186`   |
| `round`       | Jornada opcional     | `24`    |

#### Ejemplo

Para probarlo con una jornada concreta:

```text
http://localhost:3000/api/competition-statistics?competition=152&season=186&round=24
```

La respuesta contiene cada partido junto con sus estadísticas:

```json
{
  "success": true,
  "count": 5,
  "matches": [
    {
      "match": {
        "matchId": "13891",
        "competitionId": "152",
        "categoryId": "362",
        "seasonId": "186",
        "round": 24
      },
      "stats": {
        "matchId": "13891",
        "teams": [
          {
            "name": "Equipo A",
            "players": []
          },
          {
            "name": "Equipo B",
            "players": []
          }
        ]
      }
    }
  ]
}
```

> **Nota:** este endpoint puede realizar muchas peticiones a la web de RFEVB[cite: 8]. Para pruebas, es recomendable utilizar `round` y trabajar primero con una sola jornada[cite: 8].

Algunas jornadas incluyen fichas de partidos programados o aplazados que aún
no tienen tablas de estadísticas[cite: 8]. Esas fichas responden correctamente con
HTML, pero no contienen los dos equipos estadísticos esperados[cite: 8]. El scraper las
omite y devuelve los partidos jugados que sí tienen estadísticas; no convierte
un único partido pendiente en un error de toda la jornada[cite: 8].

En la competición 152, la numeración de los contenedores de RFEVB representa
también las fases de la competición[cite: 8]:

| Jornadas | Fase | Comportamiento |
| -------- | ---- | -------------- |
| 1-22 | Liga regular SVM | Se disputan todas las jornadas |
| 23 | Cuartos de final | Eliminatorias al mejor de 3; número variable de partidos |
| 24 | Semifinales | Eliminatorias al mejor de 3; número variable de partidos |
| 25 | Final | Eliminatoria al mejor de 3; número variable de partidos |

El contenedor 26 aparece en el HTML, pero no corresponde a una jornada jugable
y no contiene partidos[cite: 8]. Por tanto, la demo solo muestra las jornadas 1-22 y
las tres fases de playoff[cite: 8]. Las jornadas de playoff no deben interpretarse como
una jornada regular de seis partidos: solo incluyen los partidos realmente
programados o disputados en cada eliminatoria[cite: 8].

### 4. Obtener equipos y jugadores de una competición

```text
GET /api/competition-roster
```

Obtiene los equipos de una competición y los jugadores de sus plantillas[cite: 8].

Parámetros:

| Parámetro     | Descripción          | Ejemplo |
| ------------- | -------------------- | ------- |
| `competition` | ID de la competición | `152`   |

#### Ejemplo

```text
http://localhost:3000/api/competition-roster?competition=152
```

La respuesta contiene `teams` y `players`[cite: 8]. Los objetos se conectan con las
interfaces `Team` y `Player` del dominio y conservan el identificador oficial
en `rfevbId`[cite: 8]:

```json
{
  "success": true,
  "competitionId": "152",
  "teams": [
    {
      "id": "rfevb:team:1318",
      "rfevbId": "1318",
      "name": "Bus Leader San Roque",
      "logoUrl": "[https://images.dataproject.com/rfevb/TeamLogo/100/40/TeamLogo_1318.jpg](https://images.dataproject.com/rfevb/TeamLogo/100/40/TeamLogo_1318.jpg)",
      "detailsUrl": "[https://rfevb-web.dataproject.com/CompetitionTeamDetails.aspx?TeamID=1318&ID=152](https://rfevb-web.dataproject.com/CompetitionTeamDetails.aspx?TeamID=1318&ID=152)"
    }
  ],
  "players": [
    {
      "id": "rfevb:player:8825",
      "rfevbId": "8825",
      "firstName": "Vidal",
      "lastName": "Allen Serrano Luis",
      "displayName": "Allen Serrano Luis Vidal",
      "position": "middle",
      "currentTeamId": "rfevb:team:1312",
      "dorsal": 14,
      "teamRfevbId": "1312",
      "detailsUrl": "[https://rfevb-web.dataproject.com/PlayerDetails.aspx?TeamID=1312&PlayerID=8825&ID=152](https://rfevb-web.dataproject.com/PlayerDetails.aspx?TeamID=1312&PlayerID=8825&ID=152)"
    }
  ]
}
```

El endpoint consulta:

1. `CompetitionTeamSearch.aspx?ID=<competitionId>` para obtener los equipos[cite: 8].
2. `CompetitionPlayerSearch.aspx?ID=<competitionId>` como listado inicial[cite: 8].
3. `CompetitionTeamDetails.aspx?TeamID=<teamId>&ID=<competitionId>` para
   recorrer las plantillas completas de cada equipo y evitar depender de la
   paginación del listado global[cite: 8].

La posición se normaliza a los valores del dominio:

```text
setter | opposite | outside | middle | libero
```

Si la posición no puede resolverse desde el roster, el dominio utiliza
`unknown` y la presentación debe mostrar `DESCONOCIDO`[cite: 8]. No se sustituye
silenciosamente por `outside`[cite: 8].

En la comprobación actual de la competición `152` se obtienen 12 equipos y
180 jugadores[cite: 8].

## Integración con el dominio deportivo

`../lib/services/ingestion/map-scraped-match.ts` contiene el adaptador histórico para
transformar un partido y sus estadísticas extraídas en las interfaces del
dominio[cite: 8]:

- `Competition`, `Season` y `Match`[cite: 8].
- `Team`, `Player` y `MatchPlayerStats`[cite: 8].
- `MatchSet` para los marcadores de cada set[cite: 8].

El scraper puro de origen usa identificadores estables basados en el ID oficial:

- `rfevb:team:<id>` para equipos[cite: 8].
- `rfevb:player:<id>` para jugadores[cite: 8].

Esto no debe confundirse con `GET /api/competition-roster`: la ruta de producto
lee Supabase y devuelve los UUIDs internos de la base de datos[cite: 8].

El mapeador histórico de partidos genera identidades estables a partir de
nombres y dorsales porque las estadísticas de partido no incluyen siempre el
identificador RFEVB del jugador[cite: 8]. Debe alinearse con el roster oficial por
`rfevbId` antes de la ingesta persistente[cite: 8].
Los valores estadísticos ausentes se normalizan a `0` en el modelo de dominio[cite: 8].

El sistema de puntuación se define mediante `ScoringSystem`, por lo que puede
sustituirse sin modificar el adaptador[cite: 8]. El endpoint de producto y la herramienta
`npm run show:match-scores` utilizan `ScoringSystemV1` (versión `v1`)[cite: 8].

El scraper actual devuelve estadísticas agregadas del partido y una formación
con cinco posiciones por jugador[cite: 8]. El adaptador cuenta las posiciones no nulas
(`number` o `*`) como sets con participación registrada[cite: 8]. Los campos numéricos
ausentes (`null`) se normalizan a `0`; el adaptador no inventa datos que RFEVB
no proporcione[cite: 8].

La fórmula definitiva de la fase 2 está en `ScoringSystemV1`, cuya versión es
`v1`[cite: 8]. Usa únicamente acciones y porcentajes extraídos por RFEVB y el resultado
calculado desde los sets del partido[cite: 8]. No suma `points.total`, `BP` ni `G-P`
para evitar doble conteo o depender de una semántica ambigua[cite: 8]. El detalle de la
fórmula está en [`docs/SCORING.md`](SCORING.md)[cite: 8].

`BasicScoringSystem` (`basic-v1`) se conserva solo como compatibilidad de código
histórico y no debe utilizarse en la demo, scripts ni resultados persistidos[cite: 8].

### Resolución de Nombres de Equipo (DataProject)

Se ha verificado mediante inspección directa del HTML (Oct 2026) que DataProject **no inyecta IDs técnicos (`TeamID` ni `PlayerID`)** en el DOM de las actas centrales de los partidos (`MatchStatistics.aspx`)[cite: 8]. Los 12 `TeamID` que aparecen en el código fuente corresponden al menú de navegación global, imposibilitando extraerlos para asociarlos a las estadísticas[cite: 8].

Además, los nombres de los equipos difieren sistemáticamente entre la página de la plantilla oficial (ej. `CV Melilla`) y el acta del partido (ej. `Club Voleibol Melilla`)[cite: 8].

**Decisión Técnica (Opción 3a):** Implementar una tabla de alias en la base de datos (`team_source_aliases`) para unificar y auto-resolver asíncronamente los nombres de origen antes de pasarlos al mapper estricto del dominio[cite: 8].

## Ejecutar el scraper

Instalar dependencias:

```bash
npm install
```

Iniciar Next.js:

```bash
npm run dev
```

Después se pueden probar los endpoints desde el navegador[cite: 8].

Ejemplos:

```text
http://localhost:3000/api/matches?competition=152&season=186

http://localhost:3000/api/match-statistics?matchId=13881&competition=152&category=362&season=186

http://localhost:3000/api/competition-statistics?competition=152&season=186&round=24
```

## Estructura del scraper

```text
lib/
└── scraper/
    ├── fetch-matches.ts
    ├── fetch-match-statistics.ts
    └── fetch-competition-statistics.ts
    └── fetch-competition-roster.ts
```

* `fetch-matches.ts`: obtiene los partidos[cite: 8]. Extrae la fecha de cada uno desde
  `HF_MatchDatetime` (`DD/MM/YYYY - HH:MM`, Europe/Madrid) y la expone como
  `matchDate: Date | null`[cite: 8].
* `fetch-match-statistics.ts`: obtiene las estadísticas de un partido[cite: 8].
* `fetch-competition-statistics.ts`: combina partidos y estadísticas[cite: 8].
* `fetch-competition-roster.ts`: obtiene equipos y jugadores de una
  competición y los adapta a `Team` y `Player`[cite: 8].
- `lib/services/fantasy/fantasy-round-score.service.ts`: relaciona las
  estadísticas de una jornada con el roster y agrega la puntuación de
  `ScoringSystemV1`[cite: 8].

Los datos scrapeados se persisten mediante `scripts/ingest/ingest-roster.ts` (catálogo), `scripts/ingest/ingest-matches.ts` (jornadas, partidos y estadísticas) y `scripts/ingest/ingest-market-values.ts` (precios)[cite: 8]. La ingesta se ejecuta manualmente[cite: 8].

No todas las rutas HTTP pasan por el scraper: `/api/matches`, `/api/match-statistics` y `/api/competition-statistics` siguen leyendo RFEVB en directo; `/api/competition-roster` y `/api/fantasy-round-scores` consultan el catálogo persistido en Supabase[cite: 8]. La sección siguiente detalla estas APIs de producto[cite: 8].

## Mostrar puntuaciones de un partido

Con Next.js ejecutándose en `http://localhost:3000`, el siguiente comando
recibe el número de jornada y el número de partido dentro de esa jornada,
obtiene sus estadísticas y muestra todos los jugadores ordenados por
puntuación:

```bash
npm run show:match-scores -- <jornada> <partido>
```

Ejemplo para el segundo partido de la jornada 1:

```bash
npm run show:match-scores -- 1 2
```

El número de partido empieza en `1` y sigue el orden devuelto por
`/api/matches`[cite: 8]. Se puede utilizar otra URL base con `FANTASY_API_URL`[cite: 8].

El script informa de cada fase:

1. Valida los argumentos de jornada y número de partido[cite: 8].
2. Consulta `/api/matches` filtrando por competición `152`, temporada `186` y
   la jornada indicada[cite: 8].
3. Selecciona el partido indicado dentro de la jornada[cite: 8].
4. Muestra el equipo local y el visitante obtenidos del listado de partidos[cite: 8].
5. Consulta `/api/match-statistics` usando el `matchId` y los identificadores
   de competición, categoría y temporada del partido seleccionado[cite: 8].
6. Comprueba cuántos equipos y jugadores devuelve el scraper[cite: 8].
7. Ejecuta `mapScrapedMatch`, que relaciona los jugadores con sus equipos, y
   cruza cada jugador con el roster oficial para recuperar su posición real
   mediante equipo, dorsal y nombre de respaldo[cite: 8]. El
   primer bloque de estadísticas se asigna al anfitrión y el segundo al
   visitante; los nombres del listado de partidos se usan como fuente
   principal[cite: 8].
8. Aplica `ScoringSystemV1` y muestra una tabla con jugador, equipo, posición,
   participación, saque, ataque, bloqueos, recepción, resultado y total[cite: 8].

## Probar el parser de estadísticas

Para inspeccionar los valores extraídos por RFEVB antes de aplicar cualquier
fórmula fantasy:

```bash
npm run test:match-parser -- <jornada> <partido>
```

Por ejemplo:

```bash
npm run test:match-parser -- 1 1
```

El comando utiliza la misma convención que `show:match-scores`, consulta
`/api/matches` y `/api/match-statistics`, valida que solo haya jugadores con
dorsales positivos y nombres de equipo resueltos, y muestra por jugador:

- puntos totales[cite: 8];
- saques totales, errores y puntos directos[cite: 8];
- recepciones, errores y porcentajes[cite: 8];
- ataques, errores, ataques bloqueados y ataques efectivos[cite: 8];
- bloqueos realizados[cite: 8].

Estos son valores del parser[cite: 8]. No incluyen bonus, penalizaciones ni diferencias
de sets del sistema fantasy[cite: 8].

## Probar equipos y jugadores directamente

Con el servidor iniciado se puede consultar el endpoint desde el navegador,
PowerShell o `curl`[cite: 8]:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/competition-roster?competition=152" |
  ConvertTo-Json -Depth 10
```

También se puede ejecutar el scraper sin pasar por HTTP:

```bash
npx tsx -e "import { scrapeCompetitionRoster } from './lib/scraper/fetch-competition-roster.ts'; scrapeCompetitionRoster(152).then((roster) => console.log(JSON.stringify({ teams: roster.teams.length, players: roster.players.length }, null, 2))).catch((error) => { console.error(error); process.exit(1); });"
```

La web externa de RFEVB debe estar disponible[cite: 8]. Los identificadores internos
estables se construyen con el identificador oficial (`rfevb:team:<id>` y
`rfevb:player:<id>`), por lo que no dependen del nombre mostrado[cite: 8].

## Uso del catálogo persistido en el fantasy actual

La pantalla `/fantasy` solicita `GET /api/competition-roster?competition=152` y convierte los jugadores y equipos devueltos en los modelos que muestra `FantasyTeamBuilder`[cite: 8]. La ruta obtiene la competición por su ID RFEVB, busca la temporada marcada `is_current=true` y añade el precio leído de `player_market_values` para la primera jornada disponible[cite: 8]. Si el precio de un jugador no existe, aplica un fallback de 9M[cite: 8].

Este comportamiento sustituye al mercado de demostración descrito en versiones anteriores de esta guía[cite: 8]. `createDailyFantasyRoster` y la generación determinista de una selección diaria de 30 jugadores siguen en `lib/services/fantasy/fantasy-team.service.ts`, pero el `FantasyTeamBuilder` actual no llama a ese helper[cite: 8]. No describas la selección diaria como comportamiento actual de la pantalla[cite: 8].

La UI también carga el equipo de la liga mediante `/api/fantasy-team?league_id=...`; las compras y ventas llaman a la RPC `transfer_player`, y el guardado de la alineación semanal llama a la RPC `save_lineup`[cite: 8]. Ambas operaciones están protegidas por bloqueos temporales en la base de datos[cite: 8].

**Nota sobre flujo dinámico:** Todo el flujo es dinámico y se adapta a la temporada que esté marcada como activa en la base de datos.

## Puntuaciones fantasy por jornada

La API de producto es:

```text
GET /api/fantasy-round-scores?competition=152&season=186
GET /api/fantasy-round-scores?competition=152&season=186&round=1
```

`competition` y `season` son los identificadores RFEVB; `round` es opcional[cite: 8]. La ruta lee `rounds`, `matches` y `match_player_stats` de Supabase a través de los repositorios y calcula la puntuación con `ScoringSystemV1`[cite: 8]. No obtiene las estadísticas de RFEVB en directo[cite: 8]. **Limitación conocida del código:** la ruta resuelve la temporada solo por `rfevb_id` y no valida que esa temporada pertenezca a la competición recibida[cite: 8].

La respuesta actual contiene `playerId`, `roundNumber`, `score`, `matchesPlayed` y `scoringVersion`[cite: 8]. El cálculo interno agrega el desglose, pero la ruta actual no lo incluye en la respuesta y no guarda los resultados en `player_match_scores`, `player_round_scores` ni `fantasy_scores`[cite: 8].

La ruta filtra las jornadas por el `rfevb_id` de la temporada consultada y calcula todas las jornadas si no se proporciona `round`[cite: 8]. El cliente `FantasyTeamBuilder` carga las puntuaciones de la temporada fija 186 y las guarda en estado React durante la sesión; no existe la caché de cliente por jornada descrita en versiones previas de este documento[cite: 8].

## Tests del contrato de dominio

Los tests unitarios del adaptador y del scoring se ejecutan sin RFEVB ni
Supabase:

```bash
npm run test:domain
```

Para modificar `mapScrapedMatch`, deben mantenerse las garantías de que:

- el resultado contiene entidades compatibles con `Competition`, `Season`,
  `Match`, `Player` y `MatchPlayerStats`[cite: 8];
- las estadísticas incompletas siguen siendo seguras[cite: 8];
- un partido sin dos equipos se rechaza explícitamente[cite: 8];
- los identificadores estables no dependen de objetos de React ni de Supabase[cite: 8].
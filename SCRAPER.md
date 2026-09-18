# Scraper RFEVB

Scraper desarrollado con **Next.js + TypeScript + Cheerio** para obtener partidos y estadísticas de competiciones de voleibol desde RFEVB.

## Endpoints

### 1. Obtener partidos

```text
GET /api/matches
```

Obtiene los partidos de una competición y temporada.

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
      "url": "https://rfevb-web.dataproject.com/MatchStatistics.aspx?..."
    }
  ]
}
```

---

### 2. Obtener las estadísticas de un partido

```text
GET /api/match-statistics
```

Obtiene las estadísticas de los jugadores de los dos equipos de un partido.

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

La respuesta contiene los equipos y sus jugadores con las estadísticas disponibles.

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

1. Obtiene los partidos de la competición.
2. Accede a cada partido.
3. Obtiene sus estadísticas.

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

> **Nota:** este endpoint puede realizar muchas peticiones a la web de RFEVB. Para pruebas, es recomendable utilizar `round` y trabajar primero con una sola jornada.

## Integración con el dominio fantasy

`lib/domain/map-scraped-match.ts` transforma un partido y sus estadísticas
extraídas en las interfaces del dominio:

- `Competition`, `Season` y `Match`.
- `Team`, `Player` y `MatchPlayerStats`.
- `MatchSet` para los marcadores de cada set.

Los identificadores de equipos y jugadores se generan de forma estable a partir
de los nombres y dorsales mientras no exista persistencia en base de datos.
Los valores estadísticos ausentes se normalizan a `0` en el modelo de dominio.

El sistema de puntuación se define mediante `ScoringSystem`, por lo que puede
sustituirse sin modificar el adaptador. `BasicScoringSystem` aplica actualmente
la regla inicial:

```text
puntuación = sets jugados + G-P
```

El scraper actual devuelve estadísticas agregadas del partido, no la
participación de cada jugador en cada set. Por ello, la primera implementación
usa el número de sets del partido para los jugadores que aparecen en la tabla
agregada. Cuando se extraiga la participación por set, solo habrá que cambiar
ese dato de entrada, no el sistema de puntuación.

## Ejecutar el scraper

Instalar dependencias:

```bash
npm install
```

Iniciar Next.js:

```bash
npm run dev
```

Después se pueden probar los endpoints desde el navegador.

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
```

* `fetch-matches.ts`: obtiene los partidos.
* `fetch-match-statistics.ts`: obtiene las estadísticas de un partido.
* `fetch-competition-statistics.ts`: combina partidos y estadísticas.

Los datos obtenidos todavía no se almacenan en una base de datos.

## Mostrar puntuaciones del primer partido de la jornada 1

Con Next.js ejecutándose en `http://localhost:3000`, el siguiente comando
selecciona la jornada 1, toma su primer partido, obtiene sus estadísticas y
muestra todos los jugadores ordenados por puntuación:

```bash
npm run show:first-match-scores
```

Se puede utilizar otra URL base con `FANTASY_API_URL`.

El script informa de cada fase:

1. Consulta `/api/matches` filtrando por competición `152`, temporada `186` y
   jornada `1`.
2. Selecciona el primer partido devuelto.
3. Muestra el anfitrión y el visitante obtenidos del listado de partidos.
4. Consulta `/api/match-statistics` usando el `matchId` y los identificadores
   de competición, categoría y temporada del partido seleccionado.
5. Comprueba cuántos equipos y jugadores devuelve el scraper.
6. Ejecuta `mapScrapedMatch`, que relaciona los jugadores con sus equipos. El
   primer bloque de estadísticas se asigna al anfitrión y el segundo al
   visitante; los nombres del listado de partidos se usan como fuente
   principal.
7. Aplica `BasicScoringSystem` y muestra una tabla con jugador, equipo, G-P,
   puntos por sets y puntuación total.

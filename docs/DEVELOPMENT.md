# Desarrollo local

## Requisitos

- Node.js compatible con Next.js 16.
- npm.
- Un proyecto Supabase solo para las funciones de autenticación y sus pruebas.

## Puesta en marcha

```bash
npm install
npm run dev
```

La aplicación se inicia normalmente en `http://localhost:3000`.

## Comandos disponibles

```bash
npm run dev
npm run build
npm run start
npm run test:supabase
npm run show:first-match-scores
```

`npm run test:supabase` requiere las variables descritas en
`docs/AUTHENTICATION.md`. `npm run show:first-match-scores` requiere que la
aplicación esté disponible y utiliza las rutas HTTP del scraper.

## Separación de responsabilidades

El proyecto distingue estas capas:

### Presentación

La presentación muestra información y recoge interacciones del usuario. No
debe conocer HTML de RFEVB, hacer peticiones directas a la web externa ni
decidir reglas persistentes.

- `app/`: páginas y rutas HTTP de Next.js.
- `components/`: componentes React.
- `components/fantasy/FantasyTeamBuilder.tsx`: interfaz de la demo fantasy.
- `hooks/`: estado interactivo del cliente, principalmente autenticación.

La sección fantasy se divide visualmente en:

- **Mercado de fichajes**: jugadores disponibles, precios provisionales y
  acciones de comprar/vender.
- **Mi equipo y alineación**: plantilla seleccionada, titulares y errores de
  composición.
- **Puntuación por jornada**: consulta de la puntuación calculada para la
  alineación actual.

### Control de aplicación

Las rutas de `app/api/` son la entrada HTTP. Validan parámetros, invocan
servicios o scrapers y convierten los errores en respuestas HTTP. No son el
modelo de dominio ni una capa de persistencia.

Rutas relevantes:

- `/api/matches`
- `/api/match-statistics`
- `/api/competition-statistics`
- `/api/competition-roster`
- `/api/fantasy-round-scores`

### Dominio

`domain/` contiene contratos TypeScript de las entidades deportivas y fantasy:

- `Competition`, `Season`, `Team` y `Player`;
- `Match` y estadísticas de jugador;
- tipos de fantasy, alineaciones y ligas;
- contratos de puntuación.

Los tipos de dominio describen datos y contratos. No deben depender de
Cheerio, React, Supabase ni de la estructura HTML de RFEVB.

### Servicios de aplicación y reglas

`lib/services/` contiene lógica reutilizable que no pertenece a la vista:

- `lib/services/fantasy/`: validación de plantilla y alineación, cálculo de
  puntuación de la demo y selección diaria del mercado;
- `lib/services/profile/`: acceso relacionado con perfiles;
- futuras capas de ingesta y repositorios.

`createDailyFantasyRoster` genera un mercado temporal determinista. La regla
de selección diaria está aquí, no en el componente visual.

### Scraper

`lib/scraper/` es el adaptador hacia RFEVB. Descarga HTML, lo interpreta y
devuelve datos de scraper o entidades compatibles con el dominio. No guarda
datos en Supabase y no contiene lógica de presentación.

### Persistencia

`lib/supabase/` contiene clientes y sincronización de sesión. La persistencia
de competiciones, jugadores, equipos, partidos, mercado y equipos fantasy aún
no está implementada.

## Demo fantasy actual

La ruta `/fantasy` carga jugadores reales mediante:

```text
/api/competition-roster?competition=152
```

La demo:

- utiliza nombres, equipos, posiciones e identificadores procedentes de RFEVB;
- crea un mercado en memoria de 30 jugadores;
- usa una semilla UTC `YYYY-MM-DD`;
- mantiene el mismo mercado durante el día y lo cambia al día siguiente;
- asigna precios provisionales deterministas;
- crea inicialmente una plantilla de hasta 14 jugadores;
- valida una alineación de 7 jugadores:
  - 1 colocador;
  - 1 líbero;
  - 1 opuesto;
  - 2 centrales;
  - 2 receptores.

El catálogo real sí procede del scraper. El mercado, los precios, las compras,
las ventas, la plantilla y la alineación viven solo en el estado del cliente.
No hay presupuesto real, transacciones, bloqueo por jornada ni persistencia.
La jornada seleccionada consulta `/api/fantasy-round-scores`, que combina el
roster real con los partidos y estadísticas de RFEVB. La regla provisional de
la demo es `sets con participación registrada + G-P`; los resultados se
asignan por equipo, dorsal y nombre cuando es necesario. Mercado y equipo
siguen viviendo solo en el estado del cliente.

## Probar el catálogo real

Con `npm run dev` ejecutándose:

```text
http://localhost:3000/api/competition-roster?competition=152
```

También se puede ejecutar directamente:

```bash
npx tsx -e "import { scrapeCompetitionRoster } from './lib/scraper/fetch-competition-roster.ts'; scrapeCompetitionRoster(152).then((roster) => console.log(JSON.stringify({ teams: roster.teams.length, players: roster.players.length }, null, 2))).catch((error) => { console.error(error); process.exit(1); });"
```

La comprobación actual devuelve 12 equipos y 180 jugadores.

## Limitaciones conocidas

- El build global tiene errores pendientes en el contrato de scoring y en el
  adaptador histórico `lib/domain/map-scraped-match.ts`.
- El scraper depende de HTML externo y necesita pruebas con fixtures.
- No existe ingesta programada ni almacenamiento de datos deportivos.
- La demo fantasy no representa todavía el comportamiento final del producto.

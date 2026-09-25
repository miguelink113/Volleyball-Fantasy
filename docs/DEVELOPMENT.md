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
npm run test:domain
npm run test:match-parser -- 1 1
npm run test:supabase
npm run show:match-scores -- 1 1
```

`npm run test:domain` ejecuta tests unitarios sin conexión externa sobre el
contrato de scoring y el adaptador `mapScrapedMatch`. `npm run test:supabase`
requiere las variables descritas en
`docs/AUTHENTICATION.md`. `npm run show:match-scores -- <jornada> <partido>`
requiere que la aplicación esté disponible y utiliza las rutas HTTP del
scraper.

`npm run test:match-parser -- <jornada> <partido>` consulta las mismas rutas
HTTP que la demo, selecciona un partido concreto y muestra los valores
extraídos por el parser para cada jugador. Sirve para verificar directamente
las columnas de saque, recepción, ataque y bloqueo antes de aplicar el scoring.

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
de competiciones, jugadores, equipos, partidos, mercado y equipos fantasy está
definida en `supabase/migrations/20260925123000_create_fantasy_schema.sql`;
todavía falta conectar los repositorios y la ingesta con esas tablas.

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

El catálogo real sí procede del scraper. La demo todavía mantiene el mercado,
las compras, las ventas, la plantilla y la alineación en el cliente; el esquema
persistente y sus funciones server-side ya están definidos, pero aún falta
conectar los repositorios y migrar la UI.

La salida de una liga se ejecuta mediante `leave_private_league`. La liga nunca
queda sin miembros: si sale el propietario, el miembro más antiguo restante
pasa a ser el nuevo propietario; si el propietario es el único miembro, la
liga se elimina completamente.
La jornada seleccionada consulta `/api/fantasy-round-scores`, que combina el
roster real con los partidos y estadísticas de RFEVB y aplica
`ScoringSystemV1`. La respuesta incluye `scoringVersion: "v1"`; los resultados
se asignan por equipo, dorsal y nombre cuando es necesario. Mercado y equipo
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

## Tests y validación

La validación mínima de cambios de dominio es:

```bash
npm run test:domain
npm run build
```

Los tests unitarios están en `scripts/test-domain.ts` y utilizan `node:assert`
con `tsx`, por lo que no se introduce un framework adicional. Cubren:

- el contrato y resultado de `ScoringSystemV1`;
- el mapeo de competición, temporada y partido;
- la normalización de estadísticas nulas;
- el cálculo de sets jugados a partir de la formación;
- el rechazo de partidos que no contienen exactamente dos equipos.
- la fórmula versionada `ScoringSystemV1`, sus penalizaciones y el bonus por
  resultado;
- la exclusión de campos estadísticos ambiguos para evitar doble conteo.

El runner muestra para cada caso qué comportamiento verifica, cuándo comienza,
si ha terminado correctamente y el motivo concreto del fallo, incluyendo los
valores real y esperado cuando falla una aserción.

El test de Supabase sigue siendo una prueba de integración y requiere un
proyecto configurado con las variables de `docs/AUTHENTICATION.md`.

## Limitaciones conocidas

- El scraper depende de HTML externo y necesita pruebas con fixtures.
- No existe ingesta programada ni almacenamiento de datos deportivos.
- La demo fantasy no representa todavía el comportamiento final del producto.

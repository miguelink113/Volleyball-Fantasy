# Modelo persistente de Supabase

Las migraciones del proyecto definen el esquema del catálogo y de fantasy. El archivo `repomix-output.xml` usado en la revisión excluye `supabase/migrations/`, por lo que esta documentación describe el modelo esperado apoyándose en `scripts/tests/test-supabase-schema.ts`, no en una lectura directa de las definiciones SQL.

## Capas de datos

- **Identidad:** `profiles` contiene un `username` único asociado a `auth.users`.
- **Datos deportivos:** `competitions`, `seasons`, `teams`, `players`, `rounds`, `matches` y `match_player_stats`.
- **Resolución de nombres:** `team_source_aliases` relaciona alias de fuentes (`roster` o `matches`) con el equipo oficial de la temporada. La clave natural documentada es `(season_id, normalized_alias)`.
- **Mercado:** `player_market_values` guarda valores de jugador por jornada, con precio y periodo de validez.
- **Fantasy privado:** `private_leagues`, `private_league_members`, `fantasy_teams`, `fantasy_team_players`, `lineups`, `lineup_players` y `transactions`.
- **Resultados:** `player_match_scores` y `player_round_scores` representan puntuaciones de jugador versionadas; `fantasy_scores` representa el resultado de un equipo por jornada y versión.

El modelo relaciona el catálogo por competición y temporada para evitar cruces accidentales entre temporadas.

## Restricciones documentadas y comprobadas estructuralmente

El test de esquema comprueba tablas, columnas, algunos tipos y nullabilidad, relaciones compuestas, restricciones e índices esperados, habilitación de RLS, políticas y privilegios de RPC. Entre otras expectativas del test se encuentran:

- `rfevb_id` no nulo para competiciones, equipos y jugadores;
- integridad de las referencias entre equipo/jugador y competición/temporada;
- integridad entre equipos fantasy, ligas, alineaciones, jornadas y jugadores;
- índice/restricción para evitar la propiedad activa duplicada de un jugador dentro de una liga;
- RLS activado en las 20 tablas de aplicación;
- funciones `create_private_league`, `join_private_league`, `leave_private_league` y `transfer_player` con privilegios de ejecución esperados.

El test es una comprobación estructural. No demuestra por sí solo que las funciones creen las filas correctas, apliquen el presupuesto, gestionen saldos, sean atómicas o manejen adecuadamente condiciones de carrera.

## Operaciones de escritura

El código de frontend invoca RPC para:

- crear una liga privada;
- unirse a una liga mediante código;
- abandonar una liga;
- comprar o vender un jugador mediante `transfer_player`.

Aunque la llamada parte del cliente de Supabase, las validaciones de seguridad y negocio deben ocurrir dentro de la función SQL y las restricciones de la base, no solo en React. La instantánea revisada no incluye las migraciones SQL, así que la lógica interna y la atomicidad de estas funciones deben contrastarse en el repositorio original.

Las alineaciones son un caso pendiente: la UI no guarda los cambios y el endpoint `/api/fantasy-team` solo ofrece lectura. No debe asumirse que la mera existencia de `lineups` y `lineup_players` implica que el flujo de edición esté implementado.

## Seguridad y roles

- Las tablas de estado fantasy se consultan con el cliente autenticado y están sujetas a RLS.
- Los endpoints de catálogo y puntuaciones usan el cliente administrativo en servidor; la clave privilegiada no debe exponerse en el bundle del navegador.
- La ingesta usa `createAdminClient()` y debe ejecutarse exclusivamente en servidor.
- La prueba de esquema remota utiliza `BEGIN READ ONLY`, consulta catálogos de PostgreSQL y no aplica migraciones.

## Aplicación local

Con Supabase CLI, aplica las migraciones según el flujo habitual de desarrollo. `supabase db reset` reconstruye la base local y puede destruir los datos locales; no lo ejecutes sobre una base remota o datos que quieras conservar.

## Verificación del esquema remoto

`npm run test:supabase:schema` necesita `SUPABASE_REMOTE_DB_URL` en `.env.local`. Comprueba el esquema esperado mediante una conexión PostgreSQL de solo lectura. La documentación anterior informa de una ejecución exitosa contra el proyecto remoto, pero esta revisión no la ha repetido ni ha accedido a la base.

La comprobación no acredita:

- que las ingestas tengan actualmente los conteos documentados;
- que las mutaciones RPC funcionen de extremo a extremo;
- que las transacciones de negocio sean atómicas;
- que las tablas de resultados se estén rellenando;
- que los datos de la temporada 2026/27 estén ingeridos y seleccionados coherentemente.

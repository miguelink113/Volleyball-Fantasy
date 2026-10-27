# Modelo persistente de Supabase

Las migraciones del proyecto definen el esquema del catálogo y de fantasy[cite: 9]. El archivo `repomix-output.xml` usado en la revisión excluye `supabase/migrations/`, por lo que esta documentación describe el modelo esperado apoyándose en `scripts/tests/test-supabase-schema.ts`, no en una lectura directa de las definiciones SQL[cite: 9].

## Capas de datos

- **Identidad:** `profiles` contiene un `username` único asociado a `auth.users`[cite: 9].
- **Datos deportivos:** `competitions`, `seasons`, `teams`, `players`, `rounds`, `matches` y `match_player_stats`[cite: 9].
- **Resolución de nombres:** `team_source_aliases` relaciona alias de fuentes (`roster` o `matches`) con el equipo oficial de la temporada[cite: 9]. La clave natural documentada es `(season_id, normalized_alias)`[cite: 9].
- **Mercado:** `player_market_values` guarda valores de jugador por jornada, con precio y periodo de validez[cite: 9].
- **Fantasy privado:** `private_leagues`, `private_league_members`, `fantasy_teams`, `fantasy_team_players`, `lineups`, `lineup_players` y `transactions`[cite: 9].
- **Resultados:** `player_match_scores` y `player_round_scores` representan puntuaciones de jugador versionadas; `fantasy_scores` representa el resultado de un equipo por jornada y versión[cite: 9].

El modelo relaciona el catálogo por competición y temporada para evitar cruces accidentales entre temporadas[cite: 9].

## Restricciones documentadas y comprobadas estructuralmente

El test de esquema comprueba tablas, columnas, algunos tipos y nullabilidad, relaciones compuestas, restricciones e índices esperados, habilitación de RLS, políticas y privilegios de RPC[cite: 9]. Entre otras expectativas del test se encuentran:

- `rfevb_id` no nulo para competiciones, equipos y jugadores[cite: 9].
- integridad de las referencias entre equipo/jugador y competición/temporada[cite: 9].
- integridad entre equipos fantasy, ligas, alineaciones, jornadas y jugadores[cite: 9].
- índice/restricción para evitar la propiedad activa duplicada de un jugador dentro de una liga[cite: 9].
- RLS activado en las 20 tablas de aplicación[cite: 9].
- funciones `create_private_league`, `join_private_league`, `leave_private_league` y `transfer_player` con privilegios de ejecución esperados[cite: 9].

El test es una comprobación estructural[cite: 9]. No demuestra por sí solo que las funciones creen las filas correctas, apliquen el presupuesto, gestionen saldos, sean atómicas o manejen adecuadamente condiciones de carrera[cite: 9].

## Operaciones de escritura

El código de frontend invoca RPC para:

- crear una liga privada[cite: 9];
- unirse a una liga mediante código[cite: 9];
- abandonar una liga[cite: 9];
- comprar o vender un jugador mediante `transfer_player`[cite: 9].
- guardar la alineación semanal mediante `save_lineup`[cite: 9].

**Bloqueo temporal estricto:** Es importante destacar que se aplica un bloqueo de temporalidad a nivel de backend. Si `now() >= starts_at`, las RPCs `transfer_player` y `save_lineup` bloquean firmemente las operaciones de alineación y transferencias para salvaguardar la integridad de la jornada en curso independientemente de lo que envíe el cliente.

Aunque la llamada parte del cliente de Supabase, las validaciones de seguridad y negocio ocurren dentro de la función SQL y las restricciones de la base[cite: 9].

Las puntuaciones (tablas `player_match_scores`, `player_round_scores` y `fantasy_scores`) se escriben desde el script administrativo `scripts/ingest/calculate-scores.ts`, que es idempotente y está testeado[cite: 9].

## Seguridad y roles

- Las tablas de estado fantasy se consultan con el cliente autenticado y están sujetas a RLS[cite: 9].
- Los endpoints de catálogo y puntuaciones usan el cliente administrativo en servidor; la clave privilegiada no debe exponerse en el bundle del navegador[cite: 9].
- La ingesta usa `createAdminClient()` y debe ejecutarse exclusivamente en servidor[cite: 9].
- La prueba de esquema remota utiliza `BEGIN READ ONLY`, consulta catálogos de PostgreSQL y no aplica migraciones[cite: 9].

## Aplicación local

Con Supabase CLI, aplica las migraciones según el flujo habitual de desarrollo[cite: 9]. `supabase db reset` reconstruye la base local y puede destruir los datos locales; no lo ejecutes sobre una base remota o datos que quieras conservar[cite: 9].

## Verificación del esquema remoto

`npm run test:supabase:schema` necesita `SUPABASE_REMOTE_DB_URL` en `.env.local`[cite: 9]. Comprueba el esquema esperado mediante una conexión PostgreSQL de solo lectura[cite: 9].

La comprobación no acredita:

- que las ingestas tengan actualmente los conteos documentados;
- que las mutaciones RPC funcionen de extremo a extremo;
- que las transacciones de negocio sean atómicas;
- que las tablas de resultados se estén rellenando;
- que los datos de la temporada 2026/27 estén ingeridos y seleccionados coherentemente.

# Modelo persistente de Supabase

La migración `../supabase/migrations/20260925190000_create_fantasy_schema.sql`
crea el modelo base de la fase 3.

## Capas

- Identidad: `profiles` contiene un `username` único asociado a `auth.users`.
- Datos deportivos: `competitions`, `seasons`, `teams`, `players`,
  `rounds`, `matches`, `match_player_stats`.
- Fantasy privado: `private_leagues`, `private_league_members`,
  `fantasy_teams`, `fantasy_team_players`, `lineups`, `lineup_players`,
  `transactions`.
- Resultados: `player_match_scores` conserva el resultado de un jugador por
  partido y `player_round_scores` agrega por jornada; ambos versionan el
  scoring. `fantasy_scores` conserva el total de un equipo fantasy por
  jornada y versión.

Las competiciones y temporadas se almacenan como entidades persistentes. Los
equipos y jugadores se versionan por temporada para evitar mezclar plantillas
entre temporadas futuras.

## Restricciones importantes

- Una liga privada referencia una competición y una temporada.
- Un usuario solo puede tener un `fantasy_team` por liga.
- Una alineación solo puede existir una vez por equipo y jornada.
- Una plantilla puede tener hasta 14 jugadores.
- Una alineación puede tener hasta siete jugadores; no existe capitán. Para
  puntuar debe cumplir
  la composición `1/1/2/2/1`, validada server-side.
- Un jugador solo puede pertenecer activamente a un equipo dentro de una liga.
- Una liga siempre conserva al menos un miembro. Si abandona el propietario,
  la propiedad pasa al miembro restante más antiguo (`joined_at`, con el
  identificador como desempate); si era el único miembro, la liga se elimina
  completamente.
- Los resultados guardan siempre `scoring_version`.
- `unknown` es una posición válida para datos incompletos del scraper.

## Seguridad

Las tablas deportivas son legibles por usuarios autenticados. Las tablas de
estado fantasy solo tienen lectura mediante RLS: no hay mutaciones directas
para equipos, jugadores, alineaciones, transacciones o membresías. La creación
de ligas y la entrada mediante código se realizan mediante funciones
server-side atómicas.

Las alineaciones se bloquean usando `rounds.starts_at` y `rounds.ends_at`;
no existe una columna independiente `locks_at`.

La migración no crea políticas de escritura para las tablas deportivas ni
para los resultados calculados. La ingesta y el cálculo deben ejecutarse en
servidor con una clave privilegiada, nunca desde el navegador.

## Aplicación local

Con Supabase CLI instalado:

```bash
supabase db reset
supabase db push
```

La migración requiere el esquema estándar `auth.users` proporcionado por
Supabase y crea el trigger que inicializa `profiles.username`.

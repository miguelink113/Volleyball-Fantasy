# Modelo persistente de Supabase

La migración `supabase/migrations/20260925123000_create_fantasy_schema.sql`
crea el modelo base de la fase 3.

## Capas

- Datos deportivos: `competitions`, `seasons`, `teams`, `players`,
  `rounds`, `matches`, `match_player_stats`.
- Fantasy privado: `private_leagues`, `private_league_members`,
  `fantasy_teams`, `fantasy_team_players`, `lineups`, `lineup_players`,
  `transactions`.
- Resultados: `player_round_scores` conserva el resultado de un jugador por
  partido y versión de scoring; `fantasy_scores` conserva el total de un
  equipo fantasy por jornada y versión.

Las competiciones y temporadas se almacenan como entidades persistentes. Los
equipos y jugadores se versionan por temporada para evitar mezclar plantillas
entre temporadas futuras.

## Restricciones importantes

- Una liga privada referencia una competición y una temporada.
- Un usuario solo puede tener un `fantasy_team` por liga.
- Una alineación solo puede existir una vez por equipo y jornada.
- Una alineación tiene como máximo siete huecos y un único capitán.
- Los resultados guardan siempre `scoring_version`.
- `unknown` es una posición válida para datos incompletos del scraper.

## Seguridad

Las tablas deportivas son legibles por usuarios autenticados. Las tablas de
ligas, equipos fantasy, alineaciones, operaciones y puntuaciones se protegen
con RLS: los miembros solo ven su liga y cada usuario solo puede modificar
sus propios equipos y operaciones.

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
Supabase.

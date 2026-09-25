# Plan de evolución

Este documento describe el trabajo pendiente. No debe confundirse la demo
visual actual con la arquitectura persistente objetivo.

## Situación de partida

### Ya disponible

- UI fantasy en `components/fantasy/FantasyTeamBuilder.tsx`.
- Catálogo real bajo demanda desde RFEVB.
- Mercado diario determinista en memoria.
- Reglas puras de validación de plantilla y alineación.
- Rutas HTTP para consultar el scraper.
- Contratos TypeScript de dominio.

### Todavía provisional

- La competición de la demo está fijada a `152`.
- Los precios se generan para la demo y no representan valor de mercado real.
- La demo calcula puntuaciones con `ScoringSystemV1` bajo demanda a partir de
  estadísticas reales de RFEVB, pero todavía no las persiste como resultados
  fantasy definitivos.
- El estado del equipo se pierde al recargar.
- El HTML de RFEVB es la fuente directa porque aún no hay ingesta persistente.

## Responsabilidades objetivo

### Presentación

`components/` debe limitarse a mostrar estados y emitir acciones del usuario:
comprar, vender, alinear y quitar de la alineación. No debe calcular precios,
resolver permisos ni escribir directamente en Supabase.

### Control de aplicación

`app/api/` debe validar entradas y coordinar casos de uso. Las operaciones
importantes deberán delegar en servicios de servidor y transacciones, no en
estado del navegador.

### Dominio

`domain/` debe contener entidades, contratos y reglas puras independientes de
Next.js, Cheerio y Supabase. La regla de máximo 14 jugadores y la composición
de la alineación deben permanecer en esta capa o en servicios de dominio
claramente separados.

### Scraper

`lib/scraper/` solo debe extraer y normalizar la fuente externa. No debe
decidir precios fantasy, clasificaciones ni permisos.

### Ingesta y persistencia

La futura ingesta debe recibir datos del scraper, resolver identidades por
`rfevbId`, guardar cambios de forma idempotente y registrar errores. Supabase
debe ser la fuente de lectura del producto una vez completada esa fase.

## Orden recomendado

1. Mantener estabilizados los contratos actuales de scoring y mapeo de partidos.
   La corrección inicial y los tests de regresión están completados con
   `npm run test:domain`.
2. Añadir fixtures y tests del scraper para equipos, jugadores, partidos y
   estadísticas.
3. Crear tablas y RLS para competiciones, temporadas, equipos, jugadores,
   partidos, estadísticas, ligas privadas y equipos fantasy. La migración
   inicial está en
   `supabase/migrations/20260925123000_create_fantasy_schema.sql`.
4. Implementar la ingesta idempotente con reintentos y marcas de sincronización.
5. Crear un servicio de catálogo que sustituya la consulta directa desde la
   UI por datos persistidos.
6. Persistir el cálculo de `ScoringSystemV1` por partido y jornada, guardando
   siempre `scoringVersion`.
7. Persistir mercado, precios, presupuesto, compras, ventas, plantilla y
   alineación.
8. Añadir bloqueo de alineaciones y cierre de jornadas.
9. Crear ligas privadas y clasificaciones.
10. Migrar la demo visual a los servicios persistentes sin cambiar su
    responsabilidad de presentación.

## Modelo persistente previsto

- `competitions`
- `seasons`
- `teams`
- `players`
- `matches`
- `match_player_stats`
- `player_round_scores`
- `player_match_scores`
- `player_market_values`
- `fantasy_teams`
- `fantasy_team_players`
- `lineups`
- `market_windows`
- `market_listings`
- `transfers`
- `private_leagues`
- `private_league_members`
- `fantasy_scores`

Las identidades deportivas deben priorizar el ID oficial RFEVB. Los nombres
solo deben utilizarse como apoyo para detectar cambios o resolver registros
incompletos.

## Criterios de aceptación

- Repetir una ingesta no duplica entidades.
- Los jugadores y equipos mantienen sus `rfevbId`.
- El catálogo persistido puede reconstruirse desde el scraper.
- Los precios y puntuaciones tienen versión y fecha.
- Una alineación cerrada no cambia retroactivamente.
- Las operaciones de mercado comprueban saldo, límites y concurrencia en el
  servidor.
- La UI no puede acceder a datos de otra cuenta o liga.

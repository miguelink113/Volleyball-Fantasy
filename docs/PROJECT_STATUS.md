# Estado del proyecto

## Resumen

Las fases 1 a 11 están **completadas y verificadas** mediante ejecuciones reproducibles. El proyecto dispone de un dominio tipado, un sistema de puntuación versionado, persistencia en Supabase, ingesta idempotente del catálogo deportivo, repositorios de lectura, gestión de ligas, mercado de fichajes, guardado de alineaciones, persistencia de puntuaciones y clasificación privada.

Durante la Fase 11, se completó la ingesta de la temporada 2026/27. Se ha implementado un avanzado `TeamAliasResolver` (con containment y asignación greedy) que ha resuelto casi la totalidad de los nombres dispares entre actas y rosters (incluyendo casos complejos como "Melilla"), evitando omisiones de partidos. Además, la UI se ha adaptado para agrupar jornadas de competiciones multi-grupo.

| Entidad | Registros (25/26) | Registros (26/27) |
| --- | ---: | ---: |
| Equipos | 94 | 96 |
| Jugadores | 1.449 | 1.388 |
| Partidos | 1.045 | 277 |
| Estadísticas de jugador | 25.262 | 5.527 |

La tabla `player_market_values` contiene valores sembrados para todos los jugadores en todas las jornadas.

## Estado de las fases

| Fase | Estado | Notas |
| --- | --- | --- |
| 1. Dominio tipado | ✅ Completada | `npm run test:domain` pasa. |
| 2. Scoring V1 | ✅ Completada | Documentado en `SCORING.md` y testeado. |
| 3. Modelo Supabase | ✅ Completada | Migraciones sincronizadas con la nube. |
| 3A. Verificación remota | ✅ Completada | Historial de migraciones reparado y sincronizado. |
| 4. Ingesta | ✅ Completada | Tests de mappers/alias pasan. Soporte multi-grupo implementado. |
| 5. Catálogo persistente | ✅ Completada | Repositorios y APIs conectadas. |
| 6. Ligas y equipos | ✅ Completada | RPCs probadas con `test-league-seeding.ts`. |
| 7. Mercado | ✅ Completada | Reglas de límite y bloqueo probadas con `test-market-rules.ts`. |
| 8. Alineaciones | ✅ Completada | RPC `save_lineup` y tests superados. |
| 9. Scoring persistente | ✅ Completada | Script de persistencia, APIs y tests de idempotencia/aislamiento. |
| 10. UI persistente | ✅ Completada | Refactorización visual terminada, navegación dinámica y test de bloqueo `test:lockout` superado. |
| 11. Integración 26/27 | ✅ Completada | Ingesta de 4 competiciones exitosa. Resolver de equipos v2 implementado. UI adaptada a multi-grupo. |

## Implementado

### Dominio y scoring
- Contratos tipados para todas las entidades.
- `ScoringSystemV1` versionado (`v1`).
- API de scoring devuelve `breakdown` y valida que la temporada pertenezca a la competición.

### Autenticación y perfiles
- Supabase Auth con email/contraseña.
- Perfil con `username` único y trigger automático.

### Esquema Supabase
- Tablas, RLS y RPCs para ligas, transferencias y alineaciones.
- Restricciones de límite de plantilla (14) y bloqueo estricto temporal por jornada (`now() >= starts_at`).
- RPC `save_lineup` que valida pertenencia de jugadores, composición exacta (1/1/2/2/1) y bloqueo por jornada.
- Soporte multi-grupo con la columna `group_name` en `teams`, `rounds` y `matches`.

### Ingesta y catálogo
- Scripts de ingesta idempotentes.
- **TeamAliasResolver v2:** Contiene lógica de `resolveJornada` con containment bidireccional y asignación greedy sin restricción 1-a-1 (permite absorber varios nombres en la misma jornada).
- Pre-paso de caché en la ingesta de partidos para leer la jornada oficial desde la página de stats (`officialRound`), ignorando los partidos aplazados en el listado general.
- Registro automático del nombre real de las competiciones y desmarcado de temporadas antiguas (`is_current`).
- Repositorios tipados con propiedades camelCase.

### Scoring y Clasificación
- Servicio `scoring-persistence.service.ts` que calcula y persiste `player_match_scores`, `player_round_scores` y `fantasy_scores`.
- Script `calculate-scores.ts` para ejecutar el cálculo de forma masiva buscando dinámicamente temporadas activas (`is_current = true`).
- API `/api/league-ranking` y `/api/league-scores` para consultar los datos reales sin recálculo.
- Test `test-scoring-persistence.ts` que verifica la idempotencia y el aislamiento entre ligas.

### Frontend
- `/dashboard`: Gestión de ligas dinámica. Unificación visual de "Crear" y "Unirse". Arreglado el bug que impedía crear ligas en competiciones multi-grupo.
- `/fantasy`: Agrupación inteligente de jornadas por número (evita duplicados de "Jornada 1" en Superliga 2). Candado de bloqueo calculado a partir de la fecha del primer partido de la jornada.
- CI configurado en GitHub Actions (TypeScript, tests y build).

## Deuda técnica conocida
- **Bloqueo en ligas multi-grupo:** Actualmente, si el Grupo A juega el viernes y el Grupo B el domingo, el candado se activa el viernes para todos. Se debe decidir si es el comportamiento deseado.
- **Cruce de jugadores:** Quedan estadísticas de jugadores sin emparejar en las actas (principalmente "Unknown Player" de RFEVB o fichajes que no están en el roster oficial).
- **Automatización:** La ingesta y el cálculo de puntuaciones se ejecutan manualmente; el despliegue requerirá tareas programadas (cron).
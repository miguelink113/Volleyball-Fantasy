# Estado del proyecto

## Resumen

Las fases 1 a 9 están **completadas y verificadas** mediante ejecuciones reproducibles. El proyecto dispone de un dominio tipado, un sistema de puntuación versionado, persistencia en Supabase, ingesta idempotente del catálogo deportivo, repositorios de lectura, gestión de ligas, mercado de fichajes, guardado de alineaciones, persistencia de puntuaciones y clasificación privada.

La Fase 10 (UI persistente y pulido visual) es la siguiente en desarrollo.

La ingesta está completada para las cuatro competiciones de la temporada 2025/26.

| Entidad | Registros persistidos |
| --- | ---: |
| Equipos | 94 |
| Jugadores | 1.449 |
| Partidos | 1.045 |
| Estadísticas de jugador | 25.262 |

La tabla `player_market_values` contiene valores de 9M para todos los jugadores en todas las jornadas.

## Estado de las fases

| Fase | Estado | Notas |
| --- | --- | --- |
| 1. Dominio tipado | ✅ Completada | `npm run test:domain` pasa. |
| 2. Scoring V1 | ✅ Completada | Documentado en `SCORING.md` y testeado. |
| 3. Modelo Supabase | ✅ Completada | Migraciones sincronizadas con la nube. |
| 3A. Verificación remota | ✅ Completada | Historial de migraciones reparado y sincronizado. |
| 4. Ingesta | ✅ Completada | Tests de mappers/alias pasan. |
| 5. Catálogo persistente | ✅ Completada | Repositorios y APIs conectadas. |
| 6. Ligas y equipos | ✅ Completada | RPCs probadas con `test-league-seeding.ts`. |
| 7. Mercado | ✅ Completada | Reglas de límite y bloqueo probadas con `test-market-rules.ts`. |
| 8. Alineaciones | ✅ Completada | RPC `save_lineup` y tests superados. |
| 9. Scoring persistente | ✅ Completada | Script de persistencia, APIs y tests de idempotencia/aislamiento. |
| 10. UI persistente | ⏳ En desarrollo | Refactorización visual en curso. |

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
- Restricciones de límite de plantilla (14) y bloqueo temporal por jornada.
- RPC `save_lineup` que valida pertenencia de jugadores, composición exacta (1/1/2/2/1) y bloqueo por jornada.

### Ingesta y catálogo
- Scripts de ingesta idempotentes.
- Resolución de alias de equipos.
- Repositorios tipados con propiedades camelCase.

### Scoring y Clasificación
- Servicio `scoring-persistence.service.ts` que calcula y persiste `player_match_scores`, `player_round_scores` y `fantasy_scores`.
- Script `calculate-scores.ts` para ejecutar el cálculo de forma masiva.
- API `/api/league-ranking` y `/api/league-scores` para consultar los datos reales sin recálculo.
- Test `test-scoring-persistence.ts` que verifica la idempotencia y el aislamiento entre ligas.

### Frontend
- `/dashboard`: Gestión de ligas y equipos.
- `/fantasy`: Muestra plantilla, mercado, puntos dinámicos, permite comprar/vender y guardar alineaciones.
- Temporadas y jornadas son dinámicas (extraídas de la API, sin IDs hardcodeados).
- CI configurado en GitHub Actions (TypeScript, tests y build).

## Deuda técnica conocida (a partir de Fase 10)
- Refactorizar la UI para eliminar cálculos simulados y mostrar los datos persistidos.
- Revisión de estadísticas de acta que no pudieron cruzarse unívocamente.
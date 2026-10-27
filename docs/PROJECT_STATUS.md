# Estado del proyecto

## Resumen

Las fases 1 a 10 están **completadas y verificadas** mediante ejecuciones reproducibles. El proyecto dispone de un dominio tipado, un sistema de puntuación versionado, persistencia en Supabase, ingesta idempotente del catálogo deportivo, repositorios de lectura, gestión de ligas, mercado de fichajes, guardado de alineaciones, persistencia de puntuaciones y clasificación privada[cite: 6]. La interfaz (UI) ha sido refactorizada para ser 100% dinámica.

La ingesta está completada para las cuatro competiciones de la temporada 2025/26[cite: 6].

| Entidad | Registros persistidos |
| --- | ---: |
| Equipos | 94 |
| Jugadores | 1.449 |
| Partidos | 1.045 |
| Estadísticas de jugador | 25.262 |

La tabla `player_market_values` contiene valores de 9M para todos los jugadores en todas las jornadas[cite: 6].

## Estado de las fases

| Fase | Estado | Notas |
| --- | --- | --- |
| 1. Dominio tipado | ✅ Completada | `npm run test:domain` pasa[cite: 6]. |
| 2. Scoring V1 | ✅ Completada | Documentado en `SCORING.md` y testeado[cite: 6]. |
| 3. Modelo Supabase | ✅ Completada | Migraciones sincronizadas con la nube[cite: 6]. |
| 3A. Verificación remota | ✅ Completada | Historial de migraciones reparado y sincronizado[cite: 6]. |
| 4. Ingesta | ✅ Completada | Tests de mappers/alias pasan[cite: 6]. |
| 5. Catálogo persistente | ✅ Completada | Repositorios y APIs conectadas[cite: 6]. |
| 6. Ligas y equipos | ✅ Completada | RPCs probadas con `test-league-seeding.ts`[cite: 6]. |
| 7. Mercado | ✅ Completada | Reglas de límite y bloqueo probadas con `test-market-rules.ts`[cite: 6]. |
| 8. Alineaciones | ✅ Completada | RPC `save_lineup` y tests superados[cite: 6]. |
| 9. Scoring persistente | ✅ Completada | Script de persistencia, APIs y tests de idempotencia/aislamiento[cite: 6]. |
| 10. UI persistente | ✅ Completada | Refactorización visual terminada, navegación dinámica y test de bloqueo `test:lockout` superado. |

## Implementado

### Dominio y scoring
- Contratos tipados para todas las entidades[cite: 6].
- `ScoringSystemV1` versionado (`v1`)[cite: 6].
- API de scoring devuelve `breakdown` y valida que la temporada pertenezca a la competición[cite: 6].

### Autenticación y perfiles
- Supabase Auth con email/contraseña[cite: 6].
- Perfil con `username` único y trigger automático[cite: 6].

### Esquema Supabase
- Tablas, RLS y RPCs para ligas, transferencias y alineaciones[cite: 6].
- Restricciones de límite de plantilla (14) y bloqueo estricto temporal por jornada[cite: 6].
- RPC `save_lineup` que valida pertenencia de jugadores, composición exacta (1/1/2/2/1) y bloqueo por jornada[cite: 6].

### Ingesta y catálogo
- Scripts de ingesta idempotentes[cite: 6].
- Resolución de alias de equipos[cite: 6].
- Repositorios tipados con propiedades camelCase[cite: 6].

### Scoring y Clasificación
- Servicio `scoring-persistence.service.ts` que calcula y persiste `player_match_scores`, `player_round_scores` y `fantasy_scores`[cite: 6].
- Script `calculate-scores.ts` para ejecutar el cálculo de forma masiva buscando dinámicamente temporadas activas.
- API `/api/league-ranking` y `/api/league-scores` para consultar los datos reales sin recálculo[cite: 6].
- Test `test-scoring-persistence.ts` que verifica la idempotencia y el aislamiento entre ligas[cite: 6].

### Frontend
- `/dashboard`: Gestión de ligas y equipos dinámica[cite: 6].
- `/fantasy`: Muestra plantilla, mercado, puntos dinámicos, permite comprar/vender y guardar alineaciones[cite: 6]. La navegación y el estado son 100% dinámicos leyendo las temporadas actuales.
- Temporadas y jornadas son dinámicas (extraídas de la API, sin IDs hardcodeados)[cite: 6].
- CI configurado en GitHub Actions (TypeScript, tests y build)[cite: 6].
- `npm run test:lockout` asegura las reglas de backend de bloqueo estricto por `starts_at`.
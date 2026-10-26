# Estado del proyecto

## Resumen

Las fases 1 a 8 están **completadas y verificadas** mediante ejecuciones reproducibles. El proyecto dispone de un dominio tipado, un sistema de puntuación versionado, persistencia en Supabase, ingesta idempotente del catálogo deportivo, repositorios de lectura, gestión de ligas, mercado de fichajes y guardado de alineaciones.

La Fase 9 (Persistencia de scoring y ranking) es la siguiente en desarrollo.

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
| 9. Scoring persistente | ⏳ Pendiente | Siguiente fase. |

## Implementado

### Dominio y scoring
- Contratos tipados para todas las entidades.
- `ScoringSystemV1` versionado (`v1`).
- API de scoring devuelve `breakdown` y valida que la temporada pertenezca a la competición.

### Autenticación y perfiles
- Supabase Auth con email/contraseña.
- Perfil con `username` único y trigger automático.

### Esquema Supabase
- Tablas, RLS y RPCs para ligas y transferencias.
- Restricciones de límite de plantilla (14) y bloqueo temporal por jornada.
- Migraciones sincronizadas y aplicadas en remoto.
- RPC `save_lineup` que valida pertenencia de jugadores, composición exacta (1/1/2/2/1) y bloqueo por jornada.

### Ingesta y catálogo
- Scripts de ingesta idempotentes.
- Resolución de alias de equipos.
- Repositorios tipados con propiedades camelCase.

### Frontend
- `/dashboard`: Gestión de ligas y equipos.
- `/fantasy`: Muestra plantilla, mercado, puntos dinámicos, permite comprar/vender y guardar alineaciones.
- Temporadas y jornadas son dinámicas (extraídas de la API, sin IDs hardcodeados).
- CI configurado en GitHub Actions (TypeScript, tests y build).

## Deuda técnica conocida (a partir de Fase 9)
- Persistencia de puntuaciones fantasy y clasificación privada.
- Revisión de estadísticas de acta que no pudieron cruzarse unívocamente.
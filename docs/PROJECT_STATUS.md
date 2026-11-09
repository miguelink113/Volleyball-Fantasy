# Estado del proyecto

## Resumen

Las fases 1 a 11 están **completadas y verificadas** mediante ejecuciones reproducibles. El proyecto dispone de un dominio tipado, un sistema de puntuación versionado, persistencia en Supabase, ingesta idempotente del catálogo deportivo, repositorios de lectura, gestión de ligas, mercado de fichajes, guardado de alineaciones, persistencia de puntuaciones y clasificación privada.

Durante la Fase 11 se completó la ingesta de la temporada 2026/27. Se implementó el `TeamAliasResolver v2` (containment y asignación greedy) y la UI se adaptó para agrupar jornadas multi-grupo. La aplicación está desplegada en producción en Vercel con Supabase Auth configurado.

Durante la Fase 12 se completó el rediseño de navegación (Sidebar/Dashboard), la vista de resultados (`/results`), el mercado diario rotativo, el modal de estadísticas, la gestión masiva de alineaciones y el **mercado dinámico** con precios basados en rendimiento. También se hizo una limpieza profunda de la BD (re-ingesta completa de 266 partidos, sin rondas fantasma).

Durante la Fase 13 se implementó la **automatización completa** con GitHub Actions: workflow diario con Node 22 que ejecuta check de partidos nuevos, ingesta, cálculo de puntuaciones y mercado. El cache de ingesta reduce el tiempo de ~15 min a ~2 min en días sin partidos nuevos.

| Entidad | Registros (25/26) | Registros (26/27) |
| --- | ---: | ---: |
| Equipos | 94 | 96 |
| Jugadores | 1.449 | 1.388 |
| Partidos | 1.045 | 266 |
| Estadísticas de jugador | 25.262 | 6.368 |

La tabla `player_market_values` contiene precios dinámicos calculados tras cada ingesta. La tabla `team_standings` contiene las clasificaciones reales de las 4 competiciones.

## Estado de las fases

| Fase | Estado | Notas |
| --- | --- | --- |
| 1. Dominio tipado | ✅ Completada | `npm run test:domain` pasa. |
| 2. Scoring V1 | ✅ Completada | Documentado en `SCORING.md` y testeado. |
| 3. Modelo Supabase | ✅ Completada | Migraciones sincronizadas con la nube. |
| 3A. Verificación remota | ✅ Completada | Historial de migraciones reparado y sincronizado. |
| 4. Ingesta | ✅ Completada | Tests de mappers/alias pasan. Soporte multi-grupo. |
| 5. Catálogo persistente | ✅ Completada | Repositorios y APIs conectadas. |
| 6. Ligas y equipos | ✅ Completada | RPCs probadas con `test-league-seeding.ts`. |
| 7. Mercado | ✅ Completada | Reglas de límite y bloqueo probadas con `test-market-rules.ts`. |
| 8. Alineaciones | ✅ Completada | RPC `save_lineup` y tests superados. |
| 9. Scoring persistente | ✅ Completada | Script de persistencia, APIs y tests de idempotencia/aislamiento. |
| 10. UI persistente | ✅ Completada | Refactorización visual base y test de bloqueo superado. |
| 11. Integración 26/27 | ✅ Completada | Ingesta de 4 competiciones. Resolver v2. Despliegue en Vercel. |
| 12. Rediseño y Features | ✅ Completada | Sidebar, Dashboard, Results, mercado diario, modal de stats, alineaciones masivas y mercado dinámico. |
| 13. Automatización | ✅ Completada | Workflow diario en GitHub Actions con check, ingesta, scores y mercado. Cache de ingesta. |
| 14. Social & UX | ⏳ Pendiente | Feedback beta: nombres de liga, enlaces directos, filtro de grupo en mercado, resumen de liga, alineación visual, iconos y camisetas. |
| 15. Mecánicas avanzadas | ⏳ Pendiente | Clausulazos. Requiere cambios en BD y RPC nueva. Post-beta. |

## Implementado

### Dominio y scoring
- Contratos tipados para todas las entidades.
- `ScoringSystemV1` versionado (`v1`).
- API de scoring devuelve `breakdown` y valida que la temporada pertenezca a la competición.

### Autenticación y perfiles
- Supabase Auth con email/contraseña.
- Perfil con `username` único y trigger automático.
- Configuración de Auth para producción (URLs de redirección).

### Esquema Supabase
- Tablas, RLS y RPCs para ligas, transferencias y alineaciones.
- Restricciones de límite de plantilla (14) y bloqueo estricto temporal (`now() >= starts_at`).
- RPC `save_lineup` con validación de composición exacta (1/1/2/2/1) y bloqueo por jornada.
- Soporte multi-grupo con `group_name` en `teams`, `rounds` y `matches`.
- Tabla `team_standings` para clasificaciones reales.
- FKs `fk_matches_home_team` y `fk_matches_away_team` para habilitar JOINs nativos de PostgREST.

### Ingesta y catálogo
- Scripts de ingesta idempotentes.
- **TeamAliasResolver v2:** `resolveJornada` con containment bidireccional y asignación greedy.
- **Normalización de grupos:** `normalizeGroupName` detecta nombres de patrocinadores ("Alcudia", "Egido", "Herce", "Renovak") y los reasigna al grupo canónico del equipo.
- **Escudo anti-duplicados:** Detecta equipos con partido en la misma jornada y omite duplicados. Funciona también con partidos servidos desde cache.
- **Cache de ingesta:** `ingest-matches.ts` precarga partidos existentes y sus stats. Los partidos `COMPLETED` con stats no se vuelven a descargar (flag `--force-refresh` para desactivar).
- **Script `check-new-matches.ts`:** 4 HTTP calls a DataProject para detectar partidos nuevos. Escribe `has_new` a `GITHUB_OUTPUT`.
- **Script `calculate-market-values.ts`:** Fórmula dinámica con paginación de Supabase (`.range()`).
- Repositorios tipados con propiedades camelCase.

### Scoring y Clasificación
- Servicio `scoring-persistence.service.ts` que calcula y persiste `player_match_scores`, `player_round_scores` y `fantasy_scores`.
- Script `calculate-scores.ts` que busca temporadas activas dinámicamente.
- API `/api/league-ranking` y `/api/league-scores` para consultar datos reales sin recálculo.
- **Standings RFEVB:** Extracción de 18 métricas, ingesta en `team_standings`, API `/api/standings` y UI en `/results`.
- Test `test-scoring-persistence.ts` verifica idempotencia y aislamiento.

### Mercado dinámico
- Fórmula: `1 + (pts_totales * 0.07) + min(media_pts * 0.3, 5)`. Piso 1M, techo 20M.
- Se ejecuta automáticamente tras `calculate:scores` en el workflow diario.
- Se escribe en `player_market_values` para la última jornada con stats.
- `/api/competition-roster` lee de la última jornada con precios (agrega precios de todos los grupos de esa jornada).
- UI muestra `pts · PJ` en cada tarjeta.

### Automatización (Fase 13)
- Workflow `.github/workflows/daily-ingest.yml` con Node 22.
- Ejecución diaria a las 06:00 Europe/Madrid (cron `0 6 * * *`) o manual vía `workflow_dispatch`.
- Flujo: `check:new-matches` → ingest matches → ingest standings → `calculate:scores` → `calculate:market`.
- `calculate:scores` y `calculate:market` se ejecutan siempre (idempotentes).
- `ingest-standings` usa `continue-on-error: true`.
- Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`. Node 22 requerido por `@supabase/supabase-js`.

### Frontend y Despliegue
- **Navegación:** Sidebar global con fondo claro. Dashboard refactorizado.
- `/dashboard`: Gestión de ligas dinámica.
- `/fantasy`: Agrupación de jornadas por número. Candado de bloqueo por fecha del primer partido.
- **Mercado Diario:** Rotación de 14 jugadores usando semilla de fecha.
- **Modal de Estadísticas:** `PlayerStatsModal.tsx` con desglose fantasy y stats reales por jornada.
- **Alineaciones Futuras:** Guardado masivo con `Promise.all`. Borrador en `localStorage` cuando no hay jornadas futuras, con feedback visual claro (botón ámbar "Borrador guardado", verde "¡Guardado!").
- `/results`: Clasificación real y lista de partidos agrupada por `group_name`.
- **Despliegue en Vercel:** CI/CD configurado desde GitHub.

## Deuda técnica conocida

- **Feedback beta pendiente (Fase 14):** Los testers han reportado mejoras de UX/features (ver `docs/plan.md`, Fases 14 y 15). Algunas afectan a la integridad del juego (partidos retrasados no aparecen en la vista de liga), otras son quick wins (nombres de liga, enlaces directos) y otras son mecánicas complejas (clausulazos) que se implementarán post-beta.
- **Duplicidad en el cálculo de puntuaciones:** La API `/api/fantasy-round-scores` y el servicio `fantasy-round-score.service.ts` tienen implementaciones paralelas. Se intentó unificar y se revirtió por divergencias. Aceptado como deuda técnica consciente.
- **Jornadas futuras:** Las jornadas 7+ no existen hasta que DataProject las publique. La UI maneja la ausencia con borradores locales. Decisión: NO inventar fechas.
- **Falsos positivos del check:** Los partidos que el escudo omite (7 históricos) aparecen como "nuevos" en cada ejecución. Aceptable (~1 min/día extra). Si se vuelve frecuente, implementar tabla `excluded_matches`.
- **Cache con escudo (edge case):** Si un partido se borra manualmente y el siguiente run lo descarga antes que el "legítimo", el escudo puede no detectarlo en ese momento. Mitigado con el fix de cache (registrar equipos en `teamsInThisRound`) y con borrado manual si aparece.
- **Partidos aplazados:** Si un partido de J1 se juega en J5, DataProject lo muestra en ambas pestañas. El escudo lo mete en la primera y omite la segunda.
- **Rediseño UI Fantasy:** Las pestañas de alineación, mercado y clasificación mantienen el estilo de color antiguo.
- **Bloqueo en ligas multi-grupo:** El candado se activa con la fecha del primer partido del grupo más madrugador.
- **Cruce de jugadores:** Quedan ~150 estadísticas sin emparejar en las actas (Unknown Player o fichajes de última hora).
- **Node 22 requerido:** `@supabase/supabase-js` 2.119 requiere Node 22+ por WebSocket nativo. Documentado en el workflow y en `DEVELOPMENT.md`.
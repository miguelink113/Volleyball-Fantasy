# Estado del proyecto

## Resumen

Las fases 1 a 11 están **completadas y verificadas** mediante ejecuciones reproducibles. El proyecto dispone de un dominio tipado, un sistema de puntuación versionado, persistencia en Supabase, ingesta idempotente del catálogo deportivo, repositorios de lectura, gestión de ligas, mercado de fichajes, guardado de alineaciones, persistencia de puntuaciones y clasificación privada.

Durante la Fase 11, se completó la ingesta de la temporada 2026/27. Se ha implementado un avanzado `TeamAliasResolver` (con containment y asignación greedy) que ha resuelto casi la totalidad de los nombres dispares entre actas y rosters. Además, la UI se ha adaptado para agrupar jornadas de competiciones multi-grupo. La aplicación está desplegada en producción en Vercel con Supabase Auth configurado.

Actualmente el proyecto se encuentra en la **Fase 12**. Se han completado el rediseño de navegación (Sidebar/Dashboard), la vista de resultados (`/results`), el mercado diario rotativo (14 jugadores), el modal de estadísticas por jugador, la gestión masiva de alineaciones y la limpieza profunda de la base de datos con re-ingesta completa. Falta implementar los valores de mercado dinámicos y unificar el rediseño visual de la vista de Fantasy.

| Entidad | Registros (25/26) | Registros (26/27) |
| --- | ---: | ---: |
| Equipos | 94 | 96 |
| Jugadores | 1.449 | 1.388 |
| Partidos | 1.045 | 266 |
| Estadísticas de jugador | 25.262 | 6.368 |

La tabla `player_market_values` contiene valores sembrados para todos los jugadores en todas las jornadas. La tabla `team_standings` contiene las clasificaciones reales de las 4 competiciones.

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
| 11. Integración 26/27 | ✅ Completada | Ingesta de 4 competiciones exitosa. Resolver de equipos v2 implementado. Desplegado en Vercel. |
| 12. Rediseño y Features | ⏳ En progreso | Mercado dinámico pendiente. Resultados, mercado rotativo, modal de stats y alineaciones masivas completados. |
| 13. Automatización | ⏳ Pendiente | Cron jobs, migraciones controladas. |

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
- Restricciones de límite de plantilla (14) y bloqueo estricto temporal por jornada (`now() >= starts_at`).
- RPC `save_lineup` que valida pertenencia de jugadores, composición exacta (1/1/2/2/1) y bloqueo por jornada.
- Soporte multi-grupo con la columna `group_name` en `teams`, `rounds` y `matches`.
- Tabla `team_standings` para persistir la clasificación real de los equipos.

### Ingesta y catálogo
- Scripts de ingesta idempotentes.
- **TeamAliasResolver v2:** Contiene lógica de `resolveJornada` con containment bidireccional y asignación greedy sin restricción 1-a-1.
- **Normalización de grupos:** La función `normalizeGroupName` en `ingest-matches.ts` detecta nombres de patrocinadores usados por DataProject en las pestañas ("Alcudia", "Egido", "Herce", "Renovak") y los reasigna al grupo canónico del equipo. Previene la creación de rondas fantasma y los partidos duplicados.
- **Escudo anti-duplicados:** Detecta si un equipo ya tiene un partido en la misma jornada y omite duplicados causados por aplazamientos.
- Pre-paso de caché en la ingesta de partidos para leer la jornada oficial desde la página de stats.
- Registro automático del nombre real de las competiciones y desmarcado de temporadas antiguas (`is_current`).
- Repositorios tipados con propiedades camelCase.

### Scoring y Clasificación
- Servicio `scoring-persistence.service.ts` que calcula y persiste `player_match_scores`, `player_round_scores` y `fantasy_scores`.
- Script `calculate-scores.ts` para ejecutar el cálculo de forma masiva buscando dinámicamente temporadas activas.
- API `/api/league-ranking` y `/api/league-scores` para consultar los datos reales sin recálculo.
- **Standings RFEVB:** Extracción de 18 métricas e ingesta en `team_standings`. API `/api/standings` y UI (`/results`).
- Test `test-scoring-persistence.ts` que verifica la idempotencia y el aislamiento entre ligas.

### Frontend y Despliegue
- **Navegación:** Sidebar global con fondo claro. Dashboard refactorizado.
- `/fantasy`: Agrupación inteligente de jornadas por número. Candado de bloqueo calculado a partir de la fecha del primer partido.
- **Mercado Diario:** Rotación de 14 jugadores usando semilla de fecha.
- **Modal de Estadísticas:** `PlayerStatsModal.tsx` para consultar puntos y stats reales por jornada.
- **Alineaciones Futuras:** Guardado masivo en todas las rondas no bloqueadas. Si no hay jornadas futuras (DataProject no ha publicado el calendario), se guarda un borrador en `localStorage` con feedback visual claro (botón ámbar "Borrador guardado").
- `/results`: Vista con clasificación real y lista de partidos por jornada agrupada por `group_name`.
- **Despliegue en Vercel:** CI/CD configurado desde GitHub.
- CI configurado en GitHub Actions (TypeScript, tests y build).

## Deuda técnica conocida

- **Duplicidad en el cálculo de puntuaciones:** La API `/api/fantasy-round-scores` y el servicio `fantasy-round-score.service.ts` contienen implementaciones paralelas. Se intentó unificar en el Sprint de Refactorización, pero se revirtió al detectar divergencias numéricas. No causa bugs actualmente (la UI y la BD coinciden), pero requiere reconciliación profunda antes de futuros cambios en la fórmula. Aceptado como deuda técnica consciente.
- **Jornadas futuras:** Las jornadas 7 en adelante no existen en la BD hasta que DataProject las publique. La UI maneja este caso con borradores en `localStorage`. Decisión: NO inventar fechas falsas para evitar ensuciar la BD.
- **Partidos aplazados:** Si un partido de J1 se aplaza y se juega en J5, DataProject lo muestra en ambas pestañas. El escudo anti-duplicados lo mete en J1 y lo omite en J5. Es un caso raro que no afecta a la temporada regular.
- **Valores de mercado dinámicos:** Actualmente estáticos (10M). Falta implementar la fórmula de fluctuación según rendimiento.
- **Rediseño UI Fantasy:** Las pestañas de alineación, mercado y clasificación mantienen el estilo de color antiguo.
- **Bloqueo en ligas multi-grupo:** Actualmente, si el Grupo A juega el viernes y el Grupo B el domingo, el candado se activa el viernes para todos.
- **Cruce de jugadores:** Quedan ~150 estadísticas sin emparejar en las actas (Unknown Player o fichajes de última hora).
- **Automatización:** La ingesta y el cálculo de puntuaciones se ejecutan manualmente; el despliegue requiere tareas programadas (Cron).
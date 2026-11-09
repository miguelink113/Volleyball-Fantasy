# Plan maestro de implementación

## Objetivo y alcance

Completar un MVP para la temporada 2026/27, pensado para el propietario y un grupo pequeño de amigos en ligas privadas.

La solución mantiene separadas la fuente RFEVB, la normalización, el dominio, la persistencia Supabase y la presentación. Debe permitir incorporar nuevas temporadas y competiciones sin acoplar la interfaz a la estructura de origen.

## Estado

### Completado (Fases 1 a 11)

1. **Dominio:** contratos tipados para competición, temporada, equipo, jugador, partido, estadísticas, jornada, fantasy y scoring. TypeScript estricto y contratos del dominio en camelCase.
2. **Scoring:** `ScoringSystemV1` definido según los datos disponibles, probado e integrado en el cálculo de puntuaciones.
3. **Persistencia:** esquema Supabase con tablas, relaciones, restricciones, índices, RLS y RPC para operaciones fantasy.
4. **Verificación remota:** `npm run test:supabase:schema` verifica el esquema remoto esperado sin modificar la base.
5. **Ingesta del catálogo:** scripts idempotentes para competiciones, temporadas, equipos, jugadores, jornadas, partidos y estadísticas. Con soporte multi-grupo.
6. **Resolución de alias:** normalización y resolución de nombres de equipos de roster y actas.
7. **Mercado inicial:** `player_market_values` sembrada con 10M para todos los jugadores en todas las jornadas.
8. **Repositorios:** capa `lib/repositories/` que consulta Supabase y devuelve entidades de dominio tipadas.
9. **Migración de lectura:** `/api/competition-roster` y `/api/fantasy-round-scores` utilizan Supabase y los repositorios.
10. **Frontend fantasy:** `/fantasy` utiliza UUIDs de Supabase, precios persistidos y una única petición para las puntuaciones. UI 100% dinámica.
11. **Ligas y equipos (Fase 6):** RPCs de creación, unión y salida; inicialización de equipo y presupuesto.
12. **Mercado y transferencias (Fase 7):** compra/venta con validación de límites y bloqueo estricto por jornada.
13. **Alineaciones (Fase 8):** RPC `save_lineup` con validación de composición y bloqueo temporal.
14. **Scoring persistente (Fase 9):** servicio de cálculo, persistencia idempotente y API de ranking privado.
15. **UI persistente (Fase 10):** Refactorización visual (Login/Dashboard/Fantasy), sin IDs hardcodeados, bloqueos estrictos en backend y tests comprobados.
16. **Integración end-to-end (Fase 11):** Flujo completo probado con usuarios. Ingesta completa de la temporada 26/27. Refactorización de `TeamAliasResolver` para evitar omisiones de partidos. UI adaptada para competiciones con múltiples grupos. Despliegue en producción (Vercel) y Supabase Auth configurado.

### Estado del catálogo persistido

| Entidad | Registros (25/26) | Registros (26/27) |
| --- | ---: | ---: |
| Equipos | 94 | 96 |
| Jugadores | 1.449 | 1.388 |
| Partidos | 1.045 | 266 |
| Estadísticas de jugador | 25.262 | 6.368 |

Las cuatro competiciones de la temporada 2025/26 y 2026/27 están incluidas. La UI oculta las temporadas inactivas mediante el flag `is_current`.

## Decisiones vigentes

- Autenticación mediante email y contraseña; perfil con `username`, sin `full_name` ni Google OAuth.
- El equipo se llama automáticamente `Equipo de <username>` y no puede renombrarse.
- Cada liga privada referencia una sola competición y temporada.
- RFEVB se conserva como fuente de ingesta; las rutas de producto migradas leen los datos persistidos.
- Las respuestas de los repositorios utilizan entidades de dominio con propiedades camelCase.
- Posiciones normalizadas: `setter`, `opposite`, `outside`, `middle`, `libero` y `unknown`.
- Los sets de un partido pueden ser `null`; los estados son `SCHEDULED`, `IN_PROGRESS`, `COMPLETED` y `POSTPONED`.
- La plantilla admite como máximo 14 jugadores.
- Una alineación puede tener hasta siete jugadores; para puntuar debe tener siete y cumplir la composición `1/1/2/2/1`.
- No hay capitán ni ranking global. La clasificación se limita a cada liga.
- Las jornadas utilizan un bloqueo estricto basado en `startsAt`. Las RPCs bloquean alineaciones y transferencias en el backend en cuanto comienza la jornada (`now() >= starts_at`).
- La creación y entrada en liga deben ser atómicas e inicializar un equipo.
- Si el propietario abandona, la propiedad pasa al miembro restante más antiguo; si es el único miembro, la liga se elimina.
- Las mutaciones sensibles se validan en el servidor y la base de datos, no solo en la interfaz.
- No se incluyen pagos, ligas públicas, mercado entre participantes ni chat.
- **Manejo de grupos:** Para el backend, los grupos se tratan como jornadas independientes (ej. Jornada 1 - Grupo A). Para la UI fantasy, las jornadas se agrupan por `round_number` para que todos los jugadores compitan bajo una misma "Jornada 1".
- **Despliegue:** Frontend alojado en Vercel; base de datos en Supabase. CI/CD automático desde GitHub.

## Fases 1 a 10 — Completadas ✅

- **Fase 1 — Dominio tipado:** contratos completos y tests pasando.
- **Fase 2 — Sistema de puntuación V1:** `ScoringSystemV1` con fórmula documentada y probada.
- **Fase 3/3A — Modelo Supabase y verificación remota:** esquema sincronizado y verificado.
- **Fase 4 — Ingesta idempotente RFEVB:** scraper, mappers y resolución de alias.
- **Fase 5 — Catálogo persistente:** repositorios y migración de APIs y UI.
- **Fase 6 — Ligas y equipos fantasy:** RPCs probadas y flujos funcionales.
- **Fase 7 — Mercado y transferencias:** reglas de negocio validadas en base de datos.
- **Fase 8 — Alineaciones y bloqueo:** RPC `save_lineup`, validación de composición y bloqueo temporal probados.
- **Fase 9 — Scoring persistente y ranking privado:** Servicio `scoring-persistence`, APIs de lectura y tests de aislamiento e idempotencia.
- **Fase 10 — UI persistente:** Datos 100% dinámicos en frontend, gestión completa persistente y comprobación de bloqueos temporales a través de `test:lockout`.

## Fase 11 — Integración end-to-end ✅

Probar con varios usuarios el ciclo completo:
- Registro e inicio de sesión.
- Creación y unión a ligas.
- Inicialización del equipo fantasy.
- Mercado y transferencias.
- Selección y bloqueo de alineaciones.
- Ingesta y puntuación.
- Clasificación privada.
- **Mejorar `TeamAliasResolver`** para evitar omisiones de partidos por discrepancias de nombres.
- **Despliegue y Auth:** Configuración de Vercel y Supabase en producción.

## Fase 12 — Refinamiento de Producto y Rediseño UI ✅

### Funcionalidades nuevas
- [x] **Clasificaciones:** Scraper de DataProject, migración de `team_standings` y UI integrada en `/results`.
- [x] **Partidos en `/results`:** Vista de resultados de los partidos por jornada.
- [x] **Mercado diario rotativo:** 14 jugadores con cuotas por posición (2/2/4/4/2) y helper `lib/utils/round-label.ts`.
- [x] **Modal de estadísticas por jugador:** `PlayerStatsModal` con desglose fantasy y stats reales por jornada.
- [x] **Alineaciones masivas:** Guardado en todas las jornadas futuras con borrador local cuando no hay jornadas futuras.
- [x] **Navegación global:** Sidebar y Dashboard refactorizados.
- [x] **Valores de mercado dinámicos:** Fórmula `1 + (pts * 0.07) + min(media * 0.3, 5)`, piso 1M, techo 20M. Se recalcula tras cada ingesta.
- [x] **Limpieza profunda de BD:** Re-ingesta completa (266 partidos limpios, sin rondas fantasma). Escudo anti-duplicados + `normalizeGroupName`.

### Refinamiento (Deuda técnica y UI)
- **Rediseño visual (Desktop-First):** La pantalla de `/fantasy` mantiene el estilo de color antiguo (violetas y verdes). Pendiente unificar con la paleta del Sidebar/Dashboard.

### Pendiente de corregir (feedback beta)

- [ ] **Partidos retrasados no aparecen en la vista de liga:** Los partidos que se aplazaron o adelantaron a otra jornada no se muestran en la vista de equipo. Probablemente el frontend filtra por `round_id` exacto en lugar de por `round_number` como hace el mercado. **Severidad: Alta.** Afecta a la integridad de las puntuaciones.
- [ ] **Filtro por grupo en `/results` (SV2):** Al seleccionar un grupo (A, B, C) en la lista de partidos, debería filtrarse igual que la tabla de clasificación. Actualmente salen todos mezclados. **Severidad: Media.**

## Fase 13 — Despliegue Final y Automatización ✅

- [x] **Automatización (Cron):** Workflow `.github/workflows/daily-ingest.yml` con Node 22. Ejecución diaria a las 06:00 Europe/Madrid. Flujo: check → ingest matches → ingest standings → calculate scores → calculate market.
- [x] **Script `check-new-matches.ts`:** 4 HTTP calls a DataProject para detectar partidos nuevos.
- [x] **Script `calculate-market-values.ts`:** Fórmula dinámica con paginación de Supabase (`.range()` para >1000 filas).
- [x] **Cache de ingesta:** `ingest-matches.ts` evita descargar stats de partidos ya completados en BD. Reduce la ingesta de ~15 min a ~2 min.
- [x] **Escudo anti-duplicados con cache:** Los partidos servidos desde cache también registran sus equipos en `teamsInThisRound`.
- [x] **Verificación de producción:** RLS, permisos y rendimiento validados.
- [x] **Migraciones controladas:** FKs de `matches` aplicadas (`fk_matches_home_team`, `fk_matches_away_team`).

## Fase 14 — Social & UX (Sprint de feedback beta) ⏳

Mejoras de experiencia de usuario derivadas del feedback de los beta testers.

### Quick wins (bajo esfuerzo, alto impacto)
- [ ] **Nombres de liga personalizados + miembros visibles:** Permitir poner un nombre descriptivo al crear la liga (ej. "SVM 2026 - Los Cracks") y mostrar el listado de miembros en el dashboard sin entrar a cada liga. Requiere modificar la RPC `create_private_league` para aceptar un nombre.
- [ ] **Enlaces directos para compartir ligas:** Generar un link tipo `/dashboard?join_code=ABC123` que al abrirlo ejecute automáticamente la RPC `join_private_league`. Mucho más fácil que pasar el código a mano.
- [ ] **Filtro por grupo en el mercado:** Para Superliga 2 (M y F), añadir un selector A/B/C que filtre los jugadores del mercado (junto a los filtros de posición y equipo ya existentes).
- [ ] **Iconos/imágenes de equipos:** Mostrar el `logoUrl` de cada equipo en las tarjetas del mercado, plantilla y resultados.

### Resumen de liga y visualización
- [ ] **Widget de resumen de la liga:** Bloque en el dashboard que muestre: líder actual, MVP de la última jornada (jugador que más puntuó entre los alineados de la liga), mejor entrenador de la jornada. Requiere una nueva API `/api/league-summary`.
- [ ] **Ver equipos de los demás:** Añadir pestaña o modal en `/fantasy` que permita ver la plantilla y alineación de otros miembros de la liga (después del cierre de la jornada).
- [ ] **Interfaz de alineación visual:** Sustituir la lista plana de titulares por una pista de voleibol con posiciones. Zona de banquillo para suplentes. Requiere repensar el componente `FantasyTeamBuilder`.
- [ ] **Camisetas con dorsal, nombre y equipo:** Tarjetas de jugador con un componente visual de camiseta. Solo en `/fantasy` (alineación y mercado).

### Estimación y dependencias
- **Quick wins:** 1-2 días de desarrollo. Sin cambios en base de datos (excepto RPC de ligas).
- **Resumen + visualización:** 3-4 días. Requiere nuevo endpoint y refactor de `FantasyTeamBuilder`.

## Fase 15 — Mecánicas avanzadas (post-beta) ⏳

Mecánicas de juego que requieren cambios profundos en la base de datos y la lógica de negocio. Se implementan cuando la temporada esté consolidada y haya usuarios activos.

- [ ] **Clausulazos:** Permitir a un manager pagar `valor_mercado * 1.25` para robar un jugador a otro equipo de su misma liga, siempre que hayan pasado X jornadas desde que lo fichó el propietario original.
    - Requiere: nueva columna `acquired_at_round` en `fantasy_team_players`, nueva RPC `pay_clause` con validaciones (presupuesto, antigüedad, exclusividad por liga) y nueva UI en el mercado/plantilla del rival.
    - Impacto en el mercado: al robar un jugador, el precio de mercado del jugador sube (inflación por demanda).
    - **Severidad: Baja.** Es una mecánica de "nice to have". No bloquea el juego.

## Prioridad recomendada (orden de ataque)

| Prioridad | Item | Fase | Motivo |
| :--- | :--- | :--- | :--- |
| **P0** | Bug: partidos retrasados no aparecen | 12 | Rompe la experiencia principal |
| **P1** | Bug: filtro por grupo en `/results` | 12 | Confunde a los usuarios en SV2 |
| **P1** | Nombres de liga personalizados | 14 | Muy visible, muy barato |
| **P1** | Enlaces directos para compartir | 14 | Reduce fricción de onboarding |
| **P2** | Filtro por grupo en el mercado | 14 | Mejora búsqueda |
| **P2** | Iconos/imágenes de equipos | 14 | Polish visual |
| **P2** | Resumen de liga (widget) | 14 | Engancha y da contexto |
| **P3** | Ver equipos de los demás | 14 | Diversión social |
| **P3** | Interfaz de alineación visual | 14 | Gran impacto, gran esfuerzo |
| **P3** | Camisetas de jugador | 14 | Cosmético |
| **P4** | Clausulazos | 15 | Mecánica compleja, post-beta |

## Lista de cierre previa (Verificada)

- [x] Fase 1: `npm run test:domain` y `npm run build` pasan.
- [x] Fase 2: fórmula revisada contra `docs/SCORING.md`; confirmada la utilización de `ScoringSystemV1`.
- [x] Fase 3/3A: migraciones SQL revisadas; `npm run test:supabase:schema` pasa; las mutaciones tienen pruebas separadas.
- [x] Fase 4: `npm run test:ingestion-mappers` y `npm run test:team-alias-resolver` pasan; una segunda ingesta no duplica registros.
- [x] Fase 5: `npm run test:repositories` pasa; endpoints de roster y puntuaciones verificados.
- [x] Fase 6: pruebas con dos usuarios de crear/unirse/salir, inicialización del equipo, presupuesto, selección inicial, sucesión de propietario y aislamiento.
- [x] Fase 7: compra y venta, saldo, límite de 14, exclusividad, temporada/competición, jornada bloqueada, concurrencia y rollback probados.
- [x] Fase 8: RPC `save_lineup` validando plantilla, composición 1/1/2/2/1 y bloqueo temporal probados (`npm run test:lineup-rules`).
- [x] Fase 9: `npm run test:scoring-persistence` verifica idempotencia y aislamiento.
- [x] Fase 10: `npm run test:lockout` verifica los bloqueos de backend mediante el timestamp `starts_at`. UI completamente dinámica.
- [x] Fase 11: Ingesta 26/27 completada. `TeamAliasResolver` v2 resolviendo >99% de equipos. UI unificada para multi-grupo. Despliegue exitoso en Vercel.
- [x] Fase 12: Rediseño UI, mercado diario, modal de stats, alineaciones masivas y mercado dinámico completados.
- [x] Fase 13: Automatización con GitHub Actions completada y verificada end-to-end.
- [x] Todos los tests pertinentes y `npm run build` pasan en el mismo commit.

## Calidad y validación

- Inspeccionar el código existente y reutilizar dominio, scraper y servicios.
- Mantener TypeScript estricto; no utilizar `any` ni deshabilitar comprobaciones para ocultar errores.
- Actualizar la documentación al cerrar cada fase.
- Ejecutar los tests relevantes y `npm run build`; ejecutar lint si está disponible.
- Usar `npm run test:supabase:schema` como verificación de solo lectura del esquema remoto.
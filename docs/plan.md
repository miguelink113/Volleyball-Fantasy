# Plan maestro de implementación

## Objetivo y alcance

Completar un MVP para la temporada 2026/27, pensado para el propietario y un grupo pequeño de amigos en ligas privadas.

La solución mantiene separadas la fuente RFEVB, la normalización, el dominio, la persistencia Supabase y la presentación. Debe permitir incorporar nuevas temporadas y competiciones sin acoplar la interfaz a la estructura de origen.

## Estado

### Completado (Fases 1 a 10)

1. **Dominio:** contratos tipados para competición, temporada, equipo, jugador, partido, estadísticas, jornada, fantasy y scoring. TypeScript estricto y contratos del dominio en camelCase.
2. **Scoring:** `ScoringSystemV1` definido según los datos disponibles, probado e integrado en el cálculo de puntuaciones.
3. **Persistencia:** esquema Supabase con tablas, relaciones, restricciones, índices, RLS y RPC para operaciones fantasy.
4. **Verificación remota:** `npm run test:supabase:schema` verifica el esquema remoto esperado sin modificar la base.
5. **Ingesta del catálogo:** scripts idempotentes para competiciones, temporadas, equipos, jugadores, jornadas, partidos y estadísticas. Con soporte multi-grupo.
6. **Resolución de alias:** normalización y resolución de nombres de equipos de roster y actas.
7. **Mercado inicial:** `player_market_values` sembrada con 9M para todos los jugadores en todas las jornadas.
8. **Repositorios:** capa `lib/repositories/` que consulta Supabase y devuelve entidades de dominio tipadas.
9. **Migración de lectura:** `/api/competition-roster` y `/api/fantasy-round-scores` utilizan Supabase y los repositorios.
10. **Frontend fantasy:** `/fantasy` utiliza UUIDs de Supabase, precios persistidos y una única petición para las puntuaciones. UI 100% dinámica.
11. **Ligas y equipos (Fase 6):** RPCs de creación, unión y salida; inicialización de equipo y presupuesto.
12. **Mercado y transferencias (Fase 7):** compra/venta con validación de límites y bloqueo estricto por jornada.
13. **Alineaciones (Fase 8):** RPC `save_lineup` con validación de composición y bloqueo temporal.
14. **Scoring persistente (Fase 9):** servicio de cálculo, persistencia idempotente y API de ranking privado.
15. **UI persistente (Fase 10):** Refactorización visual (Login/Dashboard/Fantasy), sin IDs hardcodeados, bloqueos estrictos en backend y tests comprobados.

### Estado del catálogo persistido

| Entidad | Registros (25/26) |
| --- | ---: |
| Equipos | 94 |
| Jugadores | 1.449 |
| Partidos | 1.045 |
| Estadísticas de jugador | 25.262 |

Las cuatro competiciones de la temporada 2025/26 están incluidas.

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
- No se incluyen pagos, ligas públicas, mercado entre participantes, chat ni automatización del scraper.

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

## Fase 11 — Integración end-to-end

Probar con varios usuarios el ciclo completo:
- Registro e inicio de sesión.
- Creación y unión a ligas.
- Inicialización del equipo fantasy.
- Mercado y transferencias.
- Selección y bloqueo de alineaciones.
- Ingesta y puntuación.
- Clasificación privada.
- **Mejorar `TeamAliasResolver`** para evitar omisiones de partidos por discrepancias de nombres.

## Fase 12 — Despliegue

- Separar las variables públicas de los secretos.
- Aplicar migraciones de forma controlada.
- Configurar Supabase Auth.
- Desplegar primero en staging.
- No publicar claves de servicio ni credenciales PostgreSQL.
- Verificar las operaciones y permisos antes de habilitar producción.

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
- [x] Todos los tests pertinentes y `npm run build` pasan en el mismo commit.

## Calidad y validación

- Inspeccionar el código existente y reutilizar dominio, scraper y servicios.
- Mantener TypeScript estricto; no utilizar `any` ni deshabilitar comprobaciones para ocultar errores.
- Actualizar la documentación al cerrar cada fase.
- Ejecutar los tests relevantes y `npm run build`; ejecutar lint si está disponible.
- Usar `npm run test:supabase:schema` como verificación de solo lectura del esquema remoto.
# Plan maestro de implementación

## Objetivo y alcance

Completar un MVP para la temporada 2026/27, pensado para el propietario y un grupo pequeño de amigos en ligas privadas[cite: 4].

La solución mantiene separadas la fuente RFEVB, la normalización, el dominio, la persistencia Supabase y la presentación[cite: 4]. Debe permitir incorporar nuevas temporadas y competiciones sin acoplar la interfaz a la estructura de origen[cite: 4].

## Estado

### Completado (Fases 1 a 10)

1. **Dominio:** contratos tipados para competición, temporada, equipo, jugador, partido, estadísticas, jornada, fantasy y scoring[cite: 4]. TypeScript estricto y contratos del dominio en camelCase[cite: 4].
2. **Scoring:** `ScoringSystemV1` definido según los datos disponibles, probado e integrado en el cálculo de puntuaciones[cite: 4].
3. **Persistencia:** esquema Supabase con tablas, relaciones, restricciones, índices, RLS y RPC para operaciones fantasy[cite: 4].
4. **Verificación remota:** `npm run test:supabase:schema` verifica el esquema remoto esperado sin modificar la base[cite: 4].
5. **Ingesta del catálogo:** scripts idempotentes para competiciones, temporadas, equipos, jugadores, jornadas, partidos y estadísticas[cite: 4].
6. **Resolución de alias:** normalización y resolución de nombres de equipos de roster y actas[cite: 4].
7. **Mercado inicial:** `player_market_values` sembrada con 9M para todos los jugadores en todas las jornadas[cite: 4].
8. **Repositorios:** capa `lib/repositories/` que consulta Supabase y devuelve entidades de dominio tipadas[cite: 4].
9. **Migración de lectura:** `/api/competition-roster` y `/api/fantasy-round-scores` utilizan Supabase y los repositorios[cite: 4].
10. **Frontend fantasy:** `/fantasy` utiliza UUIDs de Supabase, precios persistidos y una única petición para las puntuaciones.
11. **Ligas y equipos (Fase 6):** RPCs de creación, unión y salida; inicialización de equipo y presupuesto[cite: 4].
12. **Mercado y transferencias (Fase 7):** compra/venta con validación de límites y bloqueo estricto por jornada[cite: 4].
13. **Alineaciones (Fase 8):** RPC `save_lineup` con validación de composición y bloqueo temporal[cite: 4].
14. **Scoring persistente (Fase 9):** servicio de cálculo, persistencia idempotente y API de ranking privado[cite: 4].
15. **UI persistente (Fase 10):** Refactorización dinámica de UI, sin IDs hardcodeados, tests de bloqueo de backend comprobados.

### Estado del catálogo persistido

| Entidad | Registros |
| --- | ---: |
| Equipos | 94 |
| Jugadores | 1.449 |
| Partidos | 1.045 |
| Estadísticas de jugador | 25.262 |

Las cuatro competiciones de la temporada 2025/26 están incluidas[cite: 4].

## Decisiones vigentes

- Autenticación mediante email y contraseña; perfil con `username`, sin `full_name` ni Google OAuth[cite: 4].
- El equipo se llama automáticamente `Equipo de <username>` y no puede renombrarse[cite: 4].
- Cada liga privada referencia una sola competición y temporada[cite: 4].
- RFEVB se conserva como fuente de ingesta; las rutas de producto migradas leen los datos persistidos[cite: 4].
- Las respuestas de los repositorios utilizan entidades de dominio con propiedades camelCase[cite: 4].
- Posiciones normalizadas: `setter`, `opposite`, `outside`, `middle`, `libero` y `unknown`[cite: 4].
- Los sets de un partido pueden ser `null`; los estados son `SCHEDULED`, `IN_PROGRESS`, `COMPLETED` y `POSTPONED`[cite: 4].
- La plantilla admite como máximo 14 jugadores[cite: 4].
- Una alineación puede tener hasta siete jugadores; para puntuar debe tener siete y cumplir la composición `1/1/2/2/1`[cite: 4].
- No hay capitán ni ranking global. La clasificación se limita a cada liga[cite: 4].
- Las jornadas utilizan un bloqueo estricto basado en `startsAt`. Las RPC bloquean alineaciones y transferencias en el backend en cuanto comienza la jornada.
- La creación y entrada en liga deben ser atómicas e inicializar un equipo[cite: 4].
- Si el propietario abandona, la propiedad pasa al miembro restante más antiguo; si es el único miembro, la liga se elimina[cite: 4].
- Las mutaciones sensibles se validan en el servidor y la base de datos, no solo en la interfaz[cite: 4].
- No se incluyen pagos, ligas públicas, mercado entre participantes, chat ni automatización del scraper[cite: 4].

## Fases 1 a 10 — Completadas ✅

- **Fase 1 — Dominio tipado:** contratos completos y tests pasando[cite: 4].
- **Fase 2 — Sistema de puntuación V1:** `ScoringSystemV1` con fórmula documentada y probada[cite: 4].
- **Fase 3/3A — Modelo Supabase y verificación remota:** esquema sincronizado y verificado[cite: 4].
- **Fase 4 — Ingesta idempotente RFEVB:** scraper, mappers y resolución de alias[cite: 4].
- **Fase 5 — Catálogo persistente:** repositorios y migración de APIs y UI[cite: 4].
- **Fase 6 — Ligas y equipos fantasy:** RPCs probadas y flujos funcionales[cite: 4].
- **Fase 7 — Mercado y transferencias:** reglas de negocio validadas en base de datos[cite: 4].
- **Fase 8 — Alineaciones y bloqueo:** RPC `save_lineup`, validación de composición y bloqueo temporal probados[cite: 4].
- **Fase 9 — Scoring persistente y ranking privado:** Servicio `scoring-persistence`, APIs de lectura y tests de aislamiento e idempotencia[cite: 4].
- **Fase 10 — UI persistente:** Datos 100% dinámicos en frontend, gestión completa persistente y comprobación de bloqueos temporales a través de `test:lockout`.

## Fase 11 — Integración end-to-end

Probar con varios usuarios el ciclo completo:
- Registro e inicio de sesión[cite: 4].
- Creación y unión a ligas[cite: 4].
- Inicialización del equipo fantasy[cite: 4].
- Mercado y transferencias[cite: 4].
- Selección y bloqueo de alineaciones[cite: 4].
- Ingesta y puntuación[cite: 4].
- Clasificación privada[cite: 4].

## Fase 12 — Despliegue

- Separar las variables públicas de los secretos[cite: 4].
- Aplicar migraciones de forma controlada[cite: 4].
- Configurar Supabase Auth[cite: 4].
- Desplegar primero en staging[cite: 4].
- No publicar claves de servicio ni credenciales PostgreSQL[cite: 4].
- Verificar las operaciones y permisos antes de habilitar producción[cite: 4].

## Lista de cierre previa (Verificada)

- [x] Fase 1: `npm run test:domain` y `npm run build` pasan[cite: 4].
- [x] Fase 2: fórmula revisada contra `docs/SCORING.md`; confirmada la utilización de `ScoringSystemV1`[cite: 4].
- [x] Fase 3/3A: migraciones SQL revisadas; `npm run test:supabase:schema` pasa; las mutaciones tienen pruebas separadas[cite: 4].
- [x] Fase 4: `npm run test:ingestion-mappers` y `npm run test:team-alias-resolver` pasan; una segunda ingesta no duplica registros[cite: 4].
- [x] Fase 5: `npm run test:repositories` pasa; endpoints de roster y puntuaciones verificados[cite: 4].
- [x] Fase 6: pruebas con dos usuarios de crear/unirse/salir, inicialización del equipo, presupuesto, selección inicial, sucesión de propietario y aislamiento[cite: 4].
- [x] Fase 7: compra y venta, saldo, límite de 14, exclusividad, temporada/competición, jornada bloqueada, concurrencia y rollback probados[cite: 4].
- [x] Fase 8: RPC `save_lineup` validando plantilla, composición 1/1/2/2/1 y bloqueo temporal probados (`npm run test:lineup-rules`)[cite: 4].
- [x] Fase 9: `npm run test:scoring-persistence` verifica idempotencia y aislamiento[cite: 4].
- [x] Fase 10: `npm run test:lockout` verifica los bloqueos de backend mediante el timestamp `starts_at`. UI completamente dinámica.
- [x] Todos los tests pertinentes y `npm run build` pasan en el mismo commit[cite: 4].

## Calidad y validación

- Inspeccionar el código existente y reutilizar dominio, scraper y servicios[cite: 4].
- Mantener TypeScript estricto; no utilizar `any` ni deshabilitar comprobaciones para ocultar errores[cite: 4].
- Actualizar la documentación al cerrar cada fase[cite: 4].
- Ejecutar los tests relevantes y `npm run build`; ejecutar lint si está disponible[cite: 4].
- Usar `npm run test:supabase:schema` como verificación de solo lectura del esquema remoto[cite: 4].
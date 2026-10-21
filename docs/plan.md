# Plan maestro de implementación

## Objetivo y alcance

Completar un MVP para la temporada 2026/27, pensado para el propietario y un grupo pequeño de amigos en ligas privadas.

La solución mantiene separadas la fuente RFEVB, la normalización, el dominio, la persistencia Supabase y la presentación. Debe permitir incorporar nuevas temporadas y competiciones sin acoplar la interfaz a la estructura de origen.

## Estado

### Completado

1. **Dominio:** contratos tipados para competición, temporada, equipo, jugador, partido, estadísticas, jornada, fantasy y scoring. TypeScript estricto y contratos del dominio en camelCase.
2. **Scoring:** `ScoringSystemV1` definido según los datos disponibles, probado e integrado en el cálculo de puntuaciones.
3. **Persistencia:** esquema Supabase con tablas, relaciones, restricciones, índices, RLS y RPC para operaciones fantasy.
4. **Verificación remota:** `npm run test:supabase:schema` verifica el esquema remoto esperado sin modificar la base.
5. **Ingesta del catálogo:** scripts idempotentes para competiciones, temporadas, equipos, jugadores, jornadas, partidos y estadísticas.
6. **Resolución de alias:** normalización y resolución de nombres de equipos de roster y actas.
7. **Mercado inicial:** `player_market_values` sembrada con 9M para todos los jugadores en todas las jornadas.
8. **Repositorios:** capa `lib/repositories/` que consulta Supabase y devuelve entidades de dominio tipadas.
9. **Migración de lectura:** `/api/competition-roster` y `/api/fantasy-round-scores` utilizan Supabase y los repositorios.
10. **Frontend fantasy:** `/fantasy` utiliza UUIDs de Supabase, precios persistidos y una única petición para las puntuaciones de todas las jornadas.

### Estado del catálogo persistido

| Entidad | Registros |
| --- | ---: |
| Equipos | 94 |
| Jugadores | 1.449 |
| Partidos | 1.045 |
| Estadísticas de jugador | 25.262 |

Las cuatro competiciones de la temporada 2025/26 están incluidas: Superliga Masculina, Superliga Femenina, Superliga 2 Masculina y Superliga 2 Femenina.

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
- Las jornadas utilizan `startsAt` y `endsAt` para bloquear alineaciones y transferencias durante el intervalo.
- La creación y entrada en liga deben ser atómicas e inicializar un equipo.
- Si el propietario abandona, la propiedad pasa al miembro restante más antiguo; si es el único miembro, la liga se elimina.
- Las mutaciones sensibles se validan en el servidor y la base de datos, no solo en la interfaz.
- No se incluyen pagos, ligas públicas, mercado entre participantes, chat ni automatización del scraper.

## Fase 3A — Verificación remota de Supabase y documentación ✅

Completada.

- Ejecutar `npm run test:supabase:schema` contra el proyecto remoto.
- Verificar tablas, columnas, tipos, relaciones, restricciones, índices, RLS, políticas y permisos RPC.
- Corregir las discrepancias detectadas en la comparación del esquema.
- Mantener la prueba en modo de solo lectura.
- Sincronizar la documentación con el esquema realmente desplegado.

**Criterio de salida:** la prueba remota confirma que el proyecto tiene el modelo esperado.

## Fase 4 — Ingesta idempotente RFEVB ✅

Completada.

- Mantener el scraper RFEVB como fuente de datos.
- Implementar mappers explícitos entre los DTO del scraper, el dominio y la persistencia.
- Validar los identificadores `rfevb_id`.
- Implementar `scripts/ingest/ingest-roster.ts`.
- Aplicar upserts idempotentes para evitar duplicados.
- Aislar el cliente administrativo en `lib/supabase/admin.server.ts`.
- Verificar los conteos de equipos y jugadores contra RFEVB.
- Crear y validar el servicio `TeamAliasResolver` y la tabla `team_source_aliases`.

**Criterio de salida:** el catálogo se puede ingerir repetidamente sin duplicar registros ni mezclar temporadas.

## Fase 5 — Catálogo persistente ✅

Completada.

### Fase 5.1 — Ingesta de partidos y estadísticas ✅

El script `scripts/ingest/ingest-matches.ts` ingiere jornadas, partidos y estadísticas de jugador.

- Upserts idempotentes para jornadas, partidos y estadísticas.
- Fechas de jornadas derivadas de las fechas reales de los partidos.
- Conversión de Europe/Madrid a UTC con manejo de horario de verano.
- Cruce de jugadores de acta con el roster por nombre y dorsal como alternativa.
- Posición obtenida del roster.
- Registro de aliases de actas sin sobrescribir los aliases existentes del roster.

### Fase 5.2 — Valores iniciales del mercado ✅

- Sembrar `player_market_values` con 9M para todos los jugadores y todas las jornadas.
- Consultar los valores mediante la capa de repositorios.
- Mostrar los precios persistidos en la interfaz fantasy.

### Fase 5.3 — Repositorios de lectura ✅

Crear `lib/repositories/` con consultas tipadas para:

- Equipos.
- Jugadores.
- Jornadas.
- Partidos.
- Estadísticas de jugador por partido.
- Valores de mercado.

Los repositorios aíslan Supabase y devuelven entidades de dominio con propiedades camelCase. La capa cuenta con un test de integración.

### Fase 5.4 — Migración de la UI y las APIs ✅

- Migrar `/api/competition-roster` a lecturas desde Supabase.
- Migrar `/api/fantasy-round-scores` a lecturas desde Supabase.
- Calcular las puntuaciones de todas las jornadas en una sola petición utilizando `ScoringSystemV1`.
- Adaptar `/fantasy` para utilizar UUIDs de Supabase.
- Mostrar precios del mercado persistido.
- Evitar peticiones sucesivas por jornada y parpadeos en la interfaz.

Las rutas migradas ya no leen RFEVB en vivo. RFEVB se mantiene como fuente para los procesos de ingesta.

### Criterios de salida de la Fase 5

- [x] Ingesta de las cuatro competiciones.
- [x] Persistencia del catálogo, las jornadas, los partidos y las estadísticas.
- [x] Sembrado de valores de mercado.
- [x] Repositorios de lectura tipados.
- [x] Test de integración de repositorios.
- [x] Migración de las rutas de producto incluidas en el alcance.
- [x] Adaptación de `/fantasy` a los identificadores y valores persistidos.
- [x] Cálculo de todas las jornadas mediante `ScoringSystemV1` en una sola petición.

**Criterio de salida:** la interfaz consume el catálogo normalizado desde Supabase y los datos de producto ya no dependen de lecturas en vivo desde RFEVB.

## Fase 6 — Ligas y equipos fantasy

### Objetivos

1. Integrar la creación de ligas privadas.
2. Permitir la unión a una liga mediante código.
3. Implementar el listado y la salida de ligas.
4. Inicializar un equipo fantasy persistente para cada usuario y liga.
5. Asignar el nombre `Equipo de <username>` y un presupuesto inicial de 100M.
6. Crear una alineación inicial de siete jugadores que cumpla `1/1/2/2/1`.
7. Validar que los jugadores pertenecen a la competición y temporada de la liga.
8. Validar precios, presupuesto y disponibilidad de la selección.
9. Utilizar operaciones atómicas para impedir registros parciales.
10. Probar sucesión del propietario, eliminación de ligas vacías y aislamiento por competición y temporada.

**Criterio de salida:** varios usuarios pueden crear o unirse a una liga privada y reciben un equipo fantasy persistente, con presupuesto y selección inicial válidos.

## Fase 7 — Mercado y transferencias

1. Consultar los valores de mercado persistidos por jugador y jornada.
2. Implementar operaciones de compra y venta mediante RPC.
3. Validar saldo, máximo de 14 jugadores, exclusividad del jugador por liga y pertenencia en ventas.
4. Registrar la jornada y la transacción de cada operación.
5. Bloquear las transferencias durante la jornada según `startsAt` y `endsAt`.
6. Probar concurrencia, operaciones correctas y rechazos sin efectos parciales.

**Criterio de salida:** las restricciones de presupuesto, límite de plantilla y propiedad se cumplen incluso cuando se omite la UI.

## Fase 8 — Alineaciones y bloqueo

1. Implementar una operación server-side para guardar titulares.
2. Validar que pertenecen a la plantilla y a la competición y temporada correctas.
3. Permitir hasta siete seleccionados y exigir la composición exacta `1/1/2/2/1` para puntuar.
4. Aplicar `startsAt <= now <= endsAt` a alineaciones y transferencias.
5. Probar los límites temporales antes, durante y después del intervalo.
6. Mostrar estados de bloqueo y errores claros en la interfaz.

**Criterio de salida:** no se puede editar la plantilla o alineación durante el periodo bloqueado.

## Fase 9 — Scoring persistente y ranking privado

1. Calcular puntuaciones por partido y jornada con `ScoringSystemV1`.
2. Persistir el desglose y `scoringVersion` para conservar resultados históricos.
3. Calcular el total de equipo a partir de siete titulares válidos.
4. Ofrecer clasificación únicamente a los miembros de cada liga.
5. Probar datos incompletos, ejecución repetida y aislamiento entre ligas.

**Criterio de salida:** importación de estadísticas, cálculo versionado, puntuación del equipo y clasificación privada reproducible.

## Fase 10 — UI persistente

1. Sustituir progresivamente el estado local de `/fantasy` por operaciones persistentes.
2. Implementar los flujos de ligas, mercado, plantilla, alineación, jornada, historial y clasificación.
3. Gestionar carga, errores, permisos, bloqueos y estados vacíos.
4. Eliminar el estado temporal cuando cada flujo persistente esté validado.

**Criterio de salida:** los cambios sobreviven a nuevas sesiones y las acciones no pueden alterar datos de otros usuarios.

## Fase 11 — Integración end-to-end

Probar con varios usuarios el ciclo completo:

- Registro e inicio de sesión.
- Creación y unión a ligas.
- Inicialización del equipo fantasy.
- Mercado y transferencias.
- Selección y bloqueo de alineaciones.
- Ingesta y puntuación.
- Clasificación privada.

Incluir casos de varias competiciones, límites, temporadas incompatibles, RLS y sucesión o eliminación de ligas.

## Fase 12 — Despliegue

- Separar las variables públicas de los secretos.
- Aplicar migraciones de forma controlada.
- Configurar Supabase Auth.
- Desplegar primero en staging.
- No publicar claves de servicio ni credenciales PostgreSQL.
- Verificar las operaciones y permisos antes de habilitar producción.

## Calidad y validación

- Inspeccionar el código existente y reutilizar dominio, scraper y servicios.
- Mantener TypeScript estricto; no utilizar `any` ni deshabilitar comprobaciones para ocultar errores.
- Actualizar la documentación al cerrar cada fase.
- Ejecutar los tests relevantes y `npm run build`; ejecutar lint si está disponible.
- Usar `npm run test:supabase:schema` como verificación de solo lectura del esquema remoto.
- No ejecutar pruebas destructivas ni `db reset` en producción.
- No declarar funcional una garantía que no haya sido probada en backend o base de datos.
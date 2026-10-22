# Plan maestro de implementación

## Objetivo y alcance

Completar un MVP para la temporada 2026/27, pensado para el propietario y un grupo pequeño de amigos en ligas privadas.

La solución mantiene separadas la fuente RFEVB, la normalización, el dominio, la persistencia Supabase y la presentación. Debe permitir incorporar nuevas temporadas y competiciones sin acoplar la interfaz a la estructura de origen.

## Estado

### Completado

1. **Dominio:** contratos tipados para competición, temporada, equipo, jugador, partido, estadísticas, jornada, fantasy y scoring. TypeScript estricto y contratos del dominio en camelCase.
2. **Scoring:** `ScoringSystemV1` definido según los datos disponibles, probado e integrado en el cálculo de puntuaciones.
3. **Persistencia:** esquema Supabase con tablas, relaciones, restricciones, índices, RLS y firmas/permisos de RPC para operaciones fantasy; la lógica funcional de las RPC requiere pruebas aparte.
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
- Regla de producto prevista: el equipo se llama `Equipo de <username>` y no puede renombrarse; la implementación efectiva debe confirmarse en las migraciones SQL, no incluidas en la instantánea revisada.
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

## Fase 3A — Verificación remota de Supabase y documentación ✅ (estado registrado)

La documentación anterior registra esta fase como completada. La prueba no se ha repetido en esta revisión; el código incluido permite ejecutarla, pero el estado remoto actual no se puede afirmar sin volver a correrla.

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

**Criterio de salida:** la interfaz consume el catálogo normalizado desde Supabase, los precios están persistidos, y los datos de producto ya no dependen de lecturas en vivo desde RFEVB.

## Fase 6 — Ligas y equipos fantasy — PARCIAL

La interfaz ya lee las ligas del usuario y llama a `create_private_league`, `join_private_league` y `leave_private_league`. La pantalla fantasy lee el equipo existente mediante `GET /api/fantasy-team`. No obstante, el contenido SQL de las RPC está excluido del paquete revisado y no se puede confirmar solo con este código que crear/unirse inicialice un equipo, presupuesto y alineación de forma atómica. El endpoint devuelve 404 si no encuentra equipo.

### Pendiente para cerrar la fase

1. Inspeccionar las migraciones SQL reales para confirmar qué filas crean `create_private_league` y `join_private_league`.
2. Verificar que cada miembro recibe un `fantasy_team` asociado a la competición/temporada correcta, con presupuesto y alineación inicial válidos.
3. Probar atomicidad: si falla la inicialización, no debe quedar una liga o membresía parcial.
4. Probar el presupuesto inicial y la composición de alineación contra las restricciones reales.
5. Probar con varios usuarios la sucesión del propietario, la eliminación de ligas vacías y el aislamiento por competición y temporada.
6. Quitar de la UI los IDs fijos de competición/temporada y derivarlos de la liga seleccionada.

**Criterio de salida:** varios usuarios pueden crear o unirse a una liga privada y reciben un equipo fantasy persistente, con presupuesto y selección inicial válidos.

## Fase 7 — Mercado y transferencias — PARCIAL

`FantasyTeamBuilder` ya invoca la RPC `transfer_player` para las acciones Comprar/Vender y recarga los datos al finalizar. Esto confirma la conexión de UI, no la corrección funcional de todas las reglas: las pruebas disponibles en el paquete solo verifican esquema/permisos, no la lógica transaccional de transferencias.

### Trabajo pendiente

1. Verificar en las migraciones que `transfer_player` aplica saldo, precio, límite de 14 jugadores, exclusividad del jugador por liga y pertenencia al equipo.
2. Confirmar que registra correctamente la jornada y la transacción de cada operación.
3. Probar bloqueo durante el intervalo `startsAt`–`endsAt`.
4. Probar compras/ventas válidas e inválidas, concurrencia y rechazos sin efectos parciales en una base de pruebas.

**Criterio de salida:** las restricciones de presupuesto, límite de plantilla y propiedad se cumplen incluso cuando se omite la UI.

## Fase 8 — Alineaciones y bloqueo — PENDIENTE

La UI tiene validación local, pero `toggleLineup` sigue mostrando un aviso y no persiste cambios.

1. Implementar una operación server-side para guardar titulares.
2. Validar que pertenecen a la plantilla y a la competición y temporada correctas.
3. Permitir hasta siete seleccionados y exigir la composición exacta `1/1/2/2/1` para puntuar.
4. Aplicar `startsAt <= now <= endsAt` a alineaciones y transferencias.
5. Probar los límites temporales antes, durante y después del intervalo.
6. Mostrar estados de bloqueo y errores claros en la interfaz.

**Criterio de salida:** no se puede editar la plantilla o alineación durante el periodo bloqueado.

## Fase 9 — Scoring persistente y ranking privado — PENDIENTE

La API calcula `ScoringSystemV1` bajo demanda; no escribe los resultados calculados en las tablas históricas en el flujo actual incluido.

1. Calcular puntuaciones por partido y jornada con `ScoringSystemV1`.
2. Persistir el desglose y `scoringVersion` para conservar resultados históricos.
3. Calcular el total de equipo a partir de siete titulares válidos.
4. Ofrecer clasificación únicamente a los miembros de cada liga.
5. Probar datos incompletos, ejecución repetida y aislamiento entre ligas.

**Criterio de salida:** importación de estadísticas, cálculo versionado, puntuación del equipo y clasificación privada reproducible.

## Fase 10 — UI persistente — PARCIAL

La UI ya consume algunas lecturas persistidas y las RPC de liga/transferencia, pero la alineación no guarda y faltan flujos de scoring histórico y clasificación.

1. Sustituir progresivamente el estado local de `/fantasy` por operaciones persistentes.
2. Implementar los flujos de ligas, mercado, plantilla, alineación, jornada, historial y clasificación.
3. Gestionar carga, errores, permisos, bloqueos y estados vacíos.
4. Eliminar el estado temporal cuando cada flujo persistente esté validado.

**Criterio de salida:** los cambios sobreviven a nuevas sesiones y las acciones no pueden alterar datos de otros usuarios.

## Fase 11 — Integración end-to-end — PENDIENTE

Probar con varios usuarios el ciclo completo:

- Registro e inicio de sesión.
- Creación y unión a ligas.
- Inicialización del equipo fantasy.
- Mercado y transferencias.
- Selección y bloqueo de alineaciones.
- Ingesta y puntuación.
- Clasificación privada.

Incluir casos de varias competiciones, límites, temporadas incompatibles, RLS y sucesión o eliminación de ligas.

## Fase 12 — Despliegue — PENDIENTE DE EVIDENCIA

- Separar las variables públicas de los secretos.
- Aplicar migraciones de forma controlada.
- Configurar Supabase Auth.
- Desplegar primero en staging.
- No publicar claves de servicio ni credenciales PostgreSQL.
- Verificar las operaciones y permisos antes de habilitar producción.

## Calidad y validación

Prioridad transversal: `/api/fantasy-round-scores` debe comprobar que la temporada indicada pertenece a la competición indicada; ahora resuelve la temporada solo por `rfevb_id`.

No marques una fase como cerrada basándote únicamente en que exista una tabla o una RPC. Para las fases 6–10, añade pruebas de comportamiento sobre un proyecto de prueba (con más de un usuario) y prueba expresamente errores, atomicidad, aislamiento y límites de jornada. La prueba de esquema remota es de solo lectura y no valida esas reglas.

- Inspeccionar el código existente y reutilizar dominio, scraper y servicios.
- Mantener TypeScript estricto; no utilizar `any` ni deshabilitar comprobaciones para ocultar errores.
- Actualizar la documentación al cerrar cada fase.
- Ejecutar los tests relevantes y `npm run build`; ejecutar lint si está disponible.
- Usar `npm run test:supabase:schema` como verificación de solo lectura del esquema remoto.
- No ejecutar pruebas destructivas ni `db reset` en producción.
- No declarar funcional una garantía que no haya sido probada en backend o base de datos.
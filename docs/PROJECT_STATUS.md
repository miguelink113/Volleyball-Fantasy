# Estado del proyecto

## Resumen

Las fases 1–5 están descritas como implementadas en la documentación, pero su cierre debe respaldarse con ejecuciones reproducibles. La auditoría del código incluido identifica las fases 6 y 7 como parciales; la fase 8 sigue pendiente. El proyecto dispone de un dominio tipado, un sistema de puntuación versionado, persistencia en Supabase, ingesta idempotente del catálogo deportivo y repositorios de lectura utilizados por la API y la interfaz fantasy.

La ingesta está completada para las cuatro competiciones de la temporada 2025/26.

| Entidad | Registros persistidos |
| --- | ---: |
| Equipos | 94 |
| Jugadores | 1.449 |
| Partidos | 1.045 |
| Estadísticas de jugador | 25.262 |

La tabla `player_market_values` contiene valores de 9M para todos los jugadores en todas las jornadas.

La Fase 6 (ligas y equipos fantasy) contiene implementación, pero no debe considerarse cerrada hasta validar sus flujos completos con pruebas funcionales.

## Estado de cierre tras la auditoría

| Fase | Estado documental | Qué falta para cerrarla |
| --- | --- | --- |
| 1. Dominio tipado | Implementada; verificación por repetir | `npm run test:domain`, `npm run build` y criterios formalizados en el plan. |
| 2. Scoring V1 | Implementado; verificación por repetir | Revisar fórmula documentada y confirmar el uso de `ScoringSystemV1`. |
| 3. Modelo Supabase | Esquema presente; cierre funcional no demostrado | Revisar migraciones y probar mutaciones/autorización por separado del test de esquema. |
| 3A. Verificación remota | Marcada anteriormente como completada | Repetir si cambió el esquema; guardar evidencia del resultado. |
| 4. Ingesta | Implementada; verificación por repetir | Tests de mappers/alias e idempotencia real de segunda ejecución. |
| 5. Catálogo persistente | Marcada como completada para 2025/26 | Revalidar recuentos, repositorios, endpoints y alcance de temporada 2026/27. |
| 6. Ligas y equipos | Parcial | Pruebas multiusuario, inicialización, atomicidad, sucesión y aislamiento. |
| 7. Mercado | Parcial | Cubrir compra/venta, saldo, límites, bloqueo, concurrencia y rollback. |
| 8. Alineaciones | Pendiente | Sustituir el placeholder por persistencia server-side y probar bloqueo temporal. |

Los estados anteriores describen lo que puede inferirse del código y de la documentación empaquetados; no equivalen a haber ejecutado ahora los comandos. Esta auditoría no pudo ejecutar las pruebas ni acceder a la base de datos real.

## Implementado

### Dominio y scoring

- Contratos tipados para competiciones, temporadas, equipos, jugadores, partidos, estadísticas, jornadas, fantasy y puntuación.
- Posiciones internas normalizadas.
- Estados explícitos de partido y sets opcionales (`number | null` en TypeScript).
- `ScoringSystemV1` basado en los datos disponibles de RFEVB, versionado y documentado en `docs/SCORING.md`.
- Tests de dominio mediante `npm run test:domain`.

### Autenticación y perfiles

- Supabase Auth con email y contraseña.
- Perfil con `username` único; no existe `full_name`.
- Trigger de creación de perfil y política de lectura propia definidos en las migraciones.

### Esquema Supabase

- Migración `supabase/migrations/20260925190000_create_fantasy_schema.sql`.
- Migración `supabase/migrations/20261008120000_require_rfevb_ids.sql`.
- Migración de alias de equipos `supabase/migrations/20261013230000_create_team_source_aliases.sql`.
- Tablas para catálogo deportivo, jornadas, valores de mercado, ligas, membresías, equipos fantasy, plantillas, alineaciones, puntuaciones y transacciones.
- Claves foráneas y restricciones para aislar competición y temporada y evitar la propiedad activa duplicada de un jugador dentro de una liga.
- RLS, políticas de lectura y RPC para operaciones fantasy.
- Reglas de transferencia de propiedad de liga al miembro restante más antiguo y eliminación de la liga cuando sale su único miembro.

### Verificación remota del esquema

- `npm run test:supabase:schema` ejecutado con éxito contra el proyecto Supabase remoto.
- Verificación de tablas, columnas, tipos, RLS, claves foráneas compuestas, constraints, índices, políticas de lectura, permisos RPC y trigger de perfil.
- Verificación de `rfevb_id NOT NULL` en las tablas de catálogo correspondientes.
- Verificación de la relación y política de lectura de `team_source_aliases`.
- Sin discrepancias conocidas entre la migración aplicada y el modelo documentado.

La prueba es de solo lectura y no sustituye las pruebas funcionales de escritura.

### Ingesta idempotente del catálogo

- Cliente administrativo server-only en `lib/supabase/admin.server.ts`.
- Mappers puros `mapTeam` y `mapPlayer` en `lib/services/ingestion/`.
- Validación estricta de `rfevb_id`.
- Script `scripts/ingest/ingest-roster.ts`.
- Upsert de competiciones, temporadas, equipos y jugadores.
- Registro de aliases de equipos procedentes del roster.
- Verificación de conteos contra RFEVB.
- Tests de mappers y del cliente administrativo.

### Resolución de alias de equipos

- Tabla `team_source_aliases` con RLS de solo lectura para usuarios autenticados.
- `TeamAliasResolver` en `lib/services/ingestion/team-alias-resolver.ts`.
- Normalización de nombres sin diacríticos ni apóstrofos y con tratamiento de stopwords societarias.
- Resolución por coincidencia exacta o por subconjunto de tokens, con controles para evitar asignaciones ambiguas.
- Integración con el mapeo de partidos.
- Diagnóstico de las cuatro competiciones sin colisiones conocidas; los partidos de playoff cuyos equipos no están en el roster regular se excluyen de la ingesta.

### Catálogo deportivo persistido

| Competición | ID RFEVB | Equipos | Jugadores |
| --- | --- | ---: | ---: |
| Superliga Masculina 25/26 | 152 / 186 | 12 | 180 |
| Superliga Femenina 25/26 | 151 / 185 | 12 | 167 |
| Superliga 2 Masculina 25/26 | 153 / 187 | 34 | 550 |
| Superliga 2 Femenina 25/26 | 150 / 183 | 36 | 552 |
| **Total** | | **94** | **1.449** |

### Fase 5.1 — Ingesta de partidos y estadísticas ✅

El script `scripts/ingest/ingest-matches.ts` ingiere de forma idempotente las jornadas, los partidos y las estadísticas de jugador.

- Las jornadas se calculan a partir de las fechas reales de los partidos.
- Los intervalos se convierten de Europe/Madrid a UTC, teniendo en cuenta el horario de verano.
- Los jugadores de las actas se cruzan con el roster primero por nombre dentro del equipo y, como alternativa, por dorsal.
- La posición del jugador procede del roster.
- Los aliases de equipos encontrados en las actas se registran sin sobrescribir los aliases existentes del roster.

### Fase 5.2 — Sembrado de valores de mercado ✅

- Tabla `player_market_values` poblada con un valor de 9M para todos los jugadores y todas las jornadas.
- Los valores iniciales se consultan desde Supabase.
- La interfaz muestra los precios obtenidos del mercado persistido.

### Fase 5.3 — Repositorios de lectura ✅

Se ha creado `lib/repositories/` con acceso tipado al catálogo persistido.

La capa incluye repositorios para:

- Equipos.
- Jugadores.
- Jornadas.
- Partidos.
- Estadísticas de jugador por partido.
- Valores de mercado.

Los repositorios encapsulan las consultas a Supabase y convierten los registros persistidos en entidades del dominio con propiedades camelCase. La interfaz de producto no necesita conocer la estructura SQL ni construir entidades a partir de DTO del scraper.

Existe un test de integración para validar la lectura a través de esta capa.

### Fase 5.4 — Migración de API y frontend ✅

Las rutas migradas consumen los repositorios y leen los datos deportivos desde Supabase.

- `/api/competition-roster` obtiene equipos y jugadores del catálogo persistido.
- `/api/fantasy-round-scores` obtiene las estadísticas necesarias y calcula las puntuaciones de todas las jornadas mediante `ScoringSystemV1`.
- La página `/fantasy` utiliza UUIDs de Supabase para identificar equipos y jugadores.
- La interfaz muestra los precios reales del mercado persistido.
- Las puntuaciones de todas las jornadas se obtienen en una sola petición, evitando peticiones sucesivas y parpadeos de la interfaz.

RFEVB sigue siendo la fuente de ingesta, pero no es la fuente de lectura en vivo de estas rutas de producto.

## Verificación de la Fase 5

Antes de cerrar la fase, comprobar:

- [ ] Las cuatro competiciones mantienen sus conteos esperados.
- [ ] Las tablas de partidos y estadísticas contienen los datos ingeridos.
- [ ] Todos los jugadores tienen valores de mercado para las jornadas correspondientes.
- [ ] Los repositorios devuelven entidades de dominio con propiedades camelCase.
- [ ] El test de integración de repositorios pasa.
- [ ] `/api/competition-roster` devuelve datos persistidos.
- [ ] `/api/fantasy-round-scores` calcula las puntuaciones de todas las jornadas.
- [ ] `/fantasy` utiliza UUIDs de Supabase y muestra los valores de mercado correctos.
- [ ] Los tests pertinentes y `npm run build` pasan.

Los conteos descritos corresponden al estado de la base de datos comunicado para esta fase. Las comprobaciones deben repetirse si se modifica la ingesta o el esquema antes del commit.

## Pendiente de cierre: Fase 6 — Ligas y equipos fantasy

Objetivos:

1. Integrar creación, unión por código, listado y salida de ligas mediante RPC.
2. Inicializar un equipo fantasy persistente por usuario y liga.
3. Asignar el nombre inicial a partir del `username` y un presupuesto de 100M.
4. Permitir una alineación inicial de siete jugadores con composición `1/1/2/2/1`.
5. Validar precios, presupuesto y disponibilidad de jugadores.
6. Garantizar operaciones atómicas y ausencia de filas parciales cuando no exista una selección válida.
7. Probar la sucesión del propietario, la eliminación de ligas vacías y el aislamiento por competición y temporada.

## Deuda técnica conocida

- Persistencia de puntuaciones fantasy y clasificación privada.
- Operaciones de mercado y transferencias persistentes.
- Guardado y bloqueo de alineaciones.
- Revisión futura de estadísticas de acta que no pudieron cruzarse unívocamente con jugadores del roster.

Estas tareas no impiden considerar completada la Fase 5, cuyo alcance es el catálogo persistido y su consumo por las rutas migradas.\n
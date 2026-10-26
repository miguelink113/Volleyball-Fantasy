# Estado del proyecto

## Resumen

Las fases 1 a 7 están **completadas y verificadas** mediante ejecuciones reproducibles. La Fase 8 (Alineaciones) es la siguiente en desarrollo. El proyecto dispone de un dominio tipado, un sistema de puntuación versionado, persistencia en Supabase, ingesta idempotente del catálogo deportivo y repositorios de lectura utilizados por la API y la interfaz fantasy.

La ingesta está completada para las cuatro competiciones de la temporada 2025/26.

| Entidad | Registros persistidos |
| --- | ---: |
| Equipos | 94 |
| Jugadores | 1.449 |
| Partidos | 1.045 |
| Estadísticas de jugador | 25.262 |

La tabla `player_market_values` contiene valores de 9M para todos los jugadores en todas las jornadas.

## Estado de las fases

| Fase | Estado | Verificación |
| --- | --- | --- |
| 1. Dominio tipado | ✅ Completada | `npm run test:domain` y `npm run build` pasan. |
| 2. Scoring V1 | ✅ Completada | `test:domain` confirma la fórmula de `ScoringSystemV1`. |
| 3. Modelo Supabase | ✅ Completada | Migraciones SQL revisadas y aplicadas. |
| 3A. Verificación remota | ✅ Completada | Historial reparado y sincronizado. |
| 4. Ingesta | ✅ Completada | Tests de mappers/alias e idempotencia validados. |
| 5. Catálogo persistente | ✅ Completada | Recuentos y endpoints verificados. |
| 6. Ligas y equipos | ✅ Completada | Pruebas multiusuario y de sucesión superadas. |
| 7. Mercado | ✅ Completada | Reglas de límite, saldo y bloqueo superadas. |
| 8. Alineaciones | ⏳ Pendiente | Requiere persistencia server-side. |

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
- Migración de sincronización remota `20261015120000_remote_sync.sql`.
- Tablas para catálogo deportivo, jornadas, valores de mercado, ligas, membresías, equipos fantasy, plantillas, alineaciones, puntuaciones y transacciones.
- Claves foráneas y restricciones para aislar competición y temporada y evitar la propiedad activa duplicada de un jugador dentro de una liga.
- RLS, políticas de lectura y RPC para operaciones fantasy.
- Reglas de transferencia de propiedad de liga al miembro restante más antiguo y eliminación de la liga cuando sale su único miembro.

### Verificación remota del esquema
- `npm run test:supabase:schema` ejecutado con éxito contra el proyecto Supabase remoto.
- Verificación de tablas, columnas, tipos, RLS, claves foráneas compuestas, constraints, índices, políticas de lectura, permisos RPC y trigger de perfil.
- Verificación de `rfevb_id NOT NULL` en las tablas de catálogo correspondientes.
- Sin discrepancias conocidas entre la migración aplicada y el modelo documentado.

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
- Diagnóstico de las cuatro competiciones sin colisiones conocidas.

### Catálogo deportivo persistido

| Competición | ID RFEVB | Equipos | Jugadores |
| --- | --- | ---: | ---: |
| Superliga Masculina 25/26 | 152 / 186 | 12 | 180 |
| Superliga Femenina 25/26 | 151 / 185 | 12 | 167 |
| Superliga 2 Masculina 25/26 | 153 / 187 | 34 | 550 |
| Superliga 2 Femenina 25/26 | 150 / 183 | 36 | 552 |
| **Total** | | **94** | **1.449** |

## Pendiente de cierre: Fase 8 — Alineaciones y bloqueo

Objetivos:
1. Implementar una operación server-side (RPC) para guardar titulares.
2. Validar que pertenecen a la plantilla y a la competición y temporada correctas.
3. Exigir la composición exacta `1/1/2/2/1` para puntuar.
4. Aplicar `startsAt <= now <= endsAt` a alineaciones.

## Deuda técnica conocida
- Persistencia de puntuaciones fantasy y clasificación privada (Fase 9).
- Guardado y bloqueo de alineaciones (Fase 8).
- Revisión futura de estadísticas de acta que no pudieron cruzarse unívocamente con jugadores del roster.
# Plan maestro de implementación

## Objetivo y alcance

Completar un MVP para la temporada 2026/27, pensado para el propietario y un
grupo pequeño de amigos en ligas privadas. La solución debe mantener separadas
la fuente RFEVB, la normalización, el dominio, la persistencia Supabase y la
presentación, y permitir añadir temporadas y competiciones futuras.

## Estado

### Completado

1. **Dominio**: contratos saneados para competición, temporada, equipo,
   jugador, partido, estadísticas, jornada, fantasy y scoring. TypeScript
   estricto y contratos del dominio en CamelCase.
2. **Scoring**: `ScoringSystemV1` definido según los datos reales del scraper,
   integrado en los flujos existentes, probado y documentado. Los resultados
   incluyen versión de scoring.
3. **Diseño de persistencia**: migración
   `../supabase/migrations/20260925190000_create_fantasy_schema.sql` con tablas,
   relaciones, restricciones, índices, RLS y RPC para operaciones fantasy.
   Migración adicional
   `../supabase/migrations/20261008120000_require_rfevb_ids.sql` que refuerza
   `rfevb_id NOT NULL` en `competitions`, `seasons`, `teams` y `players` como
   invariante del catálogo.
4. **Verificación remota del esquema (Fase 3A)**: `npm run test:supabase:schema`
   ejecutado con éxito contra el proyecto Supabase remoto. Confirma las 19
   tablas, columnas, tipos, RLS, FKs compuestas, constraints, índice de
   propiedad activa, políticas de lectura, permisos RPC, trigger de perfil y
   `rfevb_id NOT NULL` en las tablas clave. No se detectaron discrepancias
   entre la migración aplicada y el modelo documentado.
5. **Ingesta idempotente del catálogo (Fase 4)**: cliente administrativo
   server-only, mappers puros con validación estricta de `rfevb_id`, y script
   `scripts/ingest-roster.ts` que puebla `competitions`, `seasons`, `teams` y
   `players` mediante upsert con `onConflict: "season_id,rfevb_id"`. Ejecución
   verificada dos veces consecutivas sobre la competición 152, temporada 186:
   12 equipos y 180 jugadores sin duplicación.

### Aún no conectado

- La ingesta de `rounds`, `matches` y `match_player_stats` (misma mecánica
  que el roster, otra entidad).
- Los repositorios de lectura para el catálogo persistido y su exposición en
  los endpoints HTTP de producto.
- Las operaciones persistentes de ligas, plantilla, alineación y mercado desde
  la UI.
- La persistencia del scoring y el ranking privado.

El catálogo de equipos y jugadores ya vive en Supabase. La ruta `/fantasy`,
sin embargo, todavía lee RFEVB en vivo: mercado, plantilla, presupuesto y
alineación permanecen en memoria. Migrar esas lecturas a Supabase es el
objetivo de la Fase 5. Auth y perfiles ya utilizan Supabase.

## Decisiones vigentes

- Autenticación mediante email y contraseña; perfil con `username`, sin
  `full_name` ni Google OAuth.
- El equipo se llama automáticamente `Equipo de <username>` y no puede
  renombrarse.
- Cada liga privada referencia una sola competición y temporada.
- El scraper RFEVB se conserva como fuente; sus DTO se normalizan antes de
  persistirse.
- Posiciones normalizadas: `setter`, `opposite`, `outside`, `middle`, `libero`
  y `unknown`.
- Los sets de un partido pueden ser `null`; sus estados son `SCHEDULED`,
  `IN_PROGRESS`, `COMPLETED` y `POSTPONED`.
- La plantilla admite como máximo 14 jugadores. Una alineación puede tener
  hasta siete; para puntuar debe tener siete con composición `1/1/2/2/1`.
- No hay capitán ni ranking global. La clasificación se limita a cada liga.
- La jornada usa `startsAt` y `endsAt` para bloquear alineaciones y
  transferencias durante el intervalo.
- La creación/entrada en liga debe ser atómica e inicializar un equipo. Si el
  propietario abandona, la propiedad pasa al miembro restante más antiguo; si
  es el único miembro, la liga se elimina.
- Las mutaciones sensibles se validan server-side/BD, no solo desde la UI.
- No se incluyen pagos, ligas públicas, mercado entre participantes, chat ni
  automatización del scraper.

## Fase 3A — Verificación remota de Supabase y documentación ✅

Completada.

1. ✅ Ejecutar `npm run test:supabase:schema` contra el proyecto remoto con
   `SUPABASE_REMOTE_DB_URL` en `.env.local`.
2. ✅ Confirmar estructura de tablas/columnas, tipos relevantes, relaciones
   compuestas, índices, RLS, políticas y permisos RPC.
3. ✅ Corregir discrepancias entre la migración y el esquema real. La única
   discrepancia detectada fue el formato de la constraint
   `rounds_check` (`CHECK ((starts_at <= ends_at))`); se resolvió normalizando
   la comparación en el test, sin tocar la base.
4. ✅ Mantener la prueba estrictamente de lectura: no ejecuta migraciones ni
   mutaciones de negocio. La base remota no se prueba con `db reset`.
5. ✅ Mantener documentación y estado del proyecto sincronizados con lo que
   está realmente conectado y lo que sigue siendo diseño.

**Criterio de salida cumplido:** el test remoto pasa y confirma que el
proyecto desplegó el modelo esperado.

## Fase 4 — Ingesta idempotente RFEVB ✅

Completada.

1. ✅ Revisión de scripts y contratos existentes; el scraper RFEVB se ha
   conservado como fuente y no se ha modificado.
2. ✅ Mappers explícitos scraper → dominio → persistencia SQL en
   `lib/services/ingestion/`:
    - `mapTeam`: convierte `ScrapedCompetitionTeam` en una fila para `teams`.
    - `mapPlayer`: convierte `ScrapedCompetitionPlayer` en una fila para
      `players`, resolviendo `team_id` desde un mapa `rfevbId → UUID`.
    - Ambos rechazan explícitamente equipos y jugadores sin `rfevbId`, sin
      nombre y sin equipo resoluble.
    - Tests unitarios en `npm run test:ingestion-mappers` (11 casos).
3. ✅ Script administrativo `scripts/ingest-roster.ts` que cubre
   competición, temporada, equipos y jugadores. Los scripts para `rounds`,
   `matches` y `match_player_stats` se abordan en la Fase 5, reutilizando el
   mismo patrón.
4. ✅ Upsert idempotente con `onConflict: "season_id,rfevb_id"` en `teams` y
   `players`, y `onConflict: "rfevb_id"` en `competitions`. El script verifica
   conteos contra RFEVB al final y aborta si hay discrepancia.
5. ✅ Cliente administrativo aislado en `lib/supabase/admin.server.ts`, con
   protección contra ejecución en navegador (`typeof window !== "undefined"`
   lanza) y test reproducible en `npm run test:supabase:admin`. La secret key
   no se expone al cliente.
6. ✅ Conteos verificados contra RFEVB tras ejecución repetida: 12 equipos y
   180 jugadores en la competición 152, temporada 186, sin duplicación.

**Criterio de salida cumplido:** ejecutar la ingesta varias veces no duplica
registros ni mezcla competición o temporada. Los UUIDs de competición y
temporada permanecen estables entre ejecuciones.

**Comandos:**

```bash
npm run test:ingestion-mappers
npm run test:supabase:admin
npx tsx scripts/ingest-roster.ts \
  --competition=152 \
  --season=186 \
  --season-name="2025/26"
 ```

## Fase 5 — Catálogo persistente

1. Crear repositorios y servicios Supabase tipados para el catálogo deportivo.
2. Cambiar lecturas de producto de RFEVB en vivo a datos persistidos.
3. Mantener los endpoints y herramientas de diagnóstico existentes cuando
   sigan siendo útiles.
4. Probar mappers, errores de persistencia y consultas aisladas por temporada.

**Criterio de salida:** la UI consume el catálogo normalizado desde Supabase.

## Fase 6 — Ligas y equipos fantasy

1. Integrar creación, unión por código, listado y salida de ligas mediante RPC.
2. Crear automáticamente un equipo por usuario y liga, con nombre basado en
   username y presupuesto inicial de 100M.
3. Seleccionar una alineación inicial de siete jugadores que cumpla
   `1/1/2/2/1`, con precios disponibles y coste dentro del presupuesto.
4. Mostrar error explícito y no dejar filas parciales si no existe una
   selección válida.
5. Probar sucesión del propietario, eliminación de liga si sale el único
   miembro y límites de temporada/competición.

**Criterio de salida:** varios usuarios pueden crear o unirse a una liga y
recibir un equipo fantasy persistente.

## Fase 7 — Mercado y transferencias

1. Implementar configuración de precio inicial (9M como valor configurable,
   cuando se decida activarlo) y valores de mercado por jornada.
2. Conectar consulta de mercado y RPC de compra/venta.
3. Validar saldo, máximo 14, exclusividad de jugador por liga, pertenencia en
   ventas y bloqueo temporal server-side.
4. Guardar jornada de compra/venta y transacción.
5. Probar operaciones correctas, concurrencia y rechazos sin efectos parciales.

**Criterio de salida:** las restricciones de presupuesto, límite y propiedad se
cumplen incluso si se omite la UI.

## Fase 8 — Alineaciones y bloqueo

1. Implementar una operación server-side para guardar titulares.
2. Validar que pertenecen a la plantilla y a la misma competición/temporada.
3. Permitir hasta siete seleccionados y exigir composición exacta `1/1/2/2/1`
   para puntuar.
4. Aplicar `startsAt <= now <= endsAt` a alineaciones y transferencias.
5. Probar límites inmediatamente antes, al inicio, al final y después del
   intervalo.

**Criterio de salida:** no se puede editar plantilla/alineación durante la
jornada bloqueada; la UI explica el bloqueo.

## Fase 9 — Scoring persistente y ranking privado

1. Importar estadísticas y calcular puntuaciones por partido y jornada con
   `ScoringSystemV1`.
2. Persistir desglose y `scoringVersion` para preservar resultados históricos.
3. Calcular el total de equipo a partir de siete titulares válidos.
4. Ofrecer ranking únicamente a miembros de la liga.
5. Probar datos incompletos, ejecución repetida y aislamiento entre ligas.

**Criterio de salida:** importación → puntuación versionada → total de equipo →
clasificación privada reproducible.

## Fase 10 — UI persistente

1. Sustituir progresivamente estado local de `/fantasy` por servicios
   persistentes.
2. Implementar flujo de ligas, mercado, plantilla, alineación, jornada,
   historial y clasificación.
3. Tratar loading, errores, permisos, bloqueos y estados vacíos.
4. Retirar datos en memoria solo cuando el flujo persistente esté validado.

**Criterio de salida:** cambios conservados entre sesiones y ninguna acción
puede alterar datos de otro usuario.

## Fase 11 — Integración end-to-end

Probar con varios usuarios el ciclo completo: registro, creación/unión a liga,
equipo automático, mercado, alineación, bloqueo de jornada, ingesta,
puntuación y ranking. Incluir casos de ambas competiciones, límites,
temporadas incompatibles, RLS y sucesión/eliminación de liga.

## Fase 12 — Despliegue

Separar variables públicas y secretos, aplicar migraciones de forma controlada,
configurar Supabase Auth y desplegar primero en staging. No publicar claves de
servicio ni credenciales PostgreSQL.

## Calidad y validación

- Inspeccionar el código y reutilizar dominio, scraper y servicios existentes.
- Mantener TypeScript estricto; no usar `any` o deshabilitar checks para
  ocultar errores.
- Cada fase debe actualizar documentación, ejecutar tests relevantes y
  `npm run build`; ejecutar lint si está disponible.
- `npm run test:supabase:schema` requiere conexión PostgreSQL remota y es de
  solo lectura. No verifica comportamiento de escritura ni reemplaza las
  pruebas funcionales en una base aislada.
- No ejecutar pruebas destructivas ni `db reset` en producción.
- No declarar funcional una garantía que aún no se haya probado en backend/BD.
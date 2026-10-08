# Estado del proyecto

## Resumen

Las fases 1–3 del plan están completadas en código/diseño y verificadas en
remoto: dominio, scoring, migración Supabase y validación del esquema remoto
mediante `npm run test:supabase:schema`. El test se ejecutó con éxito contra
el proyecto Supabase y no detectó discrepancias entre la migración aplicada y
el modelo documentado.

Auth y perfiles se conectan a Supabase. La ingesta de catálogo y el producto
fantasy persistente todavía no están conectados: `/fantasy` continúa siendo
una demo en memoria.

## Implementado

### Dominio y scoring

- Contratos de competición, temporada, equipos, jugadores, partidos,
  estadísticas, rondas, fantasy y puntuación.
- Posiciones internas normalizadas, estado de partido explícito y sets
  opcionales (`number | null` en TypeScript).
- `ScoringSystemV1` basado en datos disponibles del scraper, versionado y
  documentado en `docs/SCORING.md`.
- Tests de dominio en `npm run test:domain`.

### Autenticación y perfiles

- Supabase Auth con email y contraseña.
- Perfil `username` único; no existe `full_name`.
- Trigger de perfil y política de lectura propia documentados en la migración.

### Esquema Supabase diseñado

- Migración `supabase/migrations/20260925190000_create_fantasy_schema.sql`.
- Catálogo deportivo, rondas, valores de mercado, ligas, membresías, equipos,
  plantilla, alineaciones, puntuaciones y transacciones.
- Claves foráneas y restricciones para aislar competición/temporada y evitar
  propiedad activa duplicada de un jugador dentro de una liga.
- RLS, políticas de lectura y RPC para mutaciones fantasy.
- Propiedad de la liga transferida al miembro restante más antiguo; si sale el
  único miembro, se elimina la liga.
- Test remoto de estructura: `npm run test:supabase:schema`. Comprueba tablas,
  columnas, tipos relevantes, constraints clave, RLS, políticas y permisos
  RPC, sin modificar la base.

### Verificación remota del esquema (Fase 3A)

- `npm run test:supabase:schema` ejecutado con éxito contra el proyecto
  Supabase remoto.
- Confirma las 19 tablas, columnas, tipos, RLS, FKs compuestas, constraints,
  índice de propiedad activa, políticas de lectura, permisos RPC y trigger de
  perfil.
- No se detectaron discrepancias entre la migración aplicada y el modelo
  documentado.
- Única incidencia resuelta durante la verificación: la constraint
  `rounds_check` se presentaba como `CHECK ((starts_at <= ends_at))` y el test
  esperaba `CHECK (starts_at <= ends_at)`. Se corrigió normalizando la
  comparación en `scripts/test-supabase-schema.ts`, sin modificar la base.

## Demo fantasy actual

La ruta `/fantasy` carga catálogo y estadísticas mediante endpoints que
consultan RFEVB. El mercado diario, los precios, compras/ventas, plantilla y
alineación son provisionales y viven en memoria. Recargar puede reiniciar el
estado. No se escriben estos datos fantasy en Supabase.

## Pendiente

1. Implementar ingesta manual idempotente RFEVB → normalización → Supabase.
2. Crear repositorios y servir el catálogo de producto desde persistencia.
3. Conectar ligas, equipos, mercado y transferencias con sus RPC.
4. Implementar la escritura y validación server-side de alineaciones.
5. Persistir scoring por partido/jornada y clasificación por liga privada.
6. Migrar la UI fantasy desde estado en memoria.
7. Añadir tests end-to-end multiusuario y preparar staging/despliegue.

## Verificación del esquema remoto

1. Añadir `SUPABASE_REMOTE_DB_URL` a `.env.local` usando la URI de PostgreSQL
   del proyecto (Session pooler si Direct Connection no está disponible por
   IPv6).
2. Preferir credenciales de base de datos con permisos de lectura.
3. Ejecutar:

   ```bash
   npm run test:supabase:schema
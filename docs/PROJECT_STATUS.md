# Estado del proyecto

## Resumen

Las fases 1–3 del plan están completadas en código/diseño: dominio, scoring y
migración Supabase. La migración ahora cuenta con un test para revisar la
estructura **remota** mediante consultas PostgreSQL de solo lectura; debe
ejecutarse contra el proyecto configurando `SUPABASE_REMOTE_DB_URL`.

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

## Demo fantasy actual

La ruta `/fantasy` carga catálogo y estadísticas mediante endpoints que
consultan RFEVB. El mercado diario, los precios, compras/ventas, plantilla y
alineación son provisionales y viven en memoria. Recargar puede reiniciar el
estado. No se escriben estos datos fantasy en Supabase.

## Pendiente

1. Ejecutar el test de estructura contra el proyecto Supabase remoto y corregir
   cualquier diferencia del esquema desplegado.
2. Implementar ingesta manual idempotente RFEVB → normalización → Supabase.
3. Crear repositorios y servir el catálogo de producto desde persistencia.
4. Conectar ligas, equipos, mercado y transferencias con sus RPC.
5. Implementar la escritura y validación server-side de alineaciones.
6. Persistir scoring por partido/jornada y clasificación por liga privada.
7. Migrar la UI fantasy desde estado en memoria.
8. Añadir tests end-to-end multiusuario y preparar staging/despliegue.

## Verificación del esquema remoto

1. Añadir `SUPABASE_REMOTE_DB_URL` a `.env.local` usando la URI de PostgreSQL
   del proyecto.
2. Preferir credenciales de base de datos con permisos de lectura.
3. Ejecutar:

   ```bash
   npm run test:supabase:schema
   ```

El test inicia una transacción `READ ONLY` y consulta los catálogos de
PostgreSQL. No aplica migraciones ni prueba mutaciones de negocio. No usar
`supabase db reset` contra la base remota.

## Validación del proyecto

```bash
npm run test:domain
npm run test:supabase:schema
npm run build
```

`npm run test:supabase` es una prueba diferente: requiere `SUPABASE_SECRET_KEY`
y crea/limpia usuarios temporales para probar Auth y RLS. Ejecutarla solo en un
proyecto de pruebas.

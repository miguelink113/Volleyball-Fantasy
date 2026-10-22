# Estado del proyecto

**Revisión de documentación:** 2026-10-22

## Resumen ejecutivo

El repositorio tiene implementados el dominio tipado, el scraper y la ingesta administrativa, la lectura del catálogo persistido desde Supabase, el scoring calculado bajo demanda, autenticación, gestión básica de ligas privadas y una parte del flujo de plantilla/mercado.

No debe describirse el juego fantasy como completo: el guardado de alineaciones es un placeholder, el scoring no se persiste en las tablas de resultados en el flujo de aplicación visible y no existe clasificación fantasy funcional en la UI incluida.

### Temporada y datos

El objetivo del plan es un MVP para 2026/27, mientras que el catálogo documentado y el frontend siguen usando en varios puntos la temporada 2025/26 (`competition=152`, `season=186`). Además, `/api/competition-roster` selecciona la temporada marcada `is_current=true`, mientras `/fantasy` solicita las puntuaciones para `season=186` de forma fija. Hay que alinear estos selectores antes de afirmar que la aplicación está preparada para 2026/27.

Los conteos siguientes son los últimos registrados en la documentación anterior; esta revisión no ha consultado la base de datos remota para verificarlos.

| Entidad | Último conteo documentado |
| --- | ---: |
| Equipos | 94 |
| Jugadores | 1.449 |
| Partidos | 1.045 |
| Estadísticas de jugador | 25.262 |

| Competición 2025/26 | ID RFEVB / temporada | Equipos | Jugadores |
| --- | --- | ---: | ---: |
| Superliga Masculina | 152 / 186 | 12 | 180 |
| Superliga Femenina | 151 / 185 | 12 | 167 |
| Superliga 2 Masculina | 153 / 187 | 34 | 550 |
| Superliga 2 Femenina | 150 / 183 | 36 | 552 |
| **Total** | | **94** | **1.449** |

## Implementado en el código incluido

### Dominio y puntuación

- Contratos tipados para competiciones, temporadas, equipos, jugadores, partidos, jornadas y estadísticas.
- `ScoringSystemV1` (`v1`) y un scoring histórico `basic-v1`; el código de producto usa `ScoringSystemV1`.
- Tests ejecutables de dominio con `npm run test:domain`.
- El scoring se calcula bajo demanda en `/api/fantasy-round-scores`. La ruta devuelve `score`, `matchesPlayed` y `scoringVersion`, pero no persiste el resultado ni incluye `breakdown` en su respuesta actual.

### Autenticación y perfiles

- Integración con Supabase Auth por email y contraseña.
- `profiles.username` se usa como identificador de perfil en la interfaz; el código documenta que no hay campo `full_name`.
- `lib/supabase/client.ts`, `server.ts`, `auth.ts`, `middleware.ts` y `hooks/useAuth.ts` implementan la integración de sesión.

### Catálogo, ingesta y repositorios

- Scripts de ingesta: `scripts/ingest/ingest-roster.ts`, `ingest-matches.ts` e `ingest-market-values.ts`.
- Mappers explícitos para equipos y jugadores, validación estricta de `rfevb_id` y `TeamAliasResolver` para alias de equipos.
- Repositorios para equipos, jugadores, jornadas, partidos, estadísticas y valores de mercado.
- Los procesos de ingesta son manuales; no hay un planificador automático incluido en el código empaquetado.
- El script de mercado crea valores por jugador y jornada con precio fijo (9M por defecto), y hace upsert por `player_id,round_id`.

### APIs

- `/api/competition-roster`: lee competición, temporada actual, equipos, jugadores y valores de mercado desde Supabase.
- `/api/fantasy-round-scores`: lee jornadas, partidos y estadísticas persistidas y calcula `ScoringSystemV1` bajo demanda. La implementación resuelve la temporada solo por `season.rfevb_id` y no valida que pertenezca a la competición indicada en el parámetro `competition`.
- `/api/fantasy-team`: GET para leer equipo fantasy, jugadores activos y jugadores de la primera alineación encontrada.
- `/api/matches`, `/api/match-statistics` y `/api/competition-statistics`: continúan haciendo extracción en directo de RFEVB; no todas las rutas HTTP son ya APIs de datos persistidos.

### Ligas y equipo fantasy — parcialmente implementado

- `components/dashboard/LeagueManager.tsx` carga las ligas del usuario desde `private_league_members` y llama a las RPC `create_private_league`, `join_private_league` y `leave_private_league`.
- Crear/unirse redirige a `/fantasy?league_id=...`.
- `FantasyTeamBuilder` obtiene el equipo mediante `/api/fantasy-team` y usa Supabase para consultar la jornada seleccionada y llamar a `transfer_player`.
- Las acciones de compra/venta recargan el equipo tras la RPC.
- La lectura depende de que ya exista un `fantasy_teams` para la liga; el endpoint devuelve 404 si no lo encuentra.
- No se puede certificar desde este paquete que las RPC creen el equipo, el presupuesto y la alineación inicial de forma atómica: el contenido SQL de `supabase/migrations/` fue excluido del archivo empaquetado y la prueba de esquema no verifica la lógica de negocio.

### Alineaciones — incompleto

- Existen tablas y tipos de dominio para `lineups` y `lineup_players` y funciones de validación de plantilla/alineación en `fantasy-team.service.ts`.
- En `FantasyTeamBuilder.tsx`, `toggleLineup` solo muestra `alert("Guardar alineación se conectará en la Fase 8")`. No guarda ni elimina jugadores de la alineación.
- La API `/api/fantasy-team` lee la primera alineación encontrada, no ofrece un endpoint de guardado y no distingue la alineación de la jornada seleccionada.

## Esquema y pruebas

- `scripts/tests/test-supabase-schema.ts` espera 20 tablas y comprueba columnas, algunos tipos/nullabilidad, restricciones, relaciones, índices, RLS, políticas y privilegios de RPC en una transacción `READ ONLY`.
- La documentación previa informa de una ejecución exitosa de esa prueba contra Supabase remoto. No se ha repetido en esta revisión, porque la instantánea no aporta credenciales ni un resultado de ejecución.
- Una prueba de esquema no comprueba que creación/unión/salida/transferencias funcionen en escenarios reales ni que la lógica RPC sea atómica.
- Los archivos SQL de migraciones están explícitamente excluidos de `repomix-output.xml`; por tanto, no es posible comparar aquí el SQL de definición de RPC con el test de esquema.
- Los conteos de filas de catálogo son valores informados por documentación, no comprobados por `test:supabase:schema`.

## Estado del plan por fase

| Fase | Estado basado en el código incluido | Observaciones |
| --- | --- | --- |
| 1–5: dominio, scoring, persistencia de catálogo, ingesta y lectura | Implementado en gran parte | La documentación previa registra la ingesta y la prueba remota; los conteos deben revalidarse. |
| 6: ligas y equipo inicial | Parcial | UI llama a RPC de crear/unirse/salir y existe lectura del equipo; inicialización transaccional no verificable sin las migraciones. |
| 7: mercado y transferencias | Parcial | La UI llama a `transfer_player`; falta evidencia de tests funcionales de negocio en la instantánea. |
| 8: edición/bloqueo de alineaciones | Pendiente | El handler actual es un placeholder. |
| 9: puntuación persistida y clasificación privada | Pendiente | El scoring de jugador se calcula al consultar la API; no se persiste resultado fantasy ni se muestra clasificación funcional. |
| 10: UI persistente completa | Parcial | Algunas lecturas y operaciones pasan por Supabase/RPC, pero la alineación no guarda cambios y faltan flujos. |
| 11: end-to-end | Pendiente de evidencia | No se incluyó una suite E2E en el árbol empaquetado. |
| 12: despliegue | Pendiente de evidencia | El paquete no documenta un despliegue verificado. |

## Prioridades inmediatas

1. Actualizar el flujo de temporada: validar que `season` pertenece a `competition` en `/api/fantasy-round-scores`, quitar o centralizar los IDs fijos `152` y `186` y asegurar que roster, ligas y puntuaciones usan la misma competición/temporada.
2. Revisar las migraciones reales y probar creación/unión/salida de liga, inicialización del equipo y `transfer_player` con dos usuarios de prueba.
3. Implementar el guardado de alineaciones, la validación server-side y el bloqueo por intervalo de la jornada.
4. Persistir el scoring y construir la puntuación/clasificación privada si sigue dentro del MVP.
5. Revalidar los conteos de Supabase y ejecutar los tests declarados en `package.json` antes de dar por cerrada cada fase.

# Guía de acción: datos reales, mercado y ligas fantasy

## Situación actual

La aplicación tiene una demo en memoria en `components/fantasy/FantasyTeamBuilder.tsx`.
Los jugadores, clubes, precios y puntuaciones de la temporada 25-26 proceden de
`lib/data/season-25-26/players.ts`. El scraper ya obtiene partidos y estadísticas
de RFEVB, pero todavía no existe una sincronización persistente ni un modelo de
ligas, presupuestos, valoraciones históricas o mercados temporales.

La evolución recomendada es sustituir los mocks detrás de contratos estables,
sin hacer que la UI conozca si los datos proceden del scraper, Supabase o una
fuente externa.

## Fase 1: fijar el modelo de datos real

Crear entidades persistentes separando datos deportivos, fantasy y competición:

- `seasons`: temporada, competición, fechas y estado.
- `clubs`: identificador oficial, nombre, abreviatura y escudo.
- `players`: identificador estable, nombre, dorsal, posición y club actual.
- `matches`: partido, jornada, fecha, equipos y resultado.
- `player_match_stats`: estadísticas normalizadas por jugador y partido.
- `player_round_scores`: puntuación fantasy calculada e inmutable por jornada.
- `player_market_values`: histórico de valor con fecha de inicio y fin.
- `fantasy_teams`: equipo fantasy propiedad de un usuario.
- `fantasy_team_players`: plantilla con fechas de alta y baja.
- `fantasy_lineups`: alineación bloqueada para una jornada.
- `leagues`: ligas privadas.
- `league_members`: usuarios, estado y rol dentro de la liga.
- `league_round_scores`: clasificación materializada por jornada.

Los identificadores no deben depender únicamente del nombre. Prioridad:
identificador oficial de RFEVB, después una clave compuesta estable
(`competition + season + club + dorsal`) y, solo como último recurso, un slug.

## Fase 2: sustituir mocks por datos reales

1. Mantener el scraper como adaptador externo, no como fuente directa para la UI.
2. Crear un proceso de ingesta idempotente:
    - descarga partidos de una competición y temporada;
    - guarda o actualiza partidos;
    - obtiene estadísticas de cada partido;
    - normaliza nombres, posiciones, clubes y valores nulos;
    - registra errores y permite reintentar.
3. Ejecutar la ingesta con una tarea programada, nunca desde una petición del
   navegador.
4. Guardar una marca de sincronización por competición, temporada y jornada.
5. Recalcular puntuaciones únicamente cuando todos los partidos de la jornada
   estén cerrados o cuando una tarea de corrección lo solicite.
6. Cambiar `FantasyTeamBuilder` para consumir un `FantasyCatalogService`,
   inicialmente respaldado por datos mock y después por Supabase, sin cambiar
   sus componentes de presentación.

Antes de producción hay que verificar con muestras reales:

- jugadores que cambian de club;
- dorsales repetidos entre clubes;
- posiciones ausentes o inconsistentes;
- jugadores que aparecen en estadísticas pero no en el listado de plantilla;
- partidos aplazados y jornadas incompletas;
- cambios en el HTML de RFEVB.

El scraper actual devuelve estadísticas agregadas y no siempre la participación
por set. La puntuación debe marcarse como provisional si faltan datos necesarios,
en lugar de convertir silenciosamente un dato desconocido en cero.

## Fase 3: definir la valoración de jugadores

Separar tres conceptos:

1. **Puntuación deportiva**: puntos obtenidos en cada partido y jornada según una
   versión concreta de `ScoringSystem`.
2. **Valor de mercado**: precio utilizado para comprar y vender.
3. **Rendimiento esperado**: estimación utilizada para ordenar el mercado, que no
   debe modificar retrospectivamente la puntuación real.

Propuesta inicial de puntuación deportiva por posición:

- puntos de ataque y bloqueo;
- aces y eficiencia de saque;
- recepción positiva y excelente para receptores;
- asistencias o participación contextual para colocadores, si la fuente lo permite;
- sets jugados y bonus por victoria;
- penalizaciones por errores, tarjetas o baja participación, solo si los datos
  son fiables.

No conviene asignar pesos arbitrarios por posición sin validarlos. El proceso
recomendado es:

1. definir una fórmula versionada;
2. calcularla con temporadas históricas;
3. comparar la distribución por posición;
4. evitar que una posición sea estructuralmente dominante;
5. publicar el cambio de fórmula sin reescribir jornadas cerradas.

Para el precio inicial:

`precio inicial = base de posición + ajuste por rendimiento histórico + ajuste por titularidad + ajuste por disponibilidad`

Después, normalizar el rango para evitar precios negativos o concentrados en un
intervalo demasiado estrecho. Guardar siempre el motivo y la versión del cálculo.

## Fase 4: mercado de fichajes variable cada 24 horas

Hay dos estrategias válidas:

### Mercado rotatorio

Cada equipo puede comprar únicamente una selección diaria de jugadores. Un job
diario genera el mercado para cada liga o globalmente:

- semilla basada en `fecha UTC + identificador de liga`;
- jugadores elegibles y disponibles;
- reglas de equilibrio por posición;
- duración exacta de 24 horas;
- registro inmutable del mercado generado.

Ventaja: experiencia sencilla y controlada.

Entidades adicionales:

- `market_windows`: ventana, inicio, fin y estado;
- `market_listings`: jugador, precio y disponibilidad;
- `transfers`: comprador, jugador, precio, fecha, jornada y ventana;
- `transfer_limits`: límite por jornada, coste o saldo.

Las operaciones deben ser transaccionales: comprobar saldo, límite, ventana,
pertenencia del jugador y concurrencia antes de confirmar. No confiar en el
cliente para estas comprobaciones.

## Fase 5: presupuesto, plantillas y fichajes

Añadir al equipo fantasy:

- presupuesto inicial;
- saldo actual;
- valor total de plantilla;
- historial de compras y ventas;
- número de fichajes usados por jornada;
- posibles penalizaciones por fichajes adicionales;
- bloqueo de operaciones cuando empieza la jornada.

La regla de “máximo 14 jugadores” debe permanecer en el dominio. La alineación
debe guardarse por jornada, con fecha de bloqueo y validación de posiciones.
Vender un jugador no debe borrar el historial de puntuaciones ya obtenidas.

## Fase 6: ligas para competir con amigos

Crear un flujo de liga:

1. un usuario crea una liga con nombre, temporada y reglas;
2. el servidor genera un código o enlace de invitación;
3. otros usuarios se unen autenticados;
4. el creador puede expulsar miembros o cerrar la liga;
5. al terminar cada jornada se calcula la clasificación;
6. la clasificación muestra jornada, total acumulado, posición y variación.

Reglas recomendadas:

- congelar la alineación al comienzo de cada jornada;
- usar la misma puntuación para todos los miembros;
- desempatar por puntos de la jornada, después valor de plantilla y finalmente
  fecha de inscripción;
- no recalcular clasificaciones históricas salvo corrección explícita;

Seguridad Supabase:

- RLS para que cada usuario solo edite sus equipos;
- miembros de una liga pueden leer su clasificación;
- solo el creador administra invitaciones;
- procesos de ingesta y cierre de jornadas usan funciones seguras del servidor;
- nunca exponer `SUPABASE_SECRET_KEY` al navegador.

## Fase 7: arquitectura de aplicación

Mantener estas responsabilidades separadas:

- `lib/scraper/`: extracción externa;
- `lib/services/ingestion/`: sincronización y normalización;
- `lib/services/fantasy/`: reglas de plantilla, alineación, fichajes y valoración;
- `lib/services/leagues/`: creación, invitaciones y clasificación;
- `lib/repositories/`: acceso a Supabase;
- `domain/`: tipos y reglas puras;
- `app/api/`: casos de uso HTTP;
- `components/fantasy/`: presentación y estado de interacción.

La UI no debe calcular precios, cerrar jornadas ni validar permisos. Esas
operaciones deben vivir en servicios de servidor y transacciones de base de datos.

## Orden de implementación recomendado

1. Esquema Supabase y políticas RLS.
2. Identificación estable y catálogo real de jugadores.
3. Ingesta de partidos y estadísticas con reintentos.
4. Puntuación versionada por partido y jornada.
5. Presupuesto, plantilla y alineación persistentes.
6. Mercado diario y límites de fichajes.
7. Ligas privadas y clasificación por jornada.
8. Migración de la UI desde mocks al repositorio real.
9. Tests de dominio, integración del scraper y pruebas de concurrencia de fichajes.
10. Observabilidad: logs, errores de ingesta, métricas y alertas.

## Criterios de aceptación

- Los jugadores mostrados proceden de la temporada y competición configuradas.
- Una reejecución de la ingesta no duplica jugadores, partidos ni estadísticas.
- Una jornada cerrada produce la misma puntuación para todos los usuarios.
- El mercado cambia en una frontera UTC definida y no permite operaciones fuera
  de su ventana.
- Dos compras simultáneas no pueden gastar dos veces el mismo saldo.
- Un usuario no puede leer ni modificar equipos o ligas que no le correspondan.
- Los cambios de fórmula quedan versionados y no alteran jornadas cerradas.

## Nota

La persistencia de jugadores, puntuaciones, plantillas, fichajes y ligas debe
incorporarse de forma incremental. La demo actual puede conservarse como
adaptador de desarrollo hasta que el catálogo real y la primera jornada
sincronizada estén validados.

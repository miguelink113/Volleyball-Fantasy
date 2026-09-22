# Estado del proyecto

## Resumen

El proyecto tiene tres bloques con distinto nivel de madurez:

1. **Aplicación y autenticación**: funcionales en Next.js y Supabase Auth.
2. **Scraper y contratos deportivos**: funcionales bajo demanda, sin
   persistencia.
3. **Fantasy**: demo visual e interactiva en memoria; todavía no es el sistema
   fantasy persistente definitivo.

## Disponible actualmente

### Aplicación y control

- Next.js con App Router.
- Login y registro mediante Supabase Auth.
- Protección de `/dashboard` mediante `proxy.ts`.
- Rutas HTTP para partidos, estadísticas y catálogo de competición.

### Dominio

- Interfaces para competiciones, temporadas, equipos, jugadores, partidos y
  estadísticas.
- Tipos iniciales para equipos fantasy, alineaciones, ligas y puntuación.
- Identificadores RFEVB conservados como `rfevbId`.

### Scraper

- Partidos de una competición y temporada.
- Estadísticas agregadas de partidos.
- Equipos de una competición.
- Jugadores de las plantillas de sus equipos.
- Normalización de posiciones a `setter`, `opposite`, `outside`, `middle` y
  `libero`.
- Adaptación de equipos y jugadores a los contratos del dominio.

La competición `152` se ha comprobado con 12 equipos y 180 jugadores.

### Demo fantasy

- Ruta visual `/fantasy`.
- Mercado de fichajes separado de la gestión del equipo.
- Catálogo real cargado desde RFEVB.
- Mercado diario en memoria de 30 jugadores.
- Semilla UTC `YYYY-MM-DD`, estable durante el día y distinta al siguiente.
- Precios provisionales deterministas.
- Plantilla de hasta 14 jugadores.
- Alineación de 7 jugadores con validación de posiciones.
- Puntuación por jornada visible en la interfaz, actualmente sin datos reales.

## No implementado todavía

### Datos y persistencia

- Guardado de competiciones, temporadas, equipos, jugadores y partidos.
- Historial de cambios de club y de dorsal.
- Ingesta idempotente programada.
- Reintentos, control de sincronización y auditoría.

### Fantasy de producto

- Presupuesto y saldo.
- Compras y ventas transaccionales.
- Persistencia de plantilla y alineación por jornada.
- Bloqueo de alineaciones.
- Mercado persistente con ventanas de 24 horas.
- Puntuaciones calculadas desde estadísticas reales.
- Ligas privadas y clasificación.

### Calidad técnica

- Fixtures y tests automatizados del scraper.
- Corrección completa del adaptador histórico de partidos al dominio actual.
- Alineación de `BasicScoringSystem` con el contrato actual de scoring.
- Edición de perfil y recuperación de contraseña.
- Esquema Supabase y políticas RLS para las nuevas entidades fantasy.

## Límites importantes

Los componentes visuales no son todavía una fuente de verdad. La demo puede
reiniciarse al recargar la página, porque el mercado y el equipo están en
memoria. La semilla diaria solo controla qué jugadores y precios provisionales
se muestran; no constituye un mercado persistente ni una regla de negocio
definitiva.

El scraper tampoco es una base de datos. Consulta RFEVB bajo demanda y
devuelve resultados. La futura ingesta deberá guardar esos resultados antes de
que el fantasy pueda utilizarlos como catálogo oficial.

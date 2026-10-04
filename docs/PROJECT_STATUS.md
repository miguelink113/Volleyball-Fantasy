# Estado del proyecto

## Resumen ejecutivo

El proyecto se encuentra en una fase de prototipo funcional con una base de
arquitectura correcta, pero todavía sin la capa de persistencia y reglas de
producto que convertirán la demo en un sistema real de fantasy.

Las piezas actuales son:

1. Frontend y autenticación funcionales.
2. Backend HTTP y servicios de aplicación en funcionamiento.
3. Scraper deportivo operativo bajo demanda.
4. Demo fantasy interactiva, pero todavía en memoria.

## Alcance actual del proyecto

### Frontend / cliente

- Páginas y rutas de Next.js: `app/`.
- Componentes visuales de la demo fantasy y la aplicación.
- Estado del cliente en `hooks/`.
- Flujo de autenticación y entrada del usuario.

### Backend / servidor

- Rutas HTTP en `app/api/`.
- Validación y orquestación del scraper y servicios.
- Protección de rutas y sesión a través de `proxy.ts`.
- Lógica de negocio centralizada en `lib/services/`.

### Scraper / adaptador externo

- Consulta y normalización de datos de RFEVB.
- Compatibilidad con equipos, jugadores, partidos y estadísticas.
- No persiste resultados ni decide reglas del producto.

### App / dominio

- Modelos de competición, equipo, jugador, partido y fantasy.
- Reglas de validación de plantilla y alineación.
- Contratos de scoring y cálculo de demo.

## Estado actual por bloque

### Aplicación y autenticación

- Next.js con App Router.
- Login y registro con Supabase Auth.
- Protección de `/dashboard` mediante `proxy.ts`.
- Rutas para obtener partidos, estadísticas y catálogo deportivo.

### Dominio y reglas

- Contratos para competiciones, temporadas, equipos, jugadores y estadísticas.
- Tipos de fantasy, alineación y ligas.
- `rfevbId` conservado como identificador oficial del dato externo.

### Scraper

- Partidos por competición y temporada.
- Estadísticas agregadas y por jugador.
- Equipos y plantilla de cada club.
- Normalización de posiciones: `setter`, `opposite`, `outside`, `middle`,
  `libero`.
- Validado con la competición `152` (12 equipos y 180 jugadores).

### Demo fantasy

- Ruta `/fantasy` operativa.
- Mercado diario en memoria.
- Carga de catálogo real desde RFEVB.
- Plantilla con límite y alineación de 7 jugadores.
- Reglas de validación de posiciones y composición.
- Puntuación visible por jornada, sin datos reales conectados.

## Lo que todavía no está implementado

### Persistencia y datos

- Guardado de competiciones, temporadas, equipos, jugadores y partidos.
- Historial de cambios de club, dorsal y datos de evolución.
- Ingesta idempotente programada.
- Reintentos, control de sincronización y auditoría.

### Fantasy de producto

- Presupuesto y saldo real.
- Compras y ventas transaccionales.
- Persistencia de plantilla y alineación.
- Mercado persistente con ventanas de 24 horas.
- Puntuaciones calculadas con estadísticas reales.
- Ligas privadas y clasificación.

### Calidad técnica

- Fixtures y tests automatizados del scraper.
- Corrección completa del adaptador histórico de partidos.
- Alineación de `BasicScoringSystem` con el contrato actual.
- Recuperación de contraseña y edición de perfil.
- Esquema de base de datos y políticas RLS para entidades fantasy.

## Límites importantes

- La demo visual no es fuente de verdad del producto final.
- El estado del mercado y del equipo se pierde al recargar la página.
- El scraper no es una base de datos; solo consulta la web bajo demanda.
- La semilla diaria solo determina los precios provisionales de la demo.
- La app todavía necesita una capa persistente antes de convertirse en un
  producto de fantasy completo.

## Objetivos para la primera iteración

1. Consolidar los contratos del dominio y los adaptadores de datos.
2. Añadir tests y fixtures del scraper para cubrir casos reales y no solo
   muestras manuales.
3. Implementar la persistencia mínima de competiciones, equipos y jugadores.
4. Crear un flujo de ingesta idempotente con trazabilidad y control de errores.
5. Sustituir la carga directa del cliente por datos del backend persistido.
6. Versionar el cálculo de puntuación para soportar evolución del modelo.
7. Preparar la infraestructura para el mercado y la plantilla persistente.

## Criterio de éxito de la base del proyecto

La primera iteración se considera exitosa cuando:

- los datos deportivos se pueden reproducir y guardar de forma estable;
- el scraper tiene pruebas y no duplica entidades;
- la aplicación distingue claramente entre UI, servidor y dominio;
- la demo fantasy puede evolucionar hacia un sistema persistente sin reescribir
  toda la arquitectura.

# Arquitectura del proyecto

## 1. Scope del producto

Volleyball Fantasy es una aplicación web para gestionar un fantasy de voleibol con datos reales de la RFEVB. La base actual combina:

- un frontend de usuario con Next.js;
- autenticación con Supabase;
- un scraper funcional para consultar equipos, jugadores, partidos y estadísticas;
- una demo fantasy con mercado y alineación en memoria.

La intención no es que la demo constituyera el producto final, sino dejar una base técnica que pueda evolucionar hacia un sistema persistente con catálogo deportivo, mercado y ligas.

## 2. Separación por capas

### Frontend / cliente

Responsable de la experiencia visual y la interacción.

- `app/`: páginas y rutas de la aplicación.
- `components/`: UI reutilizable.
- `hooks/`: lógica interactiva del cliente.

Lo que debe hacer:

- mostrar datos;
- emitir acciones del usuario;
- consultar endpoints del backend;
- no decidir reglas persistentes ni consultar directamente RFEVB.

### Backend / servidor

Responsable de validar la entrada y orquestar casos de uso.

- `app/api/`: endpoints HTTP del proyecto.
- `lib/services/`: lógica de negocio y reglas reutilizables.
- `lib/supabase/`: clientes y helpers de Supabase.
- `proxy.ts`: protección de rutas y refresh de sesión.

Lo que debe hacer:

- validar parámetros;
- coordinar llamadas a scraper o servicios;
- encapsular acceso a Supabase;
- preparar la base para persistencia y transacciones.

### Scraper / adaptador externo

Responsable de extraer datos desde la web de RFEVB y convertirlos a modelos del dominio.

- `lib/scraper/`: descarga, parseo y normalización.
- `scripts/`: ingesta (`ingest/`), herramientas de inspección (`tools/`), tests (`tests/`) y fixtures (`fixtures/`).

Lo que debe hacer:

- consultar la fuente externa;
- transformar HTML a estructuras estandarizadas;
- conservar `rfevbId` y otros identificadores oficiales;
- no decidir reglas de mercado ni persistencia.

### App / dominio

Centraliza la semántica del producto.

- `domain/`: contratos y entidades del juego y del deporte.
- `lib/domain/`: adaptadores y transformaciones entre datos del scraper y el dominio.
- `lib/services/fantasy/`: reglas de equipo, alineación y lógica de la demo.

Lo que debe hacer:

- modelar competiciones, equipos, jugadores, partidos y scoring;
- definir reglas de validación de plantilla y alineación;
- servir de base para servicios posteriores con persistencia.

## 3. Cliente vs servidor

El proyecto ya separa dos responsabilidades operativas:

- cliente: UI, formularios, navegación y experiencia del usuario;
- servidor: validación, lógica y acceso a servicios.

Esta separación es necesaria porque la demo fantasy actual todavía se ejecuta en memoria del cliente, pero la intención futura es mover esa lógica al servidor para asegurar consistencia, presupuesto, concurrente y seguridad.

## 4. Scraper vs app

La relación actual es:

- el scraper alimenta la app con datos reales de RFEVB;
- la app los transforma y los consume para la demo fantasy;
- la app no debe reemplazar la fuente de verdad con HTML directo ni guardar resultados sin revisar su propósito.

La base actual permite evolucionar hacia una ingesta persistente con un catálogo centralizado y versionado.

## 5. Estado actual del sistema

### Funcional

- app Next.js con App Router;
- autenticación con Supabase;
- dashboard protegido;
- catálogo deportivo persistido (competiciones, temporadas, equipos, jugadores)
  para las 4 competiciones 25/26: 94 equipos y 1449 jugadores;
- ingesta idempotente de jornadas, partidos y estadísticas de jugador
  (`../scripts/ingest/ingest-matches.ts`), con resolución de nombres de equipo y cruce de
  jugadores de acta → roster;
- aliases de nombres de equipo persistidos en `team_source_aliases`;
- `ScoringSystemV1` versionado y probado, aplicable a las estadísticas
  persistidas;
- rutas API de scraper todavía activas para partidos, estadísticas y rosters;
- demo fantasy con mercado y alineación en memoria.

### Provisional

- la ingesta de partidos solo se ha ejecutado para la competición 152 (Superliga
  Masculina 25/26). Las otras tres competiciones 25/26 tienen roster pero no
  partidos;
- no existe persistencia del mercado ni de la plantilla fantasy;
- no hay repositorios de lectura tipados sobre el catálogo persistido;
- el scoring no se persiste todavía en `player_match_scores` ni
  `player_round_scores`;
- las reglas de negocio del fantasy siguen acopladas a la demo;
- `/fantasy` y las rutas API leen RFEVB en vivo en lugar del catálogo
  persistido.

## 6. Objetivos de la primera iteración

1. estabilizar el dominio y los contratos de partidos y scoring;
2. cubrir el scraper con fixtures y pruebas;
3. crear una persistencia mínima para catálogo deportivo;
4. implementar ingesta idempotente con sincronización y trazabilidad;
5. mover la lógica del mercado y la plantilla del cliente al servidor;
6. preparar la base para presupuesto, mercado persistente y ligas.

## 7. Principios de diseño

- El cliente no debe ser fuente de verdad.
- El scraper no debe decidir producto.
- El servidor debe validar y coordinar.
- El dominio debe mantenerse independiente de Next.js, Supabase y HTML.
- El producto debe crecer desde un prototipo funcional hacia un sistema persistente y verificable.

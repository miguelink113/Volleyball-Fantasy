# Desarrollo local

## Requisitos

- Node.js compatible con Next.js 16.
- npm.
- Un proyecto Supabase configurado.

## Puesta en marcha

```bash
npm install
npm run dev
```

La aplicación se inicia normalmente en `http://localhost:3000`.

## Comandos disponibles

```bash
npm run dev
npm run build
npm run start
npm run test:supabase
```

`npm run test:supabase` requiere las variables descritas en
`AUTHENTICATION.md` y acceso a un proyecto Supabase de pruebas.

## Estructura principal

- `app/`: páginas y rutas HTTP de Next.js.
- `components/`: componentes React reutilizables.
- `domain/`: tipos del dominio fantasy y de la lógica de negocio.
- `hooks/`: estado interactivo del cliente.
- `lib/data/season-25-26/`: datos en memoria de la temporada 25-26 para la demo fantasy.
- `lib/supabase/`: clientes y sincronización de sesión.
- `lib/scraper/`: extracción de datos de RFEVB.
- `lib/services/`: acceso a datos y servicios de aplicación, incluyendo fantasy.

## Módulo fantasy

La aplicación incluye ya una demo de equipo fantasy en la ruta `/fantasy`.

### Qué hace

- Gestiona una plantilla de hasta 14 jugadores para la temporada 25-26.
- Requiere una alineación válida con exactamente 7 jugadores:
  - 1 colocador
  - 1 líbero
  - 1 opuesto
  - 2 centrales
  - 2 receptores
- Muestra la puntuación de la alineación en cada jornada (1 a 8) con datos de ejemplo.
- Permite fichar y vender jugadores desde un mercado en memoria.

### Arquitectura

- `domain/fantasy/`: tipos de dominio del fantasy.
- `lib/services/fantasy/`: validaciones de plantilla y alineación, cálculo de puntos y lógica de transferencia.
- `components/fantasy/`: vista de construcción del equipo y panel de puntuación.

### Importante

Los jugadores y sus puntuaciones se mantienen en memoria para esta fase. No se persisten en Supabase ni se guardan en base de datos. La intención es dejar preparado el dominio para una capa de persistencia posterior.

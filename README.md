# Volleyball Fantasy

Aplicación web de fantasy de voleibol construida con Next.js, TypeScript y
Supabase Auth. El proyecto combina un scraper de datos de RFEVB con una demo
interactiva de mercado, plantilla y alineación fantasy.

## Estado actual

La aplicación tiene tres partes diferenciadas:

- **Scraper**: obtiene equipos, jugadores, partidos y estadísticas de RFEVB
  bajo demanda.
- **Dominio y servicios**: define los contratos deportivos y las reglas de
  plantilla, alineación y selección diaria del mercado.
- **Interfaz**: muestra el mercado de fichajes, el equipo fantasy y la
  alineación en `/fantasy`.

La demo fantasy utiliza jugadores reales de la competición RFEVB `152`. El
mercado diario, los precios y el equipo seleccionado son provisionales y viven
en memoria; todavía no existe persistencia del catálogo ni del equipo fantasy.
Los contratos de dominio y el adaptador histórico de partidos ya están
alineados con la interfaz actual de scoring, aunque el sistema de puntuación
definitivo todavía pertenece a la fase 2.

## Inicio rápido

Requisitos:

- Node.js compatible con Next.js 16.
- npm.
- Variables de Supabase para las funciones de autenticación.

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Probar el scraper

Con el servidor iniciado:

```text
http://localhost:3000/api/competition-roster?competition=152
```

La respuesta incluye equipos y jugadores con sus identificadores oficiales
`rfevbId`. También se pueden consultar partidos y estadísticas mediante las
rutas documentadas.

## Estructura

```text
app/                 Páginas y rutas HTTP de Next.js
components/          Componentes de presentación
domain/              Contratos y tipos del dominio
hooks/               Estado interactivo del cliente
lib/scraper/         Extracción y normalización de RFEVB
lib/services/        Reglas y servicios de aplicación
lib/supabase/        Clientes y sesión de Supabase
scripts/              Utilidades ejecutables
docs/                 Documentación del proyecto
```

## Documentación

- [Estado del proyecto](docs/PROJECT_STATUS.md)
- [Desarrollo local y arquitectura](docs/DEVELOPMENT.md)
- [Scraper y endpoints](docs/SCRAPER.md)
- [Sistema de puntuación](docs/SCORING.md)
- [Autenticación](docs/AUTHENTICATION.md)
- [Plan de evolución](docs/plan.md)

## Comandos

```bash
npm run dev
npm run build
npm run start
npm run test:domain
npm run test:match-parser -- 1 1
npm run test:supabase
npm run show:match-scores -- 1 1
```

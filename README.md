# Volleyball Fantasy

Aplicación web de fantasy de voleibol construida con Next.js, TypeScript y Supabase Auth.

## Scope del proyecto

Volleyball Fantasy es una aplicación de fantasy de voleibol orientada a un
modelo realista y competitivo, en la que cada usuario gestiona un equipo con
jugadores reales y compite en ligas y clasificaciones según el rendimiento deportivo.

El producto final combina:

- autenticación y perfil de usuario;
- catálogo deportivo real con equipos, jugadores y partidos;
- gestión de plantilla, alineación y mercado de fichajes;
- puntuación por jornada basada en estadísticas reales;
- ligas privadas y clasificación general;
- persistencia fiable y reglas de negocio en servidor.

## Estado actual

### Lo que existe

- app Next.js con App Router;
- login/registro con Supabase Auth;
- dashboard protegido;
- rutas API para matches, estadísticas y rosters;
- demo de fantasy con mercado, plantilla y alineación en memoria;
- catálogo deportivo real de la competición `152` cargado desde RFEVB.

### Lo que todavía no está resuelto

- persistencia del catálogo, mercado y plantilla;
- ingesta idempotente del scraper;
- scoring real vinculado a estadísticas de partidos;
- mercado y presupuesto completos por usuario;
- ligas privadas y clasificación.

## División principal del proyecto

- Frontend / cliente: `app/`, `components/`, `hooks/`
- Backend / servidor: `app/api/`, `lib/services/`, `lib/supabase/`, `proxy.ts`
- Scraper / adaptador externo: `lib/scraper/`
- Dominio / app logic: `domain/`, `lib/domain/`, `lib/services/fantasy/`

## Inicio rápido

Requisitos:

- Node.js compatible con Next.js 16
- npm
- variables de entorno de Supabase

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Endpoints principales

```text
http://localhost:3000/api/competition-roster?competition=152
http://localhost:3000/api/matches?competition=152&season=186
http://localhost:3000/api/match-statistics?matchId=13881&competition=152&category=362&season=186
```

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Estado del proyecto](docs/PROJECT_STATUS.md)
- [Desarrollo local](docs/DEVELOPMENT.md)
- [Scraper y endpoints](docs/SCRAPER.md)
- [Autenticación](docs/AUTHENTICATION.md)
- [Alcance del proyecto](docs/PROJECT_SCOPE.md)

## Comandos

```bash
npm run dev
npm run build
npm run start
npm run test:supabase
npm run show:first-match-scores
```

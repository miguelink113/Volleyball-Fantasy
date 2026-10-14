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

El catálogo de las cuatro competiciones 25/26 está persistido en Supabase
(94 equipos, 1449 jugadores), junto con las jornadas, partidos y estadísticas de
jugador de la Superliga Masculina 152/186 (150 partidos, 3859 stats). El scoring
está definido y probado (`ScoringSystemV1`), pero todavía no se persiste. La
demo fantasy sigue leyendo RFEVB en vivo: mercado, plantilla y alineación viven
en memoria. Migrar las lecturas al catálogo persistido y conectar los
repositorios es el objetivo de la Fase 5 en curso.

## Inicio rápido

Requisitos:

- Node.js compatible con Next.js 16.
- npm.
- Variables de Supabase para las funciones de autenticación.
- Para comprobar el esquema remoto: acceso de lectura a la base de datos
  Supabase mediante `SUPABASE_REMOTE_DB_URL`.

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
npm run test:supabase:schema
npm run show:match-scores -- 1 1
```

`test:supabase:schema` compara las tablas, columnas, restricciones clave,
índices, RLS, políticas y permisos RPC del proyecto remoto con el modelo
esperado. Solo realiza consultas dentro de una transacción `READ ONLY`; requiere
`SUPABASE_REMOTE_DB_URL` configurada localmente y nunca aplica migraciones.

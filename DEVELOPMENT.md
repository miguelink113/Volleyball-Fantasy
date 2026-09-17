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
- `domain/`: tipos del dominio fantasy.
- `hooks/`: estado interactivo del cliente.
- `lib/supabase/`: clientes y sincronización de sesión.
- `lib/scraper/`: extracción de datos de RFEVB.
- `lib/services/`: acceso a datos y servicios de aplicación.

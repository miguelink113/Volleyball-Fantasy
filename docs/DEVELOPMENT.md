# Desarrollo local

## Requisitos

- Node.js compatible con Next.js 16.
- npm.
- proyecto Supabase configurado con variables de entorno.

## Inicio rápido

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Variables de entorno

Necesarias para autenticación y soporte de Supabase:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

Consulta `docs/AUTHENTICATION.md` para más detalle.

## Comandos útiles

```bash
npm run dev
npm run build
npm run start
npm run test:supabase
npm run show:first-match-scores
```

- `npm run test:supabase`: valida auth y perfiles en Supabase.
- `npm run show:first-match-scores`: intenta consultar el scraper y mostrar resultados de ejemplo.

## Flujo de trabajo recomendado

1. iniciar la aplicación en local;
2. comprobar el scraper con una competición real como `152`;
3. validar la autenticación con Supabase;
4. revisar la demo fantasy en `/fantasy`;
5. usar `docs/ARCHITECTURE.md` para entender límites entre cliente, servidor y scraper.

## Rutas de prueba relevantes

```text
http://localhost:3000/api/competition-roster?competition=152
http://localhost:3000/api/matches?competition=152&season=186
http://localhost:3000/api/match-statistics?matchId=13881&competition=152&category=362&season=186
```

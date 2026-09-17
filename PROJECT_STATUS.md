# Estado del proyecto

## Disponible actualmente

- Aplicación Next.js con App Router.
- Página de inicio básica con el nombre del usuario autenticado.
- Login y registro mediante Supabase Auth.
- Protección de `/dashboard` en servidor mediante `proxy.ts`.
- Scraper de partidos y estadísticas de RFEVB.
- Interfaces TypeScript iniciales para el dominio.

## Pendiente

- Persistir competiciones, temporadas, equipos, jugadores y partidos.
- Crear la lógica de equipos fantasy y puntuación.
- Sustituir las estadísticas de ejemplo del dashboard por datos reales.
- Añadir tests automatizados del scraper con HTML de prueba.
- Añadir edición de perfil y recuperación de contraseña.
- Completar la configuración documentada de la base de datos y RLS.

La funcionalidad fantasy todavía no se considera implementada. El scraper
actual obtiene datos bajo demanda, pero aún no los almacena ni los transforma
en una competición jugable.

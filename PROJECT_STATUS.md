# Estado del proyecto

## Disponible actualmente

- Aplicación Next.js con App Router.
- Página de inicio básica con el nombre del usuario autenticado.
- Login y registro mediante Supabase Auth.
- Protección de `/dashboard` en servidor mediante `proxy.ts`.
- Scraper de partidos y estadísticas de RFEVB.
- Interfaces TypeScript del dominio conectadas con los datos del scraper.
- Sistema de puntuación sustituible: 1 punto por set jugado más el valor G-P.
- Script para consultar y puntuar el primer partido de la jornada 1.

## Pendiente

- Persistir competiciones, temporadas, equipos, jugadores y partidos.
- Sustituir las estadísticas de ejemplo del dashboard por datos reales.
- Añadir tests automatizados del scraper con HTML de prueba.
- Añadir edición de perfil y recuperación de contraseña.
- Completar la configuración documentada de la base de datos y RLS.

La funcionalidad fantasy todavía no se considera implementada por completo.
El scraper obtiene datos bajo demanda y ya existe un adaptador hacia las
interfaces del dominio, junto con una primera política de puntuación
reemplazable. Todavía falta persistir esos datos y construir la experiencia
jugable de equipos fantasy.

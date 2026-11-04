# Directrices Globales para GitHub Copilot

## Contexto del Proyecto (Vital)
- **Stack**: Next.js 16 (App Router), TypeScript, Supabase (PostgreSQL), Tailwind CSS.
- **Arquitectura**:
    - `lib/scraper/`: Extracción de datos de RFEVB (Cheerio).
    - `scripts/ingest/`: Scripts para guardar datos en Supabase.
    - `lib/repositories/`: Patrón repositorio para leer de Supabase.
    - `app/api/`: Rutas API (Next.js) que consumen los repositorios.
    - `components/`: UI (React).
- **Base de Datos**: Soporte multi-grupo usando la columna `group_name`. Las jornadas se agrupan por `round_number` en la UI.
- **Idioma**: El código, variables, funciones y comentarios deben estar en **inglés**. Las respuestas del chat y la documentación de usuario en **español**.

## Seguridad (Prioridad Máxima)
- **Nunca** hardcodees secretos, claves API o contraseñas.
- **Nunca** uses `createAdminClient()` (Service Role Key) en componentes de React o código que llegue al navegador. Solo en API Routes, Server Actions o scripts.
- Valida y sanea siempre las entradas del usuario antes de usarlas en consultas a Supabase o comandos.
- Usa siempre `try/catch` en peticiones asíncronas (especialmente en el scraper) y configura timeouts de red.

## Clean Code y Mantenibilidad
- Aplica las directrices de la skill `ponytail` (elige siempre la solución más simple que funcione, evita sobreingeniería).
- Escribe funciones pequeñas que hagan una sola cosa. Prioriza la claridad sobre la "cleverness".
- No uses `any` en TypeScript. Usa `unknown` y estrecha el tipo, o define interfaces.
- Añade docstrings (JSDoc) a las funciones complejas explicando parámetros y retornos.

## Uso de Skills Disponibles
Tienes skills instaladas en `.github/skills/`. Úsalas cuando sea relevante:
- `ponytail`: Para refactorizaciones, nuevas features y evitar código inflado.
- `caveman`: Si el usuario pide respuestas breves o "modo caveman".
- `security-review`: Cuando se pida auditar la seguridad o buscar vulnerabilidades.
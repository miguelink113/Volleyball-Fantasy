# Autenticación

La autenticación utiliza Supabase Auth y perfiles almacenados en la tabla
`profiles`. Cada perfil tiene un `username` único; no se almacena `full_name`.

## Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

Las dos primeras variables se utilizan en la aplicación. La clave secreta
solo se utiliza en `scripts/test-supabase-auth.ts` para preparar y limpiar
usuarios de prueba. No debe exponerse en el navegador ni incluirse en Git.

Para verificar la estructura de la base de datos remota, obtén la URI en el
Dashboard de Supabase: abre el proyecto, pulsa **Connect** y copia la cadena
**URI** de conexión a PostgreSQL. Añádela a `.env.local` (en la raíz del
repositorio, junto a las otras variables):

```text
SUPABASE_REMOTE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require
```

Usa la URI exacta que muestra el Dashboard; el valor de arriba solo ilustra el
formato. Si la conexión directa no está disponible en tu red, selecciona
**Session pooler** en la opción de conexión y utiliza la URI que proporciona
Supabase. Si la contraseña contiene caracteres reservados para URI, utiliza la
versión URL-encoded que muestra el Dashboard o codifica esos caracteres.

Guarda el archivo y vuelve a ejecutar:

```powershell
npm run test:supabase:schema
```

El mensaje `Missing required environment variable: SUPABASE_REMOTE_DB_URL`
significa que dotenv sí leyó `.env.local`, pero no encontró una línea con ese
nombre exacto (posiblemente solo cargó las otras tres variables). Comprueba que
el archivo esté en la raíz del repositorio, que el nombre no tenga espacios ni
comillas alrededor de la clave y que la línea no empiece por `#`. No compartas
ni publiques la URI: contiene la contraseña de la base de datos. El test solo
realiza consultas de catálogo dentro de una transacción `READ ONLY`; se
recomienda usar credenciales de lectura.

## Flujo de sesión

- `/login` permite iniciar sesión y registrarse.
- `proxy.ts` refresca la sesión en cada petición relevante.
- `proxy.ts` redirige al login cuando se intenta acceder a `/dashboard` sin
  sesión.
- Un usuario autenticado que visita `/login` es redirigido al dashboard.
- `app/page.tsx` obtiene el perfil en el servidor y muestra el nombre del
  usuario.

El hook `useAuth` mantiene el estado interactivo del formulario y del cliente
en el navegador. La protección de rutas no depende de ese estado: se ejecuta
en el servidor mediante el proxy.

## Prueba de Supabase

Con las tres variables configuradas se puede ejecutar:

```bash
npm run test:supabase
```

El script crea usuarios temporales, comprueba el trigger de `profiles`, valida
las políticas RLS y elimina los usuarios al terminar.

Para comprobar las tablas y objetos desplegados en el proyecto remoto:

```bash
npm run test:supabase:schema
```

Esta prueba inspecciona `information_schema` y catálogos de PostgreSQL sin
crear, alterar ni eliminar objetos. No utiliza `SUPABASE_SECRET_KEY` ni aplica
migraciones.

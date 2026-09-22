# Autenticación

La autenticación utiliza Supabase Auth y perfiles almacenados en la tabla
`profiles`.

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

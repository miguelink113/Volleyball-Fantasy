# Configuración de Supabase

Supabase ya está configurado en tu proyecto. Aquí están los pasos para empezar:

## Estructura

- `lib/supabase/client.ts` - Cliente de Supabase para el navegador
- `lib/supabase/server.ts` - Cliente de Supabase para el servidor
- `lib/supabase/middleware.ts` - Middleware para manejar sesiones
- `lib/hooks/useSupabase.ts` - Hook personalizado para React
- `middleware.ts` - Middleware de Next.js

## Variables de Entorno

Ya tienes configuradas las variables en `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Clave pública de Supabase

## Uso en Componentes Cliente

```typescript
"use client";

import { useSupabase } from "@/lib/hooks/useSupabase";

export default function MyComponent() {
  const { session, loading, error, signIn, signOut } = useSupabase();

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      {session ? (
        <div>
          <p>Bienvenido, {session.user.email}</p>
          <button onClick={() => signOut()}>Cerrar sesión</button>
        </div>
      ) : (
        <button onClick={() => signIn("user@example.com", "password")}>
          Iniciar sesión
        </button>
      )}
    </div>
  );
}
```

## Uso en Rutas API

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  // Obtener el usuario actual
  const { data: { user } } = await supabase.auth.getUser();

  // Hacer consultas a la base de datos
  const { data, error } = await supabase
    .from("your_table")
    .select("*");

  return NextResponse.json({ data });
}
```

## Uso en Componentes Servidor

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function MyServerComponent() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("your_table")
    .select("*");

  return <div>{/* Tu contenido aquí */}</div>;
}
```

## Generar Tipos TypeScript

Para mejores tipos en TypeScript, ejecuta:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > lib/database.types.ts
```

Reemplaza `YOUR_PROJECT_ID` con tu ID de proyecto de Supabase.

## Autenticación

El middleware automáticamente:
- Valida sesiones de usuario
- Refresca tokens expirados
- Sincroniza sesiones entre pestañas

Nota: si vas a crear perfiles al registrar usuarios desde el cliente, es recomendable crear un trigger en la base de datos que inserte automáticamente la fila en `profiles` cuando se crea un registro en `auth.users`. Esto evita errores de Row Level Security (RLS).

Ejemplo de trigger (ejecutar en SQL Editor de Supabase):

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, '');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Documentación

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase with Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
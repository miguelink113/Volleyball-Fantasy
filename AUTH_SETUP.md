# 🔐 Guía de Autenticación

## Configuración Completada

Tu autenticación está 100% configurada. Aquí está lo que incluye:

### 📦 Datos Guardados
- ✅ **Email** (manejado por Supabase automáticamente)
- ✅ **Contraseña** (manejado por Supabase automáticamente)
- ✅ **Nombre** (guardado en tabla `profiles`)

---

## 📋 Primero: Crear la Tabla en Supabase

⚠️ **IMPORTANTE**: Ve a https://app.supabase.com → tu proyecto → **SQL Editor** y ejecuta esto:

```sql
-- Crear tabla de perfiles de usuarios
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: Cada usuario solo puede ver su propio perfil
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Cada usuario puede actualizar su propio perfil
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Política: Los usuarios pueden insertar su propio perfil
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Opcional: crear un trigger para que al crear un usuario en auth.users
-- se inserte automáticamente una fila en `profiles` (evita errores RLS
-- al intentar insertar desde el cliente durante el registro).

-- Crea la función y el trigger:
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

Después de ejecutar esto, tu tabla estará lista.

---

## 🚀 Cómo Usar en tu App

### Opción 1: Componente Simple (Recomendado para Comenzar)

```typescript
import { SimpleAuth } from "@/lib/components/SimpleAuth";

export default function LoginPage() {
  return <SimpleAuth />;
}
```

**Esto incluye:**
- ✅ Formulario de registro
- ✅ Formulario de login
- ✅ Pantalla de usuario loggeado
- ✅ Botón de cerrar sesión
- ✅ Manejo de errores

---

### Opción 2: Hook Personalizado en Componentes

```typescript
"use client";

import { useSupabase } from "@/lib/hooks/useSupabase";

export default function MyComponent() {
  const { session, profile, loading, error, signIn, signOut } = useSupabase();

  if (loading) return <div>Cargando...</div>;

  if (session && profile) {
    return (
      <div>
        <p>Hola {profile.full_name}</p>
        <p>Email: {profile.email}</p>
        <button onClick={() => signOut()}>Logout</button>
      </div>
    );
  }

  return <div>Por favor inicia sesión</div>;
}
```

---

### Opción 3: Rutas API

#### Obtener Perfil del Usuario
```bash
GET /api/auth/profile

Respuesta:
{
  "user": {
    "id": "xxx",
    "email": "user@example.com"
  },
  "profile": {
    "id": "xxx",
    "email": "user@example.com",
    "full_name": "Juan Pérez",
    "created_at": "2024-08-19T...",
    "updated_at": "2024-08-19T..."
  }
}
```

#### Actualizar Perfil
```bash
PUT /api/auth/profile

Body:
{
  "full_name": "Nuevo Nombre",
  "email": "newemail@example.com"
}

Respuesta:
{
  "message": "Perfil actualizado",
  "profile": {...}
}
```

---

## 📚 Archivos Creados para Autenticación

```
lib/
├── supabase/
│   └── auth.ts              ← Funciones de autenticación
├── hooks/
│   └── useSupabase.ts       ← Hook mejorado con perfil
└── components/
    └── SimpleAuth.tsx       ← Componente listo para usar

app/api/auth/
└── profile/
    └── route.ts             ← Rutas API para perfil
```

---

## 🎯 Flujo de Registro

```
1. Usuario llena formulario:
   - Nombre: Juan Pérez
   - Email: juan@example.com
   - Contraseña: ****

2. SimpleAuth.tsx valida datos

3. signUp() ejecuta:
   - Crea usuario en auth.users (Supabase)
   - Un trigger (si lo has creado) inserta automáticamente la fila en `profiles`
     y luego el código actualiza el nombre del usuario

4. Sistema envía email de confirmación

5. Usuario confirma email

6. Puede iniciar sesión

7. Sesión guardada en cookies automáticamente
```

---

## 🔐 Flujo de Login

```
1. Usuario ingresa email + contraseña

2. signIn() envía a Supabase

3. Supabase verifica credenciales

4. Si es correcto:
   - Retorna sesión
   - Se guarda en cookies
   - useSupabase obtiene perfil

5. Componente muestra datos del usuario
```

---

## 🔄 Actualizar Perfil del Usuario

### Desde Componente Cliente

```typescript
"use client";

import { useSupabase } from "@/lib/hooks/useSupabase";

export function UpdateProfile() {
  const { profile, updateProfile } = useSupabase();

  const handleUpdate = async () => {
    try {
      const updated = await updateProfile({
        full_name: "Nuevo Nombre",
      });
      console.log("Perfil actualizado:", updated);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <p>Nombre actual: {profile?.full_name}</p>
      <button onClick={handleUpdate}>Actualizar Nombre</button>
    </div>
  );
}
```

### Desde Componente Servidor o Ruta API

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function AdminPanel() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Actualizar perfil de un usuario
  const { data: updated } = await supabase
    .from("profiles")
    .update({ full_name: "Nuevo Nombre" })
    .eq("id", user?.id)
    .select()
    .single();

  return <div>Perfil actualizado: {updated.full_name}</div>;
}
```

---

## 🛡️ Seguridad (Row Level Security)

Tu tabla `profiles` tiene políticas RLS:

| Acción | Quién Puede | Condición |
|--------|------------|-----------|
| VER | Usuario | Solo su propio perfil |
| ACTUALIZAR | Usuario | Solo su propio perfil |
| INSERTAR | Usuario | Solo su propio perfil |

Esto significa que **nadie puede ver los datos de otros usuarios** desde el cliente.

---

## 🐛 Troubleshooting

### Error: "No autenticado"
- Usuario no ha iniciado sesión
- Sesión expirada
- **Solución:** Hacer login nuevamente

### Error: "Perfil no encontrado"
- Usuario registrado pero perfil no creado
- Fallo en SQL
- **Solución:** Ejecutar el script SQL en Supabase manualmente

### Error: "Email already in use"
- Email ya registrado
- **Solución:** Usar diferente email o recuperar contraseña

### Hook no actualiza perfil
- Sesión no sincronizada
- **Solución:** Recargar página o esperar a que onAuthStateChange se ejecute

---

## 💡 Ejemplo Completo

### 1. Crear página de login

```typescript
import { SimpleAuth } from "@/lib/components/SimpleAuth";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <SimpleAuth />
    </div>
  );
}
```

### 2. Crear página protegida

```typescript
"use client";

import { useSupabase } from "@/lib/hooks/useSupabase";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  const { session, profile, loading } = useSupabase();

  if (loading) return <div>Cargando...</div>;

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <h1>Dashboard</h1>
      <p>Bienvenido, {profile?.full_name}</p>
      <p>Email: {profile?.email}</p>
    </div>
  );
}
```

### 3. Test en terminal

```bash
# Probar que la tabla existe
curl -X GET http://localhost:3000/api/auth/profile
# Deberías recibir un error 401 (no autenticado)
```

---

## ✅ Próximos Pasos

1. ✅ Ejecutar el SQL en Supabase
2. ✅ Usar `<SimpleAuth />` en tu página de login
3. ✅ Crear páginas protegidas con `useSupabase()`
4. ✅ Opcional: Personalizar estilos del componente

---

## 📖 Documentación Oficial

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/auth-signup)

---

## 🎉 ¡Listo!

Tu sistema de autenticación está 100% funcional. Solo necesitas ejecutar el SQL y empezar a usar.
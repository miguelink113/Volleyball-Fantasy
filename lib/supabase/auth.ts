import { createClient } from "@/lib/supabase/server";

/**
 * Obtiene el perfil completo del usuario autenticado
 * Incluye: email, nombre, fecha de creación
 */
export async function getUserProfile() {
  const supabase = await createClient();

  // Obtener el usuario autenticado
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "No autenticado", data: null };
  }

  // Obtener el perfil del usuario
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return { error: profileError.message, data: null };
  }

  return { error: null, data: profile };
}

/**
 * Registra un nuevo usuario y actualiza su perfil
 */
export async function registerUser(
  email: string,
  password: string,
  fullName: string
) {
  const supabase = await createClient();

  try {
    // Paso 1: Crear usuario en auth.users
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return { error: authError?.message || "Error en registro", data: null };
    }

    // Paso 2: El perfil se crea automáticamente por el trigger
    // Solo actualizamos el nombre
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
      })
      .eq("id", authData.user.id)
      .select()
      .single();

    if (profileError) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error actualizando nombre:", profileError);
      }
      // No lanzamos error porque el usuario está registrado
      return {
        error: null,
        data: { user: authData.user, profile: null },
      };
    }

    return {
      error: null,
      data: { user: authData.user, profile },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Error desconocido",
      data: null,
    };
  }
}

/**
 * Inicia sesión y retorna el perfil del usuario
 */
export async function loginUser(email: string, password: string) {
  const supabase = await createClient();

  try {
    // Paso 1: Iniciar sesión
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      return {
        error: authError?.message || "Error en inicio de sesión",
        data: null,
      };
    }

    // Paso 2: Obtener perfil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      return {
        error: "Usuario autenticado pero perfil no encontrado",
        data: authData.user,
      };
    }

    return {
      error: null,
      data: { user: authData.user, profile },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Error desconocido",
      data: null,
    };
  }
}

/**
 * Actualiza el perfil del usuario
 */
export async function updateUserProfile(
  userId: string,
  updates: { full_name?: string; email?: string }
) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return { error: error.message, data: null };
    }

    return { error: null, data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Error desconocido",
      data: null,
    };
  }
}

/**
 * Cierra sesión
 */
export async function logoutUser() {
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

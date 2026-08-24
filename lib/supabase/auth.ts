import { createClient } from "@/lib/supabase/server";

/**
 * Obtiene el perfil del usuario autenticado.
 */
export async function getUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "No autenticado",
      data: null,
    };
  }

  const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

  if (error) {
    return {
      error: error.message,
      data: null,
    };
  }

  return {
    error: null,
    data,
  };
}

/**
 * Actualiza el perfil de un usuario.
 */
export async function updateUserProfile(
    userId: string,
    updates: {
      full_name?: string;
      email?: string;
    }
) {
  const supabase = await createClient();

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
    return {
      error: error.message,
      data: null,
    };
  }

  return {
    error: null,
    data,
  };
}
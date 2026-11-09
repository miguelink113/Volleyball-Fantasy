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

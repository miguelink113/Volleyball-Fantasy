import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useSupabase() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Obtener sesión y perfil al montar
  useEffect(() => {
    const getSessionAndProfile = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);

        // Si hay sesión, obtener el perfil
        if (currentSession?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentSession.user.id)
            .single();

          if (profileError) {
            console.error("Error obteniendo perfil:", profileError);
          } else {
            setProfile(profileData);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    getSessionAndProfile();

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      // Cuando cambia la sesión, recargar perfil
      if (session?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(profileData || null);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  // Registrar usuario con nombre
  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      setError(null);
      try {
        // Registrar en auth.users
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email,
            password,
          }
        );

        if (authError || !authData.user) {
          throw new Error(authError?.message || "Error en registro");
        }

        // El perfil se crea automáticamente por el trigger
        // Ahora solo actualizamos el nombre
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
          })
          .eq("id", authData.user.id)
          .select()
          .single();

        if (profileError) {
          console.error("Error actualizando perfil:", profileError);
          // No lanzamos error aquí porque el usuario ya está registrado
        }

        return { user: authData.user, profile: profileData };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error desconocido";
        setError(errorMsg);
        throw err;
      }
    },
    [supabase]
  );

  // Iniciar sesión
  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) {
          throw new Error(signInError.message);
        }

        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error desconocido";
        setError(errorMsg);
        throw err;
      }
    },
    [supabase]
  );

  // Cerrar sesión
  const signOut = useCallback(async () => {
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setSession(null);
      setProfile(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMsg);
      throw err;
    }
  }, [supabase]);

  // Actualizar perfil
  const updateProfile = useCallback(
    async (updates: { full_name?: string; email?: string }) => {
      setError(null);
      try {
        if (!session?.user) {
          throw new Error("Usuario no autenticado");
        }

        const { data, error: updateError } = await supabase
          .from("profiles")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.user.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(updateError.message);
        }

        setProfile(data);
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error desconocido";
        setError(errorMsg);
        throw err;
      }
    },
    [supabase, session]
  );

  return {
    session,
    profile,
    loading,
    error,
    supabase,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };
}

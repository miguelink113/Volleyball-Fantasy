import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

import {
  getProfileById,
  updateProfileById,
} from "@/lib/services/profile.service";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadProfile = useCallback(
      async (userId: string) => {
        const { data, error } = await getProfileById(
            supabase,
            userId
        );

        if (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Error obteniendo perfil:", error);
          }

          setError(error.message);
          setProfile(null);
          return;
        }

        setProfile(data);
      },
      [supabase]
  );

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setSession(session);

        if (session?.user) {
          await loadProfile(session.user.id);
        }
      } catch (err) {
        setError(
            err instanceof Error
                ? err.message
                : "Error desconocido"
        );
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          setSession(session);

          if (session?.user) {
            await loadProfile(session.user.id);
          } else {
            setProfile(null);
          }
        }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const signUp = useCallback(
      async (
          email: string,
          password: string,
          fullName: string
      ) => {
        setError(null);

        try {
          const {
            data: authData,
            error: authError,
          } = await supabase.auth.signUp({
            email,
            password,
          });

          if (authError || !authData.user) {
            setError(
                authError?.message ||
                "Error en registro"
            );
            return null;
          }

          const {
            data: profileData,
            error: profileError,
          } = await updateProfileById(
              supabase,
              authData.user.id,
              {
                full_name: fullName,
              }
          );

          if (profileError) {
            setError(profileError.message);
          }

          return {
            user: authData.user,
            profile: profileData,
          };
        } catch (err) {
          const message =
              err instanceof Error
                  ? err.message
                  : "Error desconocido";

          setError(message);
          return null;
        }
      },
      [supabase]
  );

  const signIn = useCallback(
      async (
          email: string,
          password: string
      ) => {
        setError(null);

        try {
          const {
            data,
            error,
          } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            setError(error.message);
            return null;
          }

          return data;
        } catch (err) {
          const message =
              err instanceof Error
                  ? err.message
                  : "Error desconocido";

          setError(message);
          return null;
        }
      },
      [supabase]
  );

  const signOut = useCallback(async () => {
    setError(null);

    try {
      const { error } =
          await supabase.auth.signOut();

      if (error) {
        setError(error.message);
        return;
      }

      setSession(null);
      setProfile(null);
    } catch (err) {
      const message =
          err instanceof Error
              ? err.message
              : "Error desconocido";

      setError(message);
    }
  }, [supabase]);

  const updateProfile = useCallback(
      async (updates: {
        full_name?: string;
        email?: string;
      }) => {
        setError(null);

        try {
          if (!session?.user) {
            setError(
                "Usuario no autenticado"
            );
            return null;
          }

          const {
            data,
            error,
          } = await updateProfileById(
              supabase,
              session.user.id,
              updates
          );

          if (error) {
            setError(error.message);
            return null;
          }

          setProfile(data);

          return data;
        } catch (err) {
          const message =
              err instanceof Error
                  ? err.message
                  : "Error desconocido";

          setError(message);
          return null;
        }
      },
      [supabase, session]
  );

  return {
    session,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };
}
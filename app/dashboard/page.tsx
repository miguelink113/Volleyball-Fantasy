"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LeagueManager } from "@/components/dashboard/LeagueManager";

export default function DashboardPage() {
  const { session, profile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.push("/login");
  }, [session, loading, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 animate-pulse">Cargando perfil...</div>;
  if (!session || !profile) return null;

  return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-slate-900 shadow">
          <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
            <h1 className="text-xl font-bold text-white tracking-wide">Volleyball Fantasy</h1>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white">{profile.username}</p>
                <p className="text-xs text-slate-400">{profile.email}</p>
              </div>
              <button
                  onClick={() => signOut()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 flex items-center gap-6">
            <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-violet-700 text-3xl font-bold">
              {profile.username.charAt(0).toUpperCase()}
            </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">¡Hola, {profile.username}!</h2>
              <p className="text-slate-500 mt-1">Miembro desde {new Date(profile.created_at).toLocaleDateString("es-ES", { year: 'numeric', month: 'long' })}</p>
            </div>
          </div>

          <LeagueManager />
        </main>
      </div>
  );
}
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LeagueManager } from "@/components/dashboard/LeagueManager";

export default function DashboardPage() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.push("/login");
  }, [session, loading, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 animate-pulse">Cargando perfil...</div>;
  if (!session || !profile) return null;

  return (
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-500">Dashboard</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Mis Ligas</h1>
          </div>
        </header>
        <LeagueManager />
      </div>
  );
}
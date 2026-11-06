"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { LeagueManager } from "@/components/dashboard/LeagueManager";

export default function DashboardPage() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const [isCreateLeagueOpen, setIsCreateLeagueOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) router.push("/login");
  }, [session, loading, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 animate-pulse">Cargando perfil...</div>;
  if (!session || !profile) return null;

  return (
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-medium text-slate-500">Dashboard</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Mis Ligas</h1>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateLeagueOpen(true)}
            className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Liga
            </span>
          </button>
        </header>
        <LeagueManager
          isCreateLeagueOpen={isCreateLeagueOpen}
          onCloseCreateLeague={() => setIsCreateLeagueOpen(false)}
        />
      </div>
  );
}
"use client";

import { useSupabase } from "@/lib/hooks/useSupabase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { session, profile, loading, signOut } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.push("/login");
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <button
            onClick={() => signOut()}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {profile.full_name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                ¡Hola, {profile.full_name}!
              </h2>
              <p className="text-gray-600">{profile.email}</p>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información Personal */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Información Personal
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="text-lg font-medium text-gray-800">
                  {profile.full_name || "No especificado"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Correo Electrónico</p>
                <p className="text-lg font-medium text-gray-800">
                  {profile.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Miembro Desde</p>
                <p className="text-lg font-medium text-gray-800">
                  {new Date(profile.created_at).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Estadísticas
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded">
                <p className="text-sm text-gray-600">Torneos Participados</p>
                <p className="text-2xl font-bold text-blue-600">0</p>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <p className="text-sm text-gray-600">Equipos</p>
                <p className="text-2xl font-bold text-green-600">0</p>
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <p className="text-sm text-gray-600">Puntos Totales</p>
                <p className="text-2xl font-bold text-purple-600">0</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

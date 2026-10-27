import Link from "next/link";
import { getUserProfile } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data: profile } = await getUserProfile();

  if (!profile) {
    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm border border-slate-200">
            <h1 className="text-3xl font-bold text-slate-900">
              Volleyball Fantasy
            </h1>
            <p className="mt-3 text-slate-500">
              Inicia sesión para acceder a tu cuenta.
            </p>
            <Link
                href="/login"
                className="mt-6 inline-block w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              Iniciar sesión
            </Link>
          </div>
        </main>
    );
  }

  return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm border border-slate-200">
          <div className="w-20 h-20 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            {profile.username.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            ¡Hola, {profile.username}!
          </h1>
          <p className="mt-1 text-slate-500">{profile.email}</p>

          <Link
              href="/dashboard"
              className="mt-8 inline-block w-full rounded-lg bg-slate-900 px-4 py-3 font-bold text-white transition hover:bg-slate-800"
          >
            Ir a mi Dashboard
          </Link>
        </div>
      </main>
  );
}
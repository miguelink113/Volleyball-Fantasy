import Link from "next/link";
import { getUserProfile } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data: profile } = await getUserProfile();

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow">
          <h1 className="text-3xl font-bold text-gray-800">
            Volleyball Fantasy
          </h1>
          <p className="mt-3 text-gray-600">
            Inicia sesión para acceder a tu cuenta.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded bg-blue-500 px-4 py-2 font-semibold text-white transition hover:bg-blue-600"
          >
            Iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow">
        <h1 className="text-3xl font-bold text-gray-800">
          Volleyball Fantasy
        </h1>
        <p className="mt-6 text-gray-600">Usuario conectado</p>
        <p className="mt-1 text-xl font-semibold text-gray-800">
          {profile.full_name || profile.email}
        </p>
        <p className="mt-1 text-gray-500">{profile.email}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-block rounded bg-blue-500 px-4 py-2 font-semibold text-white transition hover:bg-blue-600"
          >
            Ir al dashboard
          </Link>
          <Link
            href="/fantasy"
            className="inline-block rounded bg-violet-600 px-4 py-2 font-semibold text-white transition hover:bg-violet-700"
          >
            Ir al fantasy
          </Link>
        </div>
      </div>
    </main>
  );
}

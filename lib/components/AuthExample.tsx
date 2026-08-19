"use client";

import { useState } from "react";
import { useSupabase } from "@/lib/hooks/useSupabase";

export function AuthExample() {
  const { session, loading, error, signIn, signOut, signUp } = useSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    try {
      await signIn(email, password);
      setMessage("¡Sesión iniciada exitosamente!");
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage(
        "Error al iniciar sesión: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    try {
      await signUp(email, password);
      setMessage("¡Registro exitoso! Revisa tu correo para confirmar.");
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage(
        "Error al registrarse: " +
          (error instanceof Error ? error.message : "Error desconocido")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setMessage("");
    try {
      await signOut();
      setMessage("¡Sesión cerrada!");
    } catch (error) {
      setMessage("Error al cerrar sesión");
    }
  };

  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Autenticación Supabase</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error.message}
        </div>
      )}

      {message && (
        <div className="mb-4 p-4 bg-blue-100 text-blue-700 rounded">
          {message}
        </div>
      )}

      {session ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-100 rounded">
            <p className="font-semibold">Sesión activa</p>
            <p className="text-sm text-gray-700">{session.user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded"
          >
            Cerrar sesión
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:border-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:border-blue-500"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded"
            >
              {isLoading ? "Cargando..." : "Iniciar sesión"}
            </button>
          </form>

          <button
            onClick={handleSignUp}
            disabled={isLoading || !email || !password}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded"
          >
            {isLoading ? "Cargando..." : "Registrarse"}
          </button>
        </div>
      )}
    </div>
  );
}

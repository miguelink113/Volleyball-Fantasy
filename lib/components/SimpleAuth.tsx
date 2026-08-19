"use client";

import { useState } from "react";
import { useSupabase } from "@/lib/hooks/useSupabase";

type AuthMode = "login" | "register";

export function SimpleAuth() {
  const { session, profile, loading, error, signIn, signUp, signOut } =
    useSupabase();

  const [mode, setMode] = useState<AuthMode>("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");

    try {
      if (mode === "register") {
        if (!formData.fullName) {
          // Validation handled by useSupabase hook
          return;
        }
        await signUp(formData.email, formData.password, formData.fullName);
        setSuccessMessage(
          "✅ Registro exitoso! Revisa tu correo para confirmar."
        );
        setFormData({ email: "", password: "", fullName: "" });
        setTimeout(() => setMode("login"), 2000);
      } else {
        await signIn(formData.email, formData.password);
        setSuccessMessage("✅ ¡Bienvenido!");
        setFormData({ email: "", password: "", fullName: "" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pantalla de usuario loggeado
  if (session && profile) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            ¡Bienvenido {profile.full_name}!
          </h2>
        </div>

        <div className="space-y-3 mb-6">
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-semibold text-gray-800">{profile.email}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Nombre</p>
            <p className="font-semibold text-gray-800">
              {profile.full_name || "No especificado"}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  // Pantalla de login/registro
  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
        {mode === "login" ? "Iniciar Sesión" : "Registrarse"}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          ❌ {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <p className="text-gray-600">Cargando...</p>
        </div>
      )}

      {!loading && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Nombre (solo en registro) */}
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="Juan Pérez"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                required={mode === "register"}
              />
            </div>
          )}

          {/* Campo Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              name="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Botón Enviar */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition"
          >
            {isSubmitting
              ? "Cargando..."
              : mode === "login"
                ? "Iniciar Sesión"
                : "Registrarse"}
          </button>
        </form>
      )}

      {/* Cambiar entre login y registro */}
      <div className="mt-6 text-center">
        <p className="text-gray-600 text-sm">
          {mode === "login"
            ? "¿No tienes cuenta? "
            : "¿Ya tienes cuenta? "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setFormData({ email: "", password: "", fullName: "" });
            }}
            className="text-blue-500 hover:text-blue-700 font-semibold"
          >
            {mode === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}

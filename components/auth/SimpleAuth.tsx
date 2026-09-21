
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type AuthMode = "login" | "register";

export function SimpleAuth() {
  const router = useRouter();

  const {
    loading,
    error,
    signIn,
    signUp,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleInputChange = (
      e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (
      e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setIsSubmitting(true);
    setSuccessMessage("");

    try {
      if (mode === "register") {
        if (!formData.fullName.trim()) {
          return;
        }

        const result = await signUp(
            formData.email,
            formData.password,
            formData.fullName.trim()
        );

        if (!result) {
          return;
        }

        // Registro con sesión inmediata
        if (result.session) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }

        // Registro correcto pero requiere confirmar email
        setSuccessMessage(
            "Registro exitoso. Revisa tu correo para confirmar la cuenta."
        );

        setFormData({
          email: "",
          password: "",
          fullName: "",
        });

        setMode("login");

        return;
      }

      const result = await signIn(
          formData.email,
          formData.password
      );

      if (!result) {
        return;
      }

      // Login correcto: ir al dashboard.
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setSuccessMessage("");
    setFormData({
      email: "",
      password: "",
      fullName: "",
    });
  };

  if (loading) {
    return (
        <div className="w-full max-w-md mx-auto p-6 text-center">
          <p className="text-gray-600">Cargando...</p>
        </div>
    );
  }

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
              <div>
                <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nombre Completo
                </label>

                <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    placeholder="Juan Pérez"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none"
                    required
                />
              </div>
          )}

          <div>
            <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
            >
              Correo Electrónico
            </label>

            <input
                id="email"
                type="email"
                name="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none"
                required
            />
          </div>

          <div>
            <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contraseña
            </label>

            <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-non"
                required
            />
          </div>

          <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition"
          >
            {isSubmitting
                ? "Cargando..."
                : mode === "login"
                    ? "Iniciar Sesión"
                    : "Registrarse"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            {mode === "login"
                ? "¿No tienes cuenta? "
                : "¿Ya tienes cuenta? "}

            <button
                type="button"
                onClick={toggleMode}
                className="text-blue-500 hover:text-blue-700 font-semibold"
            >
              {mode === "login"
                  ? "Regístrate"
                  : "Inicia sesión"}
            </button>
          </p>
        </div>
      </div>
  );
}
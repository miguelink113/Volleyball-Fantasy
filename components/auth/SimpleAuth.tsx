"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type AuthMode = "login" | "register";

export function SimpleAuth() {
  const router = useRouter();
  const { loading, error, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [formData, setFormData] = useState({ email: "", password: "", username: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");

    try {
      if (mode === "register") {
        if (!/^[A-Za-z0-9_]{3,24}$/.test(formData.username.trim())) {
          setSuccessMessage("El username debe tener entre 3 y 24 caracteres: letras, números o _.");
          return;
        }
        const result = await signUp(formData.email, formData.password, formData.username.trim());
        if (!result) return;
        if (result.session) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }
        setSuccessMessage("Registro exitoso. Revisa tu correo para confirmar la cuenta.");
        setFormData({ email: "", password: "", username: "" });
        setMode("login");
        return;
      }

      const result = await signIn(formData.email, formData.password);
      if (!result) return;
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setSuccessMessage("");
    setFormData({ email: "", password: "", username: "" });
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-500">Cargando...</div>;

  return (
      <div className="w-full max-w-md mx-auto p-8 bg-white rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-center mb-6 text-slate-900">
          {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
        </h1>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium">⚠️ {error}</div>}
        {successMessage && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                    type="text" name="username" placeholder="miguel123" required
                    value={formData.username} onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
            <input
                type="email" name="email" placeholder="tu@email.com" required
                value={formData.email} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
                type="password" name="password" placeholder="••••••••" required
                value={formData.password} onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <button
              type="submit" disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition mt-2"
          >
            {isSubmitting ? "Cargando..." : mode === "login" ? "Iniciar Sesión" : "Registrarse"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-slate-500">
            {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button type="button" onClick={toggleMode} className="text-violet-600 hover:text-violet-800 font-semibold">
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </div>
  );
}
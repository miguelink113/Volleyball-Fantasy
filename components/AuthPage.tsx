"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Trophy } from "lucide-react";
import { NetDivider } from "./NetDivider";

export const AuthPage = () => {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [showPw, setShowPw] = useState(false);

  const onEnter = () => router.push("/");

  return (
    <div className="fv-root min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <div className="lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col justify-center px-10 py-16">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
              <Trophy size={20} className="text-slate-950" />
            </div>
            <span className="fv-display text-2xl font-bold text-slate-50">SET POINT</span>
          </div>
          <h1 className="fv-display text-4xl md:text-5xl font-bold text-slate-50 leading-tight mb-4">
            Build your six.
            <br />
            <span className="text-amber-400">Win the set.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Draft your fantasy volleyball roster, manage rotations, and chase the top of the table — one rally at a time.
          </p>
          <NetDivider />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="fv-display text-2xl font-bold text-slate-50">40K+</p>
              <p className="text-xs text-slate-500">Managers</p>
            </div>
            <div>
              <p className="fv-display text-2xl font-bold text-slate-50">18</p>
              <p className="text-xs text-slate-500">Leagues</p>
            </div>
            <div>
              <p className="fv-display text-2xl font-bold text-slate-50">Live</p>
              <p className="text-xs text-slate-500">Scoring</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 mb-8">
            {(["login", "register", "forgot"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-colors ${
                  mode === m ? "bg-amber-500 text-slate-950" : "text-slate-400"
                }`}
              >
                {m === "forgot" ? "Reset" : m}
              </button>
            ))}
          </div>

          {mode === "login" && (
            <div className="space-y-4">
              <h2 className="fv-display text-xl font-semibold text-slate-100">Welcome back</h2>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Email</span>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5">
                  <Mail size={15} className="text-slate-500" />
                  <input
                    type="email"
                    placeholder="you@email.com"
                    className="bg-transparent outline-none text-sm text-slate-200 w-full"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Password</span>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5">
                  <Lock size={15} className="text-slate-500" />
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    className="bg-transparent outline-none text-sm text-slate-200 w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="text-slate-500"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>
              <button
                onClick={onEnter}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2.5 rounded-lg transition-colors"
              >
                Sign in
              </button>
              <NetDivider label="or continue with" />
              <div className="grid grid-cols-2 gap-3">
                <button className="border border-slate-800 rounded-lg py-2 text-sm text-slate-300 hover:bg-slate-900">
                  Google
                </button>
                <button className="border border-slate-800 rounded-lg py-2 text-sm text-slate-300 hover:bg-slate-900">
                  Apple
                </button>
              </div>
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-4">
              <h2 className="fv-display text-xl font-semibold text-slate-100">Create your team</h2>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Manager name</span>
                <input
                  placeholder="Yaiza Medina"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Email</span>
                <input
                  type="email"
                  placeholder="you@email.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Password</span>
                <input
                  type="password"
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none"
                />
              </label>
              <button
                onClick={onEnter}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2.5 rounded-lg transition-colors"
              >
                Create account
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <div className="space-y-4">
              <h2 className="fv-display text-xl font-semibold text-slate-100">Reset password</h2>
              <p className="text-sm text-slate-500">
                Enter your email and we&apos;ll send you a link to get back into your team.
              </p>
              <label className="block">
                <span className="text-xs text-slate-400 mb-1 block">Email</span>
                <input
                  type="email"
                  placeholder="you@email.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none"
                />
              </label>
              <button className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2.5 rounded-lg transition-colors">
                Send reset link
              </button>
            </div>
          )}

          <p className="text-center text-xs text-slate-600 mt-8">
            By continuing you agree to the Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

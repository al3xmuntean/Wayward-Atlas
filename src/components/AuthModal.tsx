"use client";

import React, { useState } from "react";
import { X, Shield, User, Lock, Mail, Sparkles } from "lucide-react";
import { SafeUser } from "@/lib/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: SafeUser) => void;
}

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegister ? { email, password, name } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "A apărut o eroare");
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Eroare la autentificare");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: demoPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare");
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative w-full max-w-md glass-panel-glow rounded-3xl p-6 border border-cyan-500/30 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3 shadow-glow">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            {isRegister ? "Creează cont de explorator" : "Autentificare în Wayward Atlas"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister
              ? "Înregistrează-te pentru a putea comenta și vizualiza jurnalele partajate."
              : "Conectează-te pentru a administra călătorii sau a comenta."}
          </p>
        </div>

        {/* Quick Demo Switchers */}
        <div className="mb-6 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
            ⚡ Autentificare Rapidă (Test):
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickLogin("admin@wayward.atlas", "admin123")}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/90 text-purple-200 border border-purple-600/40 text-xs font-semibold transition-all hover:scale-[1.02]"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin (Alex)</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin("traveler@companion.com", "user123")}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-200 border border-cyan-600/40 text-xs font-semibold transition-all hover:scale-[1.02]"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>User (Elena)</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Nume complet</label>
              <div className="flex items-center px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-cyan-400 transition-colors">
                <User className="w-4 h-4 text-slate-500 mr-2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Alex Popescu"
                  className="bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none w-full"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">Adresă de email</label>
            <div className="flex items-center px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-cyan-400 transition-colors">
              <Mail className="w-4 h-4 text-slate-500 mr-2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nume@exemplu.com"
                className="bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">Parolă</label>
            <div className="flex items-center px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-cyan-400 transition-colors">
              <Lock className="w-4 h-4 text-slate-500 mr-2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-glow hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? "Se procesează..." : isRegister ? "Înregistrează-te" : "Conectează-te"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {isRegister
              ? "Ai deja cont? Conectează-te aici"
              : "Nu ai cont încă? Înregistrează-te gratuit"}
          </button>
        </div>
      </div>
    </div>
  );
}

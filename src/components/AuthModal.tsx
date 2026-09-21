"use client";

import React, { useState, useRef } from "react";
import { X, Shield, User, Lock, Mail, Heart, Star, Eye } from "lucide-react";
import { SafeUser } from "@/lib/types";
import { useModalA11y } from "@/hooks/useModalA11y";

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

  const modalRef = useRef<HTMLDivElement>(null);
  useModalA11y({ isOpen, onClose, modalRef });

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby="auth-modal-desc"
        tabIndex={-1}
        className="relative w-full max-w-md glass-panel-glow rounded-3xl p-6 sm:p-7 border border-olive-500/30 shadow-2xl focus:outline-none"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Închide fereastra de autentificare"
          className="absolute top-4 right-4 p-2 text-olive-600 dark:text-olive-300 hover:text-black dark:hover:text-white rounded-xl hover:bg-olive-500/10 transition-colors focus:ring-2 focus:ring-olive-500"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Title (No Logo, Pure Typography) */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-olive-500/10 border border-olive-500/30 text-olive-600 dark:text-olive-400 mb-2 shadow-sm">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2
            id="auth-modal-title"
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            {isRegister ? "Creează cont nou" : "Autentificare în Wayward Atlas"}
          </h2>
          <p
            id="auth-modal-desc"
            className="text-xs text-slate-500 dark:text-slate-400 mt-1"
          >
            {isRegister
              ? "Înregistrează-te pentru a accesa albumele și călătoriile partajate."
              : "Conectează-te pentru a administra călătorii, adăuga comentarii sau planifica noi expediții."}
          </p>
        </div>

        {/* Google Sign-In (Always prominently enabled) */}
        <div className="mb-4">
          <a
            href="/api/auth/google"
            aria-label="Conectare rapidă cu contul Google"
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm border border-slate-300 dark:border-slate-700 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] focus:ring-2 focus:ring-olive-500"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Conectare cu Contul Google</span>
          </a>

          <div className="flex items-center my-3.5" aria-hidden="true">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
            <span className="px-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              sau autentificare rapidă
            </span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
          </div>
        </div>

        {/* Quick Demo Switchers (4-Tier Roles) */}
        <div
          role="group"
          aria-label="Autentificare rapidă demonstrativă pe roluri"
          className="mb-4 p-2.5 rounded-2xl bg-olive-50/50 dark:bg-olive-950/40 border border-olive-200 dark:border-olive-800/40"
        >
          <span className="text-[10px] font-bold text-olive-800 dark:text-olive-300 uppercase tracking-wider block mb-2 text-center">
            ⚡ Autentificare Rapidă pe Roluri (1 Click):
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              aria-label="Autentificare demo ca Administrator Alex"
              onClick={() => quickLogin("admin@wayward.atlas", "admin123")}
              className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 hover:bg-purple-200 dark:hover:bg-purple-900/90 text-purple-900 dark:text-purple-200 border border-purple-400/40 text-[11px] font-semibold transition-all hover:scale-[1.02] focus:ring-2 focus:ring-purple-400"
            >
              <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" aria-hidden="true" />
              <span className="truncate">Admin (Alex)</span>
            </button>
            <button
              type="button"
              aria-label="Autentificare demo ca Partener"
              onClick={() => quickLogin("partner@wayward.atlas", "partner123")}
              className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-rose-100 dark:bg-rose-950/70 hover:bg-rose-200 dark:hover:bg-rose-900/90 text-rose-900 dark:text-rose-200 border border-rose-400/40 text-[11px] font-semibold transition-all hover:scale-[1.02] focus:ring-2 focus:ring-rose-400"
            >
              <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <span className="truncate">Partener</span>
            </button>
            <button
              type="button"
              aria-label="Autentificare demo ca Prieten apropiat Radu"
              onClick={() => quickLogin("friend@wayward.atlas", "friend123")}
              className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 hover:bg-amber-200 dark:hover:bg-amber-900/90 text-amber-900 dark:text-amber-200 border border-amber-400/40 text-[11px] font-semibold transition-all hover:scale-[1.02] focus:ring-2 focus:ring-amber-400"
            >
              <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
              <span className="truncate">Prieten (Radu)</span>
            </button>
            <button
              type="button"
              aria-label="Autentificare demo ca Vizitator Viewer Elena"
              onClick={() => quickLogin("viewer@wayward.atlas", "viewer123")}
              className="flex items-center gap-1.5 py-1.5 px-2 rounded-xl bg-olive-100 dark:bg-olive-900/50 hover:bg-olive-200 dark:hover:bg-olive-800/80 text-olive-900 dark:text-olive-200 border border-olive-400/40 text-[11px] font-semibold transition-all hover:scale-[1.02] focus:ring-2 focus:ring-olive-400"
            >
              <Eye className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400 shrink-0" aria-hidden="true" />
              <span className="truncate">Viewer (Elena)</span>
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            id="auth-error"
            className="mb-3.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div>
              <label
                htmlFor="auth-name"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block"
              >
                Nume complet
              </label>
              <div className="flex items-center px-3 py-2 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 focus-within:border-olive-500 transition-colors">
                <User className="w-4 h-4 text-slate-400 mr-2" aria-hidden="true" />
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Alex Popescu"
                  className="bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none w-full"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block"
            >
              Adresă de Email
            </label>
            <div className="flex items-center px-3 py-2 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 focus-within:border-olive-500 transition-colors">
              <Mail className="w-4 h-4 text-slate-400 mr-2" aria-hidden="true" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nume@exemplu.com"
                aria-describedby={error ? "auth-error" : undefined}
                className="bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none w-full"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block"
            >
              Parolă
            </label>
            <div className="flex items-center px-3 py-2 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 focus-within:border-olive-500 transition-colors">
              <Lock className="w-4 h-4 text-slate-400 mr-2" aria-hidden="true" />
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-describedby={error ? "auth-error" : undefined}
                className="bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 focus:ring-2 focus:ring-olive-400"
          >
            {loading ? "Se procesează..." : isRegister ? "Înregistrează-te" : "Conectează-te cu Parolă"}
          </button>
        </form>

        <div className="mt-3.5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-olive-700 dark:text-olive-400 hover:underline transition-colors focus:ring-2 focus:ring-olive-500 rounded-md p-1"
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

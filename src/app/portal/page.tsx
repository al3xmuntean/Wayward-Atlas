"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Shield, ArrowLeft, Sparkles, Globe, Heart, Star, Eye } from "lucide-react";
import Link from "next/link";

export default function PortalPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error(data.error || "Authentication error occurred");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Authentication error occurred");
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
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden stars-overlay">
      {/* Back to Globe button */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-2xl glass-panel text-slate-300 hover:text-white border-slate-700/60 hover:border-olive-500/50 transition-all text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4 text-olive-400" />
        <span>Înapoi la Globul 3D (Public)</span>
      </Link>

      <div className="w-full max-w-lg glass-panel-glow rounded-3xl p-7 sm:p-8 border border-olive-500/30 shadow-2xl relative z-10 animate-fade-in">
        {/* Brand header - Pure typography, NO logo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            <span className="text-olive-400">Wayward</span> Atlas
          </h1>
          <p className="text-xs text-olive-300/80 font-bold uppercase tracking-wider mt-1">Portal Privat de Autentificare</p>
          <p className="text-xs text-slate-400 mt-1">
            Acces securizat pe bază de roluri: Administrator, Partener, Prieteni Apropiați și Vizitatori.
          </p>
        </div>

        {/* 1-Click Multi-Role Test Grid */}
        <div className="mb-6 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-bold text-olive-400 uppercase tracking-wider block mb-2.5 text-center">
            ⚡ Autentificare Rapidă pe Roluri (Test cu 1 Click):
          </span>
          <div className="grid grid-cols-2 gap-2">
            {/* 1. Admin */}
            <button
              type="button"
              onClick={() => quickLogin("admin@wayward.atlas", "admin123")}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-olive-950/70 hover:bg-olive-900/90 text-olive-200 border border-olive-600/40 text-xs font-semibold transition-all hover:scale-[1.02] text-left"
            >
              <div className="p-1 rounded-lg bg-olive-900/60 text-olive-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="block font-bold text-white truncate">Admin (Alex)</span>
                <span className="text-[10px] text-olive-300 block truncate">Acces Total & Studio</span>
              </div>
            </button>

            {/* 2. Partner */}
            <button
              type="button"
              onClick={() => quickLogin("partner@wayward.atlas", "partner123")}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/90 text-rose-200 border border-rose-600/40 text-xs font-semibold transition-all hover:scale-[1.02] text-left"
            >
              <div className="p-1 rounded-lg bg-rose-900/60 text-rose-400 shrink-0">
                <Heart className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="block font-bold text-white truncate">Partener</span>
                <span className="text-[10px] text-rose-300 block truncate">Călătorii în Doi & Privat</span>
              </div>
            </button>

            {/* 3. Close Friend */}
            <button
              type="button"
              onClick={() => quickLogin("friend@wayward.atlas", "friend123")}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/70 hover:bg-amber-900/90 text-amber-200 border border-amber-600/40 text-xs font-semibold transition-all hover:scale-[1.02] text-left"
            >
              <div className="p-1 rounded-lg bg-amber-900/60 text-amber-400 shrink-0">
                <Star className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="block font-bold text-white truncate">Prieten (Radu)</span>
                <span className="text-[10px] text-amber-300 block truncate">Vede Poze cu Oameni</span>
              </div>
            </button>

            {/* 4. Viewer */}
            <button
              type="button"
              onClick={() => quickLogin("viewer@wayward.atlas", "viewer123")}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-olive-900/40 hover:bg-olive-900/60 text-olive-200 border border-olive-700/40 text-xs font-semibold transition-all hover:scale-[1.02] text-left"
            >
              <div className="p-1 rounded-lg bg-olive-900/60 text-olive-400 shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="block font-bold text-white truncate">Viewer (Elena)</span>
                <span className="text-[10px] text-olive-300 block truncate">Date Complete / Fără Oameni</span>
              </div>
            </button>
          </div>
        </div>

        {/* Google Sign-in Button */}
        <div className="mb-5">
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm transition-all shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span>Conectare securizată cu Google</span>
          </a>
        </div>

        <div className="relative mb-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative px-3 bg-slate-900 text-[11px] text-slate-400 font-semibold uppercase">
            Sau cu cont intern
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Nume complet</label>
              <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-olive-500 transition-colors">
                <User className="w-4 h-4 text-slate-500 mr-2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Andrei Popescu"
                  className="bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none w-full"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 block">Email</label>
            <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-olive-500 transition-colors">
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
            <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus-within:border-olive-500 transition-colors">
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
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-olive-700 to-olive-600 hover:from-olive-600 hover:to-olive-500 text-white font-bold text-sm transition-all shadow-glow-olive hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? "Se procesează..." : isRegister ? "Înregistrare" : "Conectare"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-olive-400 hover:text-olive-300 transition-colors"
          >
            {isRegister
              ? "Ai deja cont? Conectează-te aici"
              : "Vrei un cont nou? Înregistrează-te"}
          </button>
        </div>
      </div>
    </div>
  );
}

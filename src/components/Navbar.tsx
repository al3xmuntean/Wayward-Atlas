"use client";

import React from "react";
import { Globe, Plus, LogOut, Shield, User as UserIcon, Users, Map as MapIcon } from "lucide-react";
import { SafeUser } from "@/lib/types";

interface NavbarProps {
  user: SafeUser | null;
  onLogout: () => void;
  onOpenUpload: () => void;
  onOpenUsersModal: () => void;
  tripsCount: number;
  photosCount: number;
  viewMode: "sphere" | "flat";
  onToggleViewMode: () => void;
}

export function Navbar({
  user,
  onLogout,
  onOpenUpload,
  onOpenUsersModal,
  tripsCount,
  photosCount,
  viewMode,
  onToggleViewMode,
}: NavbarProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 pointer-events-none">
      {/* Brand & View Mode Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 glass-panel px-4 py-2.5 rounded-2xl pointer-events-auto border-cyan-500/20 shadow-glow">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-md">
            <Globe className="w-5 h-5 animate-spin-slow" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                Wayward Atlas
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-cyan-300 bg-cyan-950/80 border border-cyan-700/50 rounded-md uppercase">
                {viewMode === "sphere" ? "Terra 3D" : "Hartă Detaliată"}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span>{tripsCount} Călătorii</span>
              <span>•</span>
              <span>{photosCount} Locuri vizitate</span>
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Spherical Earth vs Detailed Map */}
        <button
          onClick={onToggleViewMode}
          title={viewMode === "sphere" ? "Comută pe Harta Detaliată" : "Comută pe Globul Terestru Sferic 3D"}
          className="glass-panel px-3 py-2 rounded-2xl pointer-events-auto flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all shadow-md"
        >
          {viewMode === "sphere" ? (
            <>
              <MapIcon className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Hartă Detaliată</span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Terra Sferic 3D</span>
            </>
          )}
        </button>
      </div>

      {/* Right Controls - Only shown when user is logged in! */}
      {user && (
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Admin User Management Button */}
          {user.role === "ADMIN" && (
            <button
              onClick={onOpenUsersModal}
              title="Gestiune Roluri & Permisiuni Utilizatori"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs text-slate-200 glass-panel hover:text-cyan-300 border-slate-700/60 hover:border-cyan-500/50 transition-all hover:scale-105"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline">Gestiune Utilizatori</span>
            </button>
          )}

          {/* Upload Button (Admin only) */}
          {user.role === "ADMIN" && (
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all shadow-glow hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Adaugă Călătorie</span>
            </button>
          )}

          {/* User Profile Chip & Logout */}
          <div className="flex items-center gap-2 glass-panel p-1.5 rounded-2xl border-slate-700/50">
            <div className="flex items-center gap-2 pl-2 pr-1 py-0.5">
              {user.role === "ADMIN" ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Shield className="w-3 h-3 text-purple-400" />
                  Admin
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <UserIcon className="w-3 h-3 text-cyan-400" />
                  {user.canViewPrivate ? "Privileged" : "User"}
                </span>
              )}
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
                {user.name}
              </span>
              <button
                onClick={onLogout}
                title="Deconectare"
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

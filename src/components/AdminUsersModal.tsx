"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Users, Shield, Lock, Eye, Heart, Star, Loader2 } from "lucide-react";
import { UserRole } from "@/lib/types";
import { useModalA11y } from "@/hooks/useModalA11y";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  canViewPrivate: boolean;
}

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminUsersModal({ isOpen, onClose }: AdminUsersModalProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  useModalA11y({ isOpen, onClose, modalRef });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const togglePrivateAccess = async (userId: string, currentVal: boolean) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canViewPrivate: !currentVal }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, canViewPrivate: !currentVal } : u))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const roleConfig: Record<UserRole, { label: string; color: string; activeClass: string; icon: React.ReactNode }> = {
    ADMIN: {
      label: "Admin",
      color: "purple",
      activeClass: "bg-purple-600 text-white shadow-glow border-purple-500",
      icon: <Shield className="w-3 h-3 text-purple-300" aria-hidden="true" />,
    },
    PARTNER: {
      label: "Partener",
      color: "rose",
      activeClass: "bg-rose-600 text-white shadow-glow border-rose-500",
      icon: <Heart className="w-3 h-3 text-rose-300" aria-hidden="true" />,
    },
    CLOSE_FRIEND: {
      label: "Prieten",
      color: "amber",
      activeClass: "bg-amber-600 text-white shadow-glow border-amber-500",
      icon: <Star className="w-3 h-3 text-amber-300" aria-hidden="true" />,
    },
    VIEWER: {
      label: "Viewer",
      color: "olive",
      activeClass: "bg-olive-700 text-white shadow-glow border-olive-500",
      icon: <Eye className="w-3 h-3 text-olive-300" aria-hidden="true" />,
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in pointer-events-auto overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-users-title"
        tabIndex={-1}
        className="relative w-full h-full sm:h-auto sm:max-h-[90vh] max-w-3xl glass-panel-glow rounded-none sm:rounded-3xl p-4 sm:p-7 border border-olive-500/30 shadow-2xl overflow-y-auto focus:outline-none"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Închide panoul de gestiune utilizatori"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors z-20 focus:ring-2 focus:ring-olive-500"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-2xl bg-olive-500/20 text-olive-400 border border-olive-500/30">
            <Users className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="admin-users-title" className="text-xl font-black text-white tracking-tight">
              Gestiune Roluri & Permisiuni Utilizatori
            </h2>
            <span className="text-xs text-olive-400 font-semibold">
              Panou Administrator — RBAC 5 Niveluri
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Setează rolul fiecărui membru: <strong>Admin</strong> (Superuser), <strong>Partener</strong> (amintiri în doi), <strong>Prieten Apropiat</strong> (poze cu oameni) sau <strong>Viewer</strong> (peisaje fără oameni).
        </p>

        {/* Users Table / List */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1" role="list" aria-label="Lista utilizatorilor înregistrați">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-olive-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
              <span className="text-xs">Se încarcă lista de utilizatori...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-300">Nu există alți utilizatori înregistrați încă.</p>
              <p className="text-xs text-slate-500 mt-1">
                Conectează-te cu Google sau invită alți utilizatori prin bara de autentificare de sus!
              </p>
            </div>
          ) : (
            users.map((u) => {
              const isUpdating = updatingId === u.id;
              const currentCfg = roleConfig[u.role] || roleConfig.VIEWER;

              return (
                <div
                  key={u.id}
                  role="listitem"
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all hover:border-slate-700"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{u.name}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {currentCfg.icon}
                        <span>{currentCfg.label}</span>
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block mt-0.5">{u.email}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                    {/* Role Selector Buttons */}
                    <div
                      role="group"
                      aria-label={`Selectează rolul pentru ${u.name}`}
                      className="grid grid-cols-2 sm:flex sm:items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800"
                    >
                      {(["VIEWER", "CLOSE_FRIEND", "PARTNER", "ADMIN"] as UserRole[]).map((r) => {
                        const isSelected = u.role === r;
                        const cfg = roleConfig[r];
                        return (
                          <button
                            key={r}
                            type="button"
                            aria-pressed={isSelected}
                            aria-label={`Setează rolul ${cfg.label} pentru ${u.name}`}
                            onClick={() => updateUserRole(u.id, r)}
                            disabled={isUpdating}
                            className={`flex items-center justify-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all border focus:ring-2 focus:ring-olive-500 ${
                              isSelected
                                ? cfg.activeClass
                                : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                          >
                            {cfg.icon}
                            <span>{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Private Access Toggle */}
                    <button
                      type="button"
                      onClick={() => togglePrivateAccess(u.id, u.canViewPrivate)}
                      disabled={isUpdating || u.role === "ADMIN" || u.role === "PARTNER"}
                      aria-label={`Comută permisiunea de acces privat pentru ${u.name}`}
                      title={
                        u.role === "ADMIN" || u.role === "PARTNER"
                          ? "Are deja acces la conținutul privat"
                          : u.canViewPrivate
                          ? "Utilizatorul poate vedea conținutul privat"
                          : "Apasă pentru a-i oferi acces privat"
                      }
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all focus:ring-2 focus:ring-purple-400 ${
                        u.role === "ADMIN" || u.role === "PARTNER" || u.canViewPrivate
                          ? "bg-purple-950/80 border-purple-500 text-purple-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <Lock className="w-3 h-3 text-purple-400" aria-hidden="true" />
                      <span>{u.role === "ADMIN" || u.role === "PARTNER" || u.canViewPrivate ? "Privat" : "Standard"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Adresă de login secretă: <code className="text-olive-300">/portal</code>
          </span>
          <button
            onClick={onClose}
            aria-label="Închide panoul de gestiune utilizatori"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold focus:ring-2 focus:ring-olive-500"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}

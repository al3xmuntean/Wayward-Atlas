"use client";

import React, { useState, useEffect } from "react";
import { X, Users, Shield, Check, Lock, Eye, Sparkles, Loader2 } from "lucide-react";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
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

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "POST",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative w-full max-w-2xl glass-panel-glow rounded-3xl p-6 sm:p-7 border border-cyan-500/30 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 mb-1 text-cyan-400">
          <Shield className="w-5 h-5" />
          <h2 className="text-xl font-black text-white tracking-tight">
            Gestiune Utilizatori & Permisiuni (Admin)
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Setează rolul fiecărui utilizator (Admin sau User) și decide cine are dreptul să vadă călătoriile și fotografiile private.
        </p>

        {/* Users Table / List */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-cyan-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Se încarcă lista de utilizatori...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">Nu există alți utilizatori înregistrați încă.</p>
              <p className="text-xs text-slate-500 mt-1">
                Trimite link-ul paginii secrete <code className="text-cyan-300">/portal</code> prietenilor pentru a se înregistra sau conecta cu Google!
              </p>
            </div>
          ) : (
            users.map((u) => {
              const isUpdating = updatingId === u.id;
              return (
                <div
                  key={u.id}
                  className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-700"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{u.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-800 text-slate-300">
                        {u.role}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block mt-0.5">{u.email}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => updateUserRole(u.id, "USER")}
                        disabled={isUpdating}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          u.role === "USER"
                            ? "bg-cyan-500 text-slate-950 shadow-glow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        User
                      </button>
                      <button
                        onClick={() => updateUserRole(u.id, "ADMIN")}
                        disabled={isUpdating}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          u.role === "ADMIN"
                            ? "bg-purple-600 text-white shadow-glow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Admin
                      </button>
                    </div>

                    {/* Private Access Toggle */}
                    <button
                      onClick={() => togglePrivateAccess(u.id, u.canViewPrivate)}
                      disabled={isUpdating || u.role === "ADMIN"}
                      title={
                        u.role === "ADMIN"
                          ? "Adminul are deja acces la tot conținutul"
                          : u.canViewPrivate
                          ? "Utilizatorul poate vedea toate călătoriile private"
                          : "Apasă pentru a-i oferi acces la albumele private"
                      }
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all ${
                        u.role === "ADMIN" || u.canViewPrivate
                          ? "bg-purple-950/80 border-purple-500 text-purple-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <Lock className="w-3 h-3 text-purple-400" />
                      <span>{u.role === "ADMIN" || u.canViewPrivate ? "Vede Privat" : "Doar Public"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Adresă de login secretă: <code className="text-cyan-300">/portal</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}

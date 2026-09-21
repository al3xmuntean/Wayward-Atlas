"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Save, Trash2, Heart, Shield, Calendar, MapPin, Loader2, Sparkles } from "lucide-react";
import { TripData, VisibilityRole } from "@/lib/types";
import { useModalA11y } from "@/hooks/useModalA11y";

interface EditTripModalProps {
  trip: TripData | null;
  isOpen: boolean;
  onClose: () => void;
  onTripUpdated: (updatedTrip: TripData) => void;
  onTripDeleted: (tripId: string) => void;
}

export function EditTripModal({
  trip,
  isOpen,
  onClose,
  onTripUpdated,
  onTripDeleted,
}: EditTripModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [withPartner, setWithPartner] = useState(false);
  const [partnerNotes, setPartnerNotes] = useState("");
  const [minRole, setMinRole] = useState<VisibilityRole>("VIEWER");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  useModalA11y({ isOpen, onClose, modalRef });

  useEffect(() => {
    if (trip) {
      setTitle(trip.title || "");
      setDescription(trip.description || "");
      setStartDate(trip.startDate ? trip.startDate.split("T")[0] : "");
      setEndDate(trip.endDate ? trip.endDate.split("T")[0] : "");
      setWithPartner(Boolean(trip.withPartner));
      setPartnerNotes(trip.partnerNotes || "");
      setMinRole(trip.minRole || "VIEWER");
      setError(null);
    }
  }, [trip]);

  if (!isOpen || !trip) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : null,
          withPartner,
          partnerNotes: withPartner ? partnerNotes : null,
          minRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update trip");
      }

      onTripUpdated({
        ...trip,
        title,
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        withPartner,
        partnerNotes: withPartner ? partnerNotes : null,
        minRole,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Ești sigur că vrei să ștergi călătoria „${trip.title}”? Această acțiune nu poate fi anulată!`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete trip");
      onTripDeleted(trip.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error deleting trip");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in pointer-events-auto overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-trip-title"
        tabIndex={-1}
        className="relative w-full max-w-xl glass-panel-glow rounded-3xl p-5 sm:p-7 border border-olive-500/30 shadow-2xl my-auto focus:outline-none"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Închide fereastra de editare"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-olive-500"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2.5 mb-1 text-olive-400">
          <Shield className="w-5 h-5" aria-hidden="true" />
          <h2 id="edit-trip-title" className="text-xl font-black text-white tracking-tight">
            Editează Călătoria (Admin Manager)
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Modifică detaliile călătoriei, amintirile pentru partener și nivelul minim de vizibilitate.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="edit-title" className="text-xs font-semibold text-slate-300 mb-1 block">
              Titlu Călătorie
            </label>
            <input
              id="edit-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-olive-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-desc" className="text-xs font-semibold text-slate-300 mb-1 block">
              Descriere Generală
            </label>
            <textarea
              id="edit-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-olive-500 transition-colors resize-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-start-date" className="text-xs font-semibold text-slate-300 mb-1 block">
                Data de Început
              </label>
              <input
                id="edit-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-olive-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="edit-end-date" className="text-xs font-semibold text-slate-300 mb-1 block">
                Data de Sfârșit (Opțional)
              </label>
              <input
                id="edit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-olive-500 transition-colors"
              />
            </div>
          </div>

          {/* Minimum Role Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block" id="edit-min-role-label">
              Vizibilitate Minimă Călătorie
            </label>
            <div
              role="group"
              aria-labelledby="edit-min-role-label"
              className="grid grid-cols-4 gap-2"
            >
              {(["VIEWER", "CLOSE_FRIEND", "PARTNER", "ADMIN"] as VisibilityRole[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  aria-pressed={minRole === r}
                  onClick={() => setMinRole(r)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center focus:ring-2 focus:ring-olive-500 ${
                    minRole === r
                      ? "bg-olive-700 border-olive-500 text-white shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {r === "VIEWER" && "Toți (Viewer)"}
                  {r === "CLOSE_FRIEND" && "Prieteni"}
                  {r === "PARTNER" && "Partener"}
                  {r === "ADMIN" && "Doar Admin"}
                </button>
              ))}
            </div>
          </div>

          {/* Partner Toggle & Notes Box */}
          <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" aria-hidden="true" />
                <span className="text-xs font-bold text-rose-200">Călătorie realizată împreună cu partenerul</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={withPartner}
                aria-label="Călătorie cu partenerul"
                onClick={() => setWithPartner(!withPartner)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-rose-400 ${
                  withPartner ? "bg-rose-500" : "bg-slate-800"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    withPartner ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {withPartner && (
              <div className="animate-fade-in pt-1">
                <label
                  htmlFor="edit-partner-notes"
                  className="text-[11px] font-semibold text-rose-300 mb-1 block"
                >
                  Amintiri & Detalii Secrete pentru Partener (Vizibile doar pentru Partner & Admin):
                </label>
                <textarea
                  id="edit-partner-notes"
                  rows={3}
                  value={partnerNotes}
                  onChange={(e) => setPartnerNotes(e.target.value)}
                  placeholder="Scrie aici detalii romantice, glume interne, restaurante speciale sau amintiri intime din această călătorie..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-rose-800/40 text-xs text-rose-100 placeholder-rose-900/60 focus:outline-none focus:border-rose-400 transition-colors resize-none"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-all focus:ring-2 focus:ring-rose-500"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
              <span>{deleting ? "Se șterge..." : "Șterge Călătoria"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all focus:ring-2 focus:ring-slate-400"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-olive-700 hover:bg-olive-800 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 focus:ring-2 focus:ring-olive-400"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Se salvează...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Salvează Modificările</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

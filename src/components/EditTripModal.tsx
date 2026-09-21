"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Save, Trash2, Heart, Shield, Calendar, MapPin, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { TripData, VisibilityRole } from "@/lib/types";
import { useModalA11y } from "@/hooks/useModalA11y";
import { FlagIcon } from "@/components/FlagIcon";
import { Language } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/context";

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
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeLangTab, setActiveLangTab] = useState<Language>("ro");
  const [translations, setTranslations] = useState<Record<string, { title: string; description: string }>>({
    en: { title: "", description: "" },
    de: { title: "", description: "" },
    es: { title: "", description: "" },
    fr: { title: "", description: "" },
  });
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  const [translateStatus, setTranslateStatus] = useState<string | null>(null);

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
      setActiveLangTab("ro");

      let parsedTranslations: Record<string, { title: string; description: string }> = {
        en: { title: "", description: "" },
        de: { title: "", description: "" },
        es: { title: "", description: "" },
        fr: { title: "", description: "" },
      };

      if (trip.translations) {
        try {
          const parsed = typeof trip.translations === "string" ? JSON.parse(trip.translations) : trip.translations;
          if (parsed && typeof parsed === "object") {
            parsedTranslations = {
              en: { title: parsed.en?.title || "", description: parsed.en?.description || "" },
              de: { title: parsed.de?.title || "", description: parsed.de?.description || "" },
              es: { title: parsed.es?.title || "", description: parsed.es?.description || "" },
              fr: { title: parsed.fr?.title || "", description: parsed.fr?.description || "" },
            };
          }
        } catch {}
      } else if (trip.translationsMap) {
        parsedTranslations = {
          en: { title: trip.translationsMap.en?.title || "", description: trip.translationsMap.en?.description || "" },
          de: { title: trip.translationsMap.de?.title || "", description: trip.translationsMap.de?.description || "" },
          es: { title: trip.translationsMap.es?.title || "", description: trip.translationsMap.es?.description || "" },
          fr: { title: trip.translationsMap.fr?.title || "", description: trip.translationsMap.fr?.description || "" },
        };
      }
      setTranslations(parsedTranslations);
    }
  }, [trip]);

  const handleAiTranslate = async (target?: Language) => {
    if (!title.trim()) {
      alert("Te rugăm să introduci mai întâi titlul călătoriei în română!");
      return;
    }

    try {
      if (!target) {
        setTranslatingLang("all");
        setTranslateStatus("Se traduce cu AI în EN, DE, ES, FR...");
        const res = await fetch("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            all: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Eroare la traducere");

        if (data.translations) {
          setTranslations((prev) => ({
            ...prev,
            en: data.translations.en || prev.en,
            de: data.translations.de || prev.de,
            es: data.translations.es || prev.es,
            fr: data.translations.fr || prev.fr,
          }));
          setTranslateStatus("Traduceri generate cu succes pentru toate limbile!");
          setTimeout(() => setTranslateStatus(null), 3000);
        }
      } else {
        setTranslatingLang(target);
        const res = await fetch("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            targetLang: target,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Eroare la traducere");

        if (data.translation) {
          setTranslations((prev) => ({
            ...prev,
            [target]: {
              title: data.translation.title || "",
              description: data.translation.description || "",
            },
          }));
        }
      }
    } catch (err: any) {
      alert(err.message || "A apărut o problemă la traducere");
    } finally {
      setTranslatingLang(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${trip?.id}`, {
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
          translations: JSON.stringify(translations),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update trip");
      }

      if (trip) {
        onTripUpdated({
          ...trip,
          title,
          description,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : null,
          withPartner,
          partnerNotes: withPartner ? partnerNotes : null,
          minRole,
          translations: JSON.stringify(translations),
          translationsMap: translations,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!trip) return;
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

  if (!isOpen || !trip) return null;

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
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-olive-500"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2.5 mb-1 text-olive-600 dark:text-olive-400">
          <Shield className="w-5 h-5" aria-hidden="true" />
          <h2 id="edit-trip-title" className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Editează Călătoria (Admin Manager)
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-5">
          Modifică detaliile călătoriei, amintirile pentru partener și nivelul minim de vizibilitate.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Multilingual Title & Description Studio */}
          <div className="rounded-2xl bg-slate-100/90 dark:bg-slate-950/70 border border-slate-200 dark:border-olive-500/25 p-3.5 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
              <div>
                <div className="flex items-center gap-2 text-olive-700 dark:text-olive-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t("admin.translationsTitle")}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Româna este baza călătoriei. Poți traduce și ajusta titlul & descrierea în alte limbi.
                </p>
              </div>

              {/* 1-Click AI Translate All Button */}
              <button
                type="button"
                onClick={() => handleAiTranslate()}
                disabled={!title.trim() || translatingLang !== null}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm shrink-0"
              >
                {translatingLang === "all" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t("admin.translating")}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t("admin.aiTranslateAllBtn")}</span>
                  </>
                )}
              </button>
            </div>

            {translateStatus && (
              <div className="p-2 rounded-xl bg-olive-100 dark:bg-olive-950/60 border border-olive-300 dark:border-olive-500/40 text-xs text-olive-900 dark:text-olive-200 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400 shrink-0" />
                <span>{translateStatus}</span>
              </div>
            )}

            {/* Language Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-900/90 rounded-xl border border-slate-300 dark:border-slate-800">
              {(["ro", "en", "de", "es", "fr"] as Language[]).map((lang) => {
                const isActive = activeLangTab === lang;
                const hasContent =
                  lang === "ro"
                    ? Boolean(title.trim())
                    : Boolean(translations[lang]?.title?.trim());

                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLangTab(lang)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-white dark:bg-olive-600/30 text-olive-900 dark:text-olive-200 border border-olive-500/40 shadow-xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 border border-transparent"
                    }`}
                  >
                    <FlagIcon code={lang} className="w-4 h-2.5 rounded-xs" />
                    <span>
                      {lang === "ro" && "Română (Bază)"}
                      {lang === "en" && "English"}
                      {lang === "de" && "Deutsch"}
                      {lang === "es" && "Español"}
                      {lang === "fr" && "Français"}
                    </span>
                    {hasContent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-olive-500 ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeLangTab === "ro" ? (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="edit-title" className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Titlu Călătorie (Română - Principal) *
                    </label>
                    <span className="text-[10px] text-olive-700 dark:text-olive-400 font-semibold uppercase">Limba Bază</span>
                  </div>
                  <input
                    id="edit-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="edit-desc" className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
                    Descriere Generală (Română)
                  </label>
                  <textarea
                    id="edit-desc"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500 transition-colors resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlagIcon code={activeLangTab} className="w-4 h-3 rounded-xs" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Versiunea în {activeLangTab.toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAiTranslate(activeLangTab)}
                    disabled={!title.trim() || translatingLang !== null}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-olive-800 dark:text-olive-300 text-xs font-semibold border border-olive-500/30 transition-all disabled:opacity-40"
                  >
                    {translatingLang === activeLangTab ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Se traduce...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-olive-600 dark:text-olive-400" />
                        <span>Traduce doar {activeLangTab.toUpperCase()} cu AI</span>
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
                    Titlu Călătorie ({activeLangTab.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={translations[activeLangTab]?.title || ""}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [activeLangTab]: {
                          ...prev[activeLangTab],
                          title: e.target.value,
                        },
                      }))
                    }
                    placeholder={`Titlul tradus în ${activeLangTab.toUpperCase()}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
                    Descriere Călătorie ({activeLangTab.toUpperCase()})
                  </label>
                  <textarea
                    rows={2}
                    value={translations[activeLangTab]?.description || ""}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [activeLangTab]: {
                          ...prev[activeLangTab],
                          description: e.target.value,
                        },
                      }))
                    }
                    placeholder={`Descrierea tradusă în ${activeLangTab.toUpperCase()}...`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-olive-500 resize-none"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Poți edita sau corecta oricând această traducere manual.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-start-date" className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
                Data de Început
              </label>
              <input
                id="edit-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-olive-500 transition-colors [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label htmlFor="edit-end-date" className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
                Data de Sfârșit (Opțional)
              </label>
              <input
                id="edit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-olive-500 transition-colors [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Minimum Role Selector */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block" id="edit-min-role-label">
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
                      ? "bg-olive-700 border-olive-500 text-white shadow-sm font-bold"
                      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
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
          <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" aria-hidden="true" />
                <span className="text-xs font-bold text-rose-950 dark:text-rose-200">Călătorie realizată împreună cu partenerul</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={withPartner}
                aria-label="Călătorie cu partenerul"
                onClick={() => setWithPartner(!withPartner)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-rose-400 ${
                  withPartner ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-800"
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
                  className="text-[11px] font-bold text-rose-900 dark:text-rose-300 mb-1 block"
                >
                  Amintiri & Detalii Secrete pentru Partener (Vizibile doar pentru Partner & Admin):
                </label>
                <textarea
                  id="edit-partner-notes"
                  rows={3}
                  value={partnerNotes}
                  onChange={(e) => setPartnerNotes(e.target.value)}
                  placeholder="Scrie aici detalii romantice, glume interne, restaurante speciale sau amintiri intime din această călătorie..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/80 border border-rose-300 dark:border-rose-800/40 text-xs text-rose-950 dark:text-rose-100 placeholder:text-rose-400 dark:placeholder:text-rose-900/60 focus:outline-none focus:border-rose-400 transition-colors resize-none"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:hover:bg-rose-900 dark:text-rose-300 dark:border-rose-800/60 text-xs font-semibold transition-all focus:ring-2 focus:ring-rose-500"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <span>{deleting ? "Se șterge..." : "Șterge Călătoria"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white text-xs font-semibold transition-all focus:ring-2 focus:ring-slate-400"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 focus:ring-2 focus:ring-olive-400"
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

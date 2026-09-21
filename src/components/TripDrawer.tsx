"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Calendar,
  MapPin,
  Lock,
  Globe2,
  Send,
  MessageSquare,
  Sparkles,
  Trash2,
  Tag,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Star,
  Edit,
  Eye,
  Shield,
  Check,
  Compass,
  CheckCircle2,
  AlertCircle,
  Award,
  Camera,
  Layers,
  Loader2,
  Plus,
  Luggage,
  CloudSun,
  Share2,
} from "lucide-react";
import { TripData, PhotoData, SafeUser, VisibilityRole, TravelAchievementReport } from "@/lib/types";
import { useModalA11y } from "@/hooks/useModalA11y";
import { useTranslation } from "@/lib/i18n/context";

interface TripDrawerProps {

  trip: TripData | null;
  selectedPhoto: PhotoData | null;
  onClose: () => void;
  onSelectPhoto: (photo: PhotoData) => void;
  currentUser: SafeUser | null;
  onAddComment: (tripId: string, content: string) => Promise<void>;
  onDeleteTrip?: (tripId: string) => Promise<void>;
  onEditTrip?: (trip: TripData) => void;
  onPhotoUpdated?: (updatedPhoto: PhotoData) => void;
  onTripUpdated?: (updatedTrip: TripData) => void;
  onOpenUploadForTrip?: (trip: TripData) => void;
  onTagClick?: (tag: string) => void;
  onFlyToPhoto?: (lat: number, lon: number) => void;
}

export function TripDrawer({
  trip,
  selectedPhoto,
  onClose,
  onSelectPhoto,
  currentUser,
  onAddComment,
  onDeleteTrip,
  onEditTrip,
  onPhotoUpdated,
  onTripUpdated,
  onOpenUploadForTrip,
  onTagClick,
  onFlyToPhoto,
}: TripDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  useModalA11y({ isOpen: Boolean(trip), onClose, modalRef: drawerRef });

  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const { t } = useTranslation();
  const [copiedShare, setCopiedShare] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [report, setReport] = useState<TravelAchievementReport | null>(null);

  const handleShareTrip = async () => {
    if (!trip) return;
    const url = `${window.location.origin}/?trip=${trip.id}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: trip.title,
          text: `Explorează «${trip.title}» pe Wayward Atlas!`,
          url,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {}
  };

  if (!trip) return null;

  const currentPhoto = selectedPhoto || trip.photos[activePhotoIdx] || trip.photos[0];
  const isAdmin = currentUser?.role === "ADMIN";
  const isPartner = currentUser?.role === "PARTNER" || isAdmin;

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      await onAddComment(trip.id, newComment.trim());
      setNewComment("");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleToggleCountryCover = async (photo: PhotoData) => {
    if (!isAdmin || updatingPhoto) return;
    try {
      setUpdatingPhoto(true);
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCountryCover: !photo.isCountryCover }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onPhotoUpdated) onPhotoUpdated(data.photo);
      }
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const handleUpdatePhotoRole = async (photo: PhotoData, newRole: VisibilityRole) => {
    if (!isAdmin || updatingPhoto) return;
    try {
      setUpdatingPhoto(true);
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minRole: newRole,
          hasPeople: newRole === "CLOSE_FRIEND" || photo.hasPeople,
          partnerPreselected: newRole === "PARTNER",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onPhotoUpdated) onPhotoUpdated(data.photo);
      }
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const formattedDate = trip.isMaskedDate
    ? `Anul ${trip.year}`
    : new Date(trip.startDate).toLocaleDateString("ro-RO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  return (
    <aside
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-drawer-title"
      tabIndex={-1}
      className="fixed inset-x-0 bottom-0 h-[88vh] sm:h-full sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[480px] glass-panel-glow rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-olive-500/30 shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 ease-out overflow-hidden z-40 focus:outline-none"
    >
      {/* Mobile Handle Indicator */}
      <div className="w-12 h-1.5 bg-olive-500/40 rounded-full mx-auto sm:hidden mt-2.5 mb-0.5 shrink-0" aria-hidden="true" />

      {/* Header */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-olive-500/20 bg-slate-900/40">
        <div className="flex flex-wrap items-center gap-1.5">
          {trip.status === "PLANNED" ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-olive-950/80 text-olive-300 border border-olive-500/50 shadow-sm">
              <Sparkles className="w-3 h-3 text-olive-400" aria-hidden="true" />
              Planificat (Travel Assist)
            </span>
          ) : trip.isCountryShowcase ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/50">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" aria-hidden="true" />
              Vedere Generală Țară (Public)
            </span>
          ) : trip.isPrivate ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-olive-950/80 text-olive-300 border border-olive-700/50">
              <Lock className="w-3 h-3 text-olive-400" aria-hidden="true" />
              Privat
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-olive-950/80 text-olive-300 border border-olive-700/50">
              <Globe2 className="w-3 h-3 text-olive-400" aria-hidden="true" />
              Călătorie
            </span>
          )}

          {trip.withPartner && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-700/50">
              <Heart className="w-3 h-3 text-rose-400 fill-rose-400/30" aria-hidden="true" />
              Călătorie în Doi
            </span>
          )}

          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-olive-400" aria-hidden="true" />
            {formattedDate}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Admin Edit Trip Button */}
          {isAdmin && onEditTrip && !trip.isCountryShowcase && (
            <button
              onClick={() => onEditTrip(trip)}
              aria-label={`Editează călătoria ${trip.title}`}
              title="Editează călătoria"
              className="p-1.5 text-slate-400 hover:text-olive-300 rounded-lg hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-olive-500"
            >
              <Edit className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          {/* Admin Delete Trip Button */}
          {isAdmin && onDeleteTrip && !trip.isCountryShowcase && (
            <button
              onClick={() => {
                if (confirm(`Ești sigur că vrei să ștergi călătoria "${trip.title}"?`)) {
                  onDeleteTrip(trip.id);
                }
              }}
              aria-label={`Șterge călătoria ${trip.title}`}
              title="Șterge călătoria"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-rose-500"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          {/* Share Trip Button */}
          <button
            onClick={handleShareTrip}
            aria-label={t("common.share")}
            title={copiedShare ? t("common.copied") : t("drawer.shareTrip")}
            className="p-1.5 text-slate-400 hover:text-olive-300 rounded-lg hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-olive-500 relative"
          >
            {copiedShare ? (
              <Check className="w-4 h-4 text-olive-400" aria-hidden="true" />
            ) : (
              <Share2 className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-olive-500"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Title and description */}
        <div>
          <h2 id="trip-drawer-title" className="text-2xl font-black tracking-tight text-white">{trip.title}</h2>
          {trip.description && (
            <p className="mt-2 text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              {trip.description}
            </p>
          )}
        </div>


        {/* Partner Secret Notes & Memories (Partner & Admin only) */}
        {trip.partnerNotes && isPartner && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-800/50 shadow-lg space-y-1.5 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span>Amintiri & Detalii Secrete (Pentru Partener)</span>
            </div>
            <p className="text-xs text-rose-100/90 leading-relaxed italic pl-6 border-l-2 border-rose-500/40">
              „{trip.partnerNotes}”
            </p>
          </div>
        )}

        {/* Gemini Achievement Report Card (if verified) */}
        {(report || trip.achievementReport) && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-olive-950/70 via-slate-900 to-olive-900/40 border border-olive-500/40 shadow-2xl space-y-3 animate-fade-in">
            {(() => {
              const activeReport = report || trip.achievementReport!;
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-900/80 text-emerald-300 shadow-glow">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">Raport Realizări Travel Assist (Gemini)</h4>
                        <span className="text-[11px] text-emerald-300">
                          {activeReport.achievedCount} din {activeReport.totalPlanned} obiective atinse
                        </span>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-black shadow-glow">
                      {activeReport.score}% REUȘIT
                    </div>
                  </div>

                  {/* Achieved Checkpoints List */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Obiective atinse și imortalizate:
                    </span>
                    <div className="space-y-1">
                      {activeReport.achieved.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-emerald-200 bg-emerald-950/40 p-2 rounded-xl border border-emerald-800/40">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-semibold">{item.name}</span>
                          {item.commentary && <span className="text-slate-400 text-[11px] truncate">— {item.commentary}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missed Checkpoints List (if any) */}
                  {activeReport.missed && activeReport.missed.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider block">
                        De bifat data viitoare:
                      </span>
                      <div className="space-y-1">
                        {activeReport.missed.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-amber-200/80 bg-amber-950/20 p-2 rounded-xl border border-amber-800/30">
                            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gemini Story */}
                  {activeReport.summaryText && (
                    <div className="pt-2 border-t border-emerald-800/30">
                      <p className="text-xs text-slate-200 leading-relaxed italic bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        „{activeReport.summaryText}”
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Travel Plan Itinerary & Checkpoints (if trip.planData) */}
        {trip.planData && (
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                Planul Călătoriei ({trip.planData.days} Zile)
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                {trip.planData.style}
              </span>
            </div>

            {/* Weather & Tips (if present) */}
            {trip.planData.weatherForecastSummary && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <CloudSun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    Climat & Vreme:
                  </span>
                  <span>{trip.planData.weatherForecastSummary.tempRange}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed italic">
                  {trip.planData.weatherForecastSummary.description}
                </p>
              </div>
            )}

            {/* Target Checkpoints */}
            {trip.planData.allTargetCheckpoints && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-300 block">
                  Checklist Obiective Țintă:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {trip.planData.allTargetCheckpoints.map((cp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{cp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Packing Checklist in TripDrawer */}
            {trip.planData.packingList && trip.planData.packingList.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Luggage className="w-3.5 h-3.5 text-olive-400" aria-hidden="true" />
                    Bagaje ({trip.planData.packingList.filter(p => p.checked).length}/{trip.planData.packingList.length}):
                  </span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {trip.planData.packingList.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                        item.checked
                          ? "bg-olive-950/40 border-olive-800/50 text-slate-400 line-through"
                          : "bg-slate-950/70 border-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {item.checked ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-olive-400 shrink-0" aria-hidden="true" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded border border-slate-600 shrink-0" />
                        )}
                        <span>{item.item}</span>
                      </div>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {item.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons for Planned Trip */}
            <div className="pt-2 space-y-2">
              {trip.photos.length === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-700/40 text-center space-y-2">
                  <p className="text-xs text-emerald-200">
                    Călătoria este planificată! Încarcă fotografiile realizate pe parcurs pentru a declanșa verificarea AI.
                  </p>
                  {onOpenUploadForTrip && (
                    <button
                      onClick={() => onOpenUploadForTrip(trip)}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-olive-700 to-olive-600 hover:from-olive-600 hover:to-olive-500 text-white font-bold text-xs shadow-glow transition-all flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Încarcă Fotografii din Călătorie</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Photos exist -> Gemini AI Verification Button */
                isPartner && (
                  <div className="space-y-2">
                    {verifyError && (
                      <div className="p-2 rounded-lg bg-rose-950 text-xs text-rose-300 border border-rose-800">
                        {verifyError}
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        setIsVerifying(true);
                        setVerifyError(null);
                        try {
                          const res = await fetch("/api/ai/verify-trip", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ tripId: trip.id }),
                          });
                          const data = await res.json();
                          if (!res.ok || !data.report) {
                            throw new Error(data.error || "Eroare la verificare");
                          }
                          setReport(data.report);
                          if (onTripUpdated) {
                            onTripUpdated({
                              ...trip,
                              status: "COMPLETED",
                              achievementReport: data.report,
                              description: data.trip.description || data.report.summaryText,
                              partnerNotes: data.trip.partnerNotes || data.report.partnerMemory,
                            });
                          }
                        } catch (err: any) {
                          setVerifyError(err.message || "Eroare la verificarea cu Gemini AI");
                        } finally {
                          setIsVerifying(false);
                        }
                      }}
                      disabled={isVerifying}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-olive-700 via-olive-600 to-olive-500 hover:from-olive-600 hover:to-olive-400 text-white font-bold text-xs shadow-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gemini AI analizează fotografiile vs planul inițial...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-olive-200 animate-pulse" />
                          <span>✨ Verifică Realizările cu Gemini AI</span>
                        </>
                      )}
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Featured Photo Viewer */}
        {currentPhoto && currentPhoto.url && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-950 border border-slate-700 shadow-xl group">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.placeName || trip.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-80" />

              {/* Badges on image */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                {currentPhoto.isCountryCover && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-md">
                    <Star className="w-3 h-3 fill-slate-950" />
                    Poză Oficială Țară
                  </span>
                )}
                {currentPhoto.partnerPreselected && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-md">
                    <Heart className="w-3 h-3 fill-white" />
                    Amintire Partener
                  </span>
                )}
                {currentPhoto.hasPeople && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-olive-900/90 text-olive-200 border border-olive-500/40 backdrop-blur-md">
                    <UserCheck className="w-3 h-3 text-olive-300" />
                    Oameni detectați (AI)
                  </span>
                )}
              </div>

              {/* Photo Caption & FlyTo Button */}
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-olive-400" />
                    {currentPhoto.placeName || `${currentPhoto.city || ""}, ${currentPhoto.country || ""}`}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    {trip.isMaskedDate
                      ? `Anul ${currentPhoto.takenYear || trip.year}`
                      : new Date(currentPhoto.takenAt).toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                  </p>
                </div>

                {onFlyToPhoto && (
                  <button
                    onClick={() => onFlyToPhoto(currentPhoto.latitude, currentPhoto.longitude)}
                    title="Apropie Globul de această locație"
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-olive-600 hover:bg-olive-500 text-white font-bold transition-all shadow-glow hover:scale-105"
                  >
                    <span>Zoom pe Glob</span>
                  </button>
                )}
              </div>
            </div>

            {/* Admin Photo Permissions Manager Bar */}
            {isAdmin && !trip.isCountryShowcase && (
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-olive-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-olive-400 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Manager Permisiuni Poză (Admin)
                  </span>

                  {/* Set Country Cover Button */}
                  <button
                    onClick={() => handleToggleCountryCover(currentPhoto)}
                    disabled={updatingPhoto}
                    className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-bold border transition-all ${
                      currentPhoto.isCountryCover
                        ? "bg-amber-500 border-amber-400 text-slate-950 shadow-glow"
                        : "bg-slate-950 border-slate-700 text-slate-300 hover:text-white"
                    }`}
                  >
                    <Star className={`w-3 h-3 ${currentPhoto.isCountryCover ? "fill-slate-950" : ""}`} />
                    <span>{currentPhoto.isCountryCover ? "Poză de Țară" : "Setează ca Poză de Țară"}</span>
                  </button>
                </div>

                {/* Role Pill Switcher */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {(["VIEWER", "CLOSE_FRIEND", "PARTNER", "ADMIN"] as VisibilityRole[]).map((r) => {
                    const isSelected = currentPhoto.minRole === r;
                    return (
                      <button
                        key={r}
                        onClick={() => handleUpdatePhotoRole(currentPhoto, r)}
                        disabled={updatingPhoto}
                        className={`text-[10px] py-1 px-1.5 rounded-md font-semibold border transition-all text-center ${
                          isSelected
                            ? "bg-olive-600 text-white font-bold border-olive-500 shadow-glow"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {r === "VIEWER" && "Viewer"}
                        {r === "CLOSE_FRIEND" && "Prieten"}
                        {r === "PARTNER" && "Partener"}
                        {r === "ADMIN" && "Doar Admin"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Tags on current photo */}
            {currentPhoto.tags && currentPhoto.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
                  <Sparkles className="w-3 h-3 text-olive-400" /> Obiecte AI:
                </span>
                {currentPhoto.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onTagClick && onTagClick(tag)}
                    className="text-xs px-2 py-0.5 rounded-md bg-olive-950/60 hover:bg-olive-900/90 text-olive-300 border border-olive-800/40 transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Thumbnails list if multiple photos */}
        {trip.photos.length > 1 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Fotografii din călătorie ({trip.photos.length})
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {trip.photos.map((p, idx) => {
                const isSelected = p.id === currentPhoto?.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePhotoIdx(idx);
                      onSelectPhoto(p);
                    }}
                    aria-label={`Selectează fotografia ${idx + 1} din ${trip.photos.length}`}
                    aria-pressed={isSelected}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all group ${
                      isSelected
                        ? "border-olive-500 shadow-glow scale-95"
                        : "border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={p.thumbnailUrl || p.url} alt="" className="w-full h-full object-cover" />
                    {p.isCountryCover && (
                      <div className="absolute top-1 right-1 p-0.5 rounded-full bg-amber-500 text-slate-950">
                        <Star className="w-2.5 h-2.5 fill-slate-950" aria-hidden="true" />
                      </div>
                    )}
                    {p.hasPeople && (
                      <div className="absolute bottom-1 right-1 p-0.5 rounded-full bg-olive-900/90 text-olive-300">
                        <UserCheck className="w-2.5 h-2.5" aria-hidden="true" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Comments Section (Disabled in Public Country Mode) */}
        {!trip.isCountryShowcase && (
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-olive-400" aria-hidden="true" />
              Comentarii & Note ({trip.comments.length})
            </h3>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {trip.comments.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Nu există comentarii încă.</p>
              ) : (
                trip.comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-olive-300">{c.userName}</span>
                      <span className="text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            {currentUser ? (
              <form onSubmit={handleSendComment} className="flex gap-2 pt-2">
                <label htmlFor="drawer-comment-input" className="sr-only">
                  Scrie un comentariu
                </label>
                <input
                  id="drawer-comment-input"
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Scrie un mesaj sau o amintire..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-olive-500"
                />
                <button
                  type="submit"
                  aria-label="Trimite comentariul"
                  disabled={submittingComment || !newComment.trim()}
                  className="px-3 py-2 rounded-xl bg-olive-600 hover:bg-olive-500 text-white font-bold text-xs transition-all shadow-glow disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </form>
            ) : (
              <p className="text-[11px] text-slate-500 text-center py-2">
                Conectează-te prin pagina <code className="text-olive-400">/portal</code> pentru a lăsa un comentariu.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

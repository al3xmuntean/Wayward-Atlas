"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Heart,
  Award,
  Calendar,
  Camera,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Compass,
} from "lucide-react";
import { TripData, SafeUser } from "@/lib/types";
import { haversineDistance, HOME_BASE_SIBIU } from "@/lib/distance";
import { extractVisitedCountries } from "@/lib/passport";
import { useModalA11y } from "@/hooks/useModalA11y";
import { useTranslation } from "@/lib/i18n/context";

interface AtlasWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: TripData[];
  currentUser: SafeUser | null;
  initialYear?: number;
}

interface WrappedStoryData {
  narrativeTitle: string;
  narrativeStory: string;
  partnerHighlight?: string;
  travelerArchetype: string;
  quote: string;
}

export const AtlasWrappedModal: React.FC<AtlasWrappedModalProps> = ({
  isOpen,
  onClose,
  trips,
  currentUser,
  initialYear,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  useModalA11y({ isOpen, onClose, modalRef });

  // Extract available years from trips
  const availableYears = Array.from(
    new Set(
      trips
        .filter((t) => t.status !== "PLANNED")
        .map((t) => new Date(t.startDate).getFullYear())
    )
  ).sort((a, b) => b - a);

  const defaultYear = initialYear || availableYears[0] || new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [storyData, setStoryData] = useState<WrappedStoryData | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter trips for selected year
  const yearTrips = trips.filter((t) => {
    if (t.status === "PLANNED") return false;
    const y = new Date(t.startDate).getFullYear();
    return y === selectedYear;
  });

  // Calculate year stats
  let totalKm = 0;
  const uniqueCities = new Set<string>();
  const uniqueCountries = new Set<string>();
  let withPartnerCount = 0;
  const allPhotos: Array<{ url: string; title: string; place?: string }> = [];

  for (const trip of yearTrips) {
    if (trip.withPartner) withPartnerCount++;
    for (const photo of trip.photos) {
      if (photo.city) uniqueCities.add(photo.city);
      if (photo.country) uniqueCountries.add(photo.country);
      allPhotos.push({
        url: photo.thumbnailUrl || photo.url,
        title: trip.title,
        place: photo.placeName || photo.city || trip.title,
      });

      if (photo.latitude && photo.longitude) {
        totalKm += haversineDistance(
          HOME_BASE_SIBIU.latitude,
          HOME_BASE_SIBIU.longitude,
          photo.latitude,
          photo.longitude
        );
      }
    }
  }

  // Equator laps (40,075 km)
  const equatorLaps = (totalKm / 40075).toFixed(1);
  // Distance to Moon: ~384,400 km
  const moonPct = ((totalKm / 384400) * 100).toFixed(2);

  const topPhoto = allPhotos[0];

  // Fetch or regenerate Gemini narrative
  const fetchWrappedStory = async () => {
    setIsLoadingAi(true);
    try {
      const res = await fetch("/api/ai/wrapped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          totalKm,
          tripsCount: yearTrips.length,
          countries: Array.from(uniqueCountries),
          cities: Array.from(uniqueCities),
          topTripTitle: yearTrips[0]?.title,
          withPartnerCount,
        }),
      });
      const data = await res.json();
      if (data?.wrapped) {
        setStoryData(data.wrapped);
      }
    } catch (e) {
      console.warn("Failed to fetch Atlas Wrapped story:", e);
    } finally {
      setIsLoadingAi(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWrappedStory();
    }
  }, [isOpen, selectedYear]);

  // Handle keyboard arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setCurrentSlide((prev) => Math.min(4, prev + 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const totalSlides = 5;

  const handleCopySummary = () => {
    const text = `🌍 Atlas Wrapped ${selectedYear} (din Sibiu)
✨ ${Math.round(totalKm).toLocaleString()} km parcurși
🚩 ${yearTrips.length} călătorii • ${uniqueCountries.size} țări vizitate
💫 Rang: ${storyData?.travelerArchetype || "Explorator de Meridiane"}
"${storyData?.quote || "Lumea este a celor care o explorează!"}"`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wrapped-modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-lg bg-gradient-to-br from-[#162010] via-[#0e150b] to-[#060a04] rounded-3xl border-2 border-olive-500/40 shadow-2xl overflow-hidden flex flex-col min-h-[580px] max-h-[92vh] text-white"
      >
        {/* Story Progress Bars */}
        <div className="p-4 pb-2 flex gap-1.5 z-20">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <div
              key={idx}
              className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden cursor-pointer"
              onClick={() => setCurrentSlide(idx)}
            >
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  idx <= currentSlide
                    ? "bg-gradient-to-r from-olive-500 to-amber-400"
                    : "bg-transparent"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Top Controls Bar */}
        <div className="px-5 py-1.5 flex items-center justify-between z-20 border-b border-olive-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-widest text-amber-200 uppercase">
              ATLAS WRAPPED
            </span>
            {availableYears.length > 1 && (
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setCurrentSlide(0);
                }}
                className="px-2 py-0.5 rounded-lg bg-olive-950 border border-olive-700/60 text-xs font-bold text-olive-300 focus:outline-none"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Închide Atlas Wrapped"
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-olive-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Slide Canvas Body */}
        <div className="relative flex-1 p-6 flex flex-col justify-center items-center text-center overflow-y-auto">
          {/* SLIDE 0: INTRO */}
          {currentSlide === 0 && (
            <div className="space-y-6 animate-fade-in w-full">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-olive-700 to-amber-500 flex items-center justify-center shadow-glow border-2 border-amber-300/40">
                <Globe2 className="w-10 h-10 text-white" aria-hidden="true" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-olive-900/80 text-olive-300 border border-olive-600/40">
                  {storyData?.travelerArchetype || "Explorator de Meridiane"}
                </span>
                <h3 id="wrapped-modal-title" className="text-3xl font-black tracking-tight text-white">
                  Anul tău pe Glob: {selectedYear}
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Recapitularea călătoriilor tale pornite din Sibiu, destinațiile descoperite și kilometrii adăugați pe odometrul cosmic al Terrei.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-olive-950/50 border border-olive-800/40 space-y-1">
                <span className="text-[11px] text-slate-400 block">Punct de plecare fix:</span>
                <span className="text-xs font-bold text-amber-300">Sibiu, Transilvania 🇷🇴</span>
              </div>
            </div>
          )}

          {/* SLIDE 1: ODOMETRU & DISTANȚE */}
          {currentSlide === 1 && (
            <div className="space-y-6 animate-fade-in w-full">
              <div className="p-3 w-14 h-14 mx-auto rounded-2xl bg-olive-800/60 border border-olive-500/40 text-olive-300 flex items-center justify-center">
                <Compass className="w-8 h-8" aria-hidden="true" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Odometrul Călătoriilor {selectedYear}
                </span>
                <h4 className="text-4xl font-black text-amber-300 font-mono tracking-tight">
                  {Math.round(totalKm).toLocaleString()} km
                </h4>
                <p className="text-xs text-slate-300">parcurși în total din Sibiu</p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                  <span className="text-xl font-bold text-emerald-300 block">{equatorLaps}x</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Ocolul Ecuatorului</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                  <span className="text-xl font-bold text-olive-300 block">{moonPct}%</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Până la Lună</span>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: HARTA DESTINAȚIILOR */}
          {currentSlide === 2 && (
            <div className="space-y-6 animate-fade-in w-full">
              <div className="p-3 w-14 h-14 mx-auto rounded-2xl bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 flex items-center justify-center">
                <Award className="w-8 h-8" aria-hidden="true" />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Harta Expedițiilor {selectedYear}
                </span>
                <h4 className="text-2xl font-black text-white">
                  {yearTrips.length} Călătorii • {uniqueCountries.size} Țări
                </h4>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-left space-y-3 w-full max-w-sm">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Țări Explorate:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Array.from(uniqueCountries).map((c) => (
                      <span key={c} className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-olive-950 border border-olive-700/60 text-olive-200">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Orașe & Puncte:</span>
                  <p className="text-xs text-slate-300 leading-snug pt-0.5">
                    {Array.from(uniqueCities).slice(0, 8).join(" • ") || "Destinații diverse"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: AMINTIREA ANULUI & MOMENTUL ÎN DOI */}
          {currentSlide === 3 && (
            <div className="space-y-5 animate-fade-in w-full">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Amintirea Vedetă a Anului {selectedYear}
                </span>
                <h4 className="text-xl font-black text-white">
                  {yearTrips[0]?.title || "Cadre de Neuitat"}
                </h4>
              </div>

              {topPhoto ? (
                <div className="relative w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden border-2 border-olive-500/40 shadow-2xl mx-auto">
                  <img src={topPhoto.url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <span className="text-xs font-bold text-white text-left">{topPhoto.place}</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                  <Camera className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Fotografii din călătoriile acestui an</p>
                </div>
              )}

              {withPartnerCount > 0 && (
                <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/40 flex items-center gap-2.5 text-left max-w-sm mx-auto">
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-400 shrink-0" aria-hidden="true" />
                  <span className="text-xs text-rose-200">
                    <strong className="text-white">{withPartnerCount}</strong> călătorii trăite în doi cu partenerul!
                  </span>
                </div>
              )}
            </div>
          )}

          {/* SLIDE 4: CRONICA GEMINI AI */}
          {currentSlide === 4 && (
            <div className="space-y-4 animate-fade-in w-full text-left">
              <div className="flex items-center justify-between pb-2 border-b border-olive-900/50">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  Cronica Anuală Gemini AI
                </span>
                <button
                  type="button"
                  onClick={fetchWrappedStory}
                  disabled={isLoadingAi}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                  title="Generează din nou povestea"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? "animate-spin text-olive-400" : ""}`} />
                </button>
              </div>

              {isLoadingAi ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-olive-400 mx-auto" />
                  <p className="text-xs text-slate-400">Gemini compune cronica anuală...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-white">
                    {storyData?.narrativeTitle || `Recapitularea Anului ${selectedYear}`}
                  </h4>

                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
                    {storyData?.narrativeStory}
                  </p>

                  {storyData?.partnerHighlight && (
                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200 flex items-start gap-2">
                      <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 shrink-0 mt-0.5" />
                      <span className="italic">{storyData.partnerHighlight}</span>
                    </div>
                  )}

                  {storyData?.quote && (
                    <p className="text-[11px] text-amber-300/90 italic text-center pt-1 border-t border-slate-800">
                      „{storyData.quote}”
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="w-full py-2.5 px-3 rounded-xl bg-olive-700 hover:bg-olive-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors mt-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>{t("wrapped.copiedStory")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t("wrapped.shareWrapped")}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Slide Navigation Bar */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-olive-900/40 flex items-center justify-between z-20">
          <button
            type="button"
            onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
            disabled={currentSlide === 0}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Slide-ul anterior"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>

          <span className="text-xs font-mono font-bold text-slate-400">
            {currentSlide + 1} / {totalSlides}
          </span>

          <button
            type="button"
            onClick={() => setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1))}
            disabled={currentSlide === totalSlides - 1}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Slide-ul următor"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

"use client";

import React, { useRef, useState } from "react";
import { X, Globe2, Sparkles, MapPin, Calendar, Award, Compass, Camera, ShieldCheck } from "lucide-react";
import { TripData, SafeUser } from "@/lib/types";
import { extractVisitedCountries, getExplorationStats, VisitedCountry } from "@/lib/passport";
import { useModalA11y } from "@/hooks/useModalA11y";
import { useTranslation } from "@/lib/i18n/context";

interface VirtualPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: TripData[];
  currentUser: SafeUser | null;
  onSelectCountry?: (countryName: string) => void;
}

const STAMP_COLORS = [
  "border-olive-500 text-olive-400 bg-olive-950/20",
  "border-olive-400 text-olive-300 bg-olive-950/30",
  "border-amber-500 text-amber-400 bg-amber-950/20",
  "border-rose-500 text-rose-400 bg-rose-950/20",
  "border-emerald-500 text-emerald-400 bg-emerald-950/20",
  "border-lime-600 text-lime-400 bg-lime-950/20",
];

const STAMP_ROTATIONS = ["-rotate-3", "rotate-2", "-rotate-6", "rotate-4", "-rotate-2", "rotate-6"];

export const VirtualPassportModal: React.FC<VirtualPassportModalProps> = ({
  isOpen,
  onClose,
  trips,
  currentUser,
  onSelectCountry,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  useModalA11y({ isOpen, onClose, modalRef });

  const [activePage, setActivePage] = useState<"id" | "stamps">("id");

  if (!isOpen) return null;

  const visitedCountries = extractVisitedCountries(trips);
  const stats = getExplorationStats(visitedCountries);

  const passportNumber = `WA-${(currentUser?.id || "GUEST-001").slice(0, 8).toUpperCase()}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passport-modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl bg-gradient-to-br from-[#1b2614] via-[#10170c] to-[#080d06] rounded-3xl border-2 border-olive-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white"
      >
        {/* Vintage Golden Header Banner */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-olive-900/60 via-olive-800/40 to-olive-900/60 border-b border-olive-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-olive-700/80 border border-olive-400/50 flex items-center justify-center shadow-glow">
              <Globe2 className="w-5 h-5 text-amber-200" aria-hidden="true" />
            </div>
            <div>
              <h2 id="passport-modal-title" className="text-sm sm:text-base font-black tracking-widest text-amber-100 uppercase">
                {t("passport.republic")}
              </h2>
              <span className="text-[10px] text-olive-300 font-semibold tracking-wider">
                {t("passport.subtitle")}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Închide Pașaportul Virtual"
            className="p-1.5 rounded-xl bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-olive-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Passport Page Switcher */}
        <div className="px-6 pt-3 flex gap-2 border-b border-olive-900/60" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activePage === "id"}
            onClick={() => setActivePage("id")}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activePage === "id"
                ? "border-amber-400 text-amber-200"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("passport.statsTitle")}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activePage === "stamps"}
            onClick={() => setActivePage("stamps")}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activePage === "stamps"
                ? "border-amber-400 text-amber-200"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Award className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("passport.entryStampsTitle")} ({visitedCountries.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activePage === "id" ? (
            /* --- PAGE 1: IDENTIFICATION & EXPLORATION STATS --- */
            <div className="space-y-5 animate-fade-in">
              {/* ID Badge Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-olive-950/70 via-slate-900/80 to-slate-950 border border-olive-600/40 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-olive-800/40">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-olive-800/80 border-2 border-amber-400/60 flex items-center justify-center text-xl font-black text-amber-100 shadow-md">
                      {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "WA"}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">{currentUser?.name || "Călător Pasionat"}</h3>
                      <p className="text-xs text-olive-300 font-medium">
                        Rol: <span className="font-bold text-amber-200">{currentUser?.role || "GUEST"}</span>
                      </p>
                      <span className="text-[11px] text-slate-400">Punct de plecare: Sibiu, România 🇷🇴</span>
                    </div>
                  </div>

                  <div className="text-right sm:self-center">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Nr. Document:</span>
                    <span className="text-xs font-mono font-black text-amber-300 tracking-wider">
                      {passportNumber}
                    </span>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-olive-900/90 text-olive-200 border border-olive-600/50">
                      {stats.rankBadge} {stats.rankTitle}
                    </span>
                  </div>
                </div>

                {/* Metrics 4-grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-2xl font-black text-amber-300 block">{stats.totalVisited}</span>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t("passport.visitedCountries")}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-2xl font-black text-olive-300 block">{stats.totalCities}</span>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t("wrapped.citiesVisited")}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-2xl font-black text-emerald-300 block">{stats.percentageOfWorld}%</span>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t("passport.worldExplored")}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-2xl font-black text-olive-300 block">{trips.filter(t => t.status !== "PLANNED").length}</span>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Expediții</span>
                  </div>
                </div>

                {/* Global Coverage Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold">Harta Mondială Răzuibilă:</span>
                    <span className="text-amber-300 font-bold font-mono">{stats.totalVisited} din 195 state suverane</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-olive-600 via-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(2, stats.percentageOfWorld)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Jump to Stamps Button */}
              <button
                type="button"
                onClick={() => setActivePage("stamps")}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-olive-800 to-olive-700 hover:from-olive-700 hover:to-olive-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Award className="w-4 h-4 text-amber-300" aria-hidden="true" />
                <span>Răsfoiește Ștampilele de Intrare în Țări ({visitedCountries.length})</span>
              </button>
            </div>
          ) : (
            /* --- PAGE 2: AUTHENTIC VISA & ENTRY STAMPS --- */
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-olive-900/50">
                <span className="font-bold uppercase tracking-wider">
                  Filele de viză • Ștampile Oficiale de Intrare
                </span>
                <span>{visitedCountries.length} de țări validate</span>
              </div>

              {visitedCountries.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
                  <Compass className="w-8 h-8 text-slate-500 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-xs text-slate-400">{t("passport.noStamps")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {visitedCountries.map((country, idx) => {
                    const colorClass = STAMP_COLORS[idx % STAMP_COLORS.length];
                    const rotationClass = STAMP_ROTATIONS[idx % STAMP_ROTATIONS.length];
                    const formattedDate = new Date(country.firstVisitDate).toLocaleDateString("ro-RO", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).toUpperCase();

                    return (
                      <div
                        key={country.isoA2}
                        onClick={() => {
                          if (onSelectCountry) {
                            onSelectCountry(country.name);
                            onClose();
                          }
                        }}
                        className={`relative p-4 rounded-2xl border-2 border-dashed ${colorClass} ${rotationClass} hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg group select-none`}
                        title={`Apasă pentru a filtra călătoriile din ${country.name}`}
                      >
                        {/* Authentic Stamp Design */}
                        <div className="flex items-center justify-between pb-2 border-b border-current/30">
                          <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <span>ENTRY • POLIȚIE FRONTIERĂ</span>
                          </span>
                          <span className="text-base">{country.flag}</span>
                        </div>

                        <div className="py-2.5 text-center space-y-0.5">
                          <span className="text-sm font-black tracking-widest block uppercase">
                            {country.normalizedName || country.name}
                          </span>
                          <span className="text-xs font-mono font-bold tracking-wider block opacity-90">
                            ★ {formattedDate} ★
                          </span>
                          <span className="text-[10px] font-bold block opacity-75">
                            PUNCTUL: {country.cities[0]?.toUpperCase() || "INTERNAȚIONAL"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-current/30 text-[10px] font-mono">
                          <span>{country.tripsCount} {country.tripsCount === 1 ? "EXPEDIȚIE" : "EXPEDIȚII"}</span>
                          <span>{country.photosCount} FOTO</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

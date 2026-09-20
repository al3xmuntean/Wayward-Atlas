"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, Calendar, ChevronRight, Sparkles, Lock } from "lucide-react";

interface TimelineSliderProps {
  years: number[];
  selectedYear: number | null; // null = all years
  selectedMonth: number | null; // 1-12, null = whole year
  onSelectYear: (year: number | null) => void;
  onSelectMonth: (month: number | null) => void;
  isGuest: boolean;
}

const MONTH_NAMES = [
  "Ian", "Feb", "Mar", "Apr", "Mai", "Iun",
  "Iul", "Aug", "Sep", "Oct", "Noi", "Dec",
];

export function TimelineSlider({
  years,
  selectedYear,
  selectedMonth,
  onSelectYear,
  onSelectMonth,
  isGuest,
}: TimelineSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play cycling through years
  useEffect(() => {
    if (!isPlaying || years.length <= 1) return;

    const interval = setInterval(() => {
      const currentIndex = selectedYear === null ? -1 : years.indexOf(selectedYear);
      const nextIndex = currentIndex === -1 || currentIndex === years.length - 1 ? 0 : currentIndex + 1;
      onSelectYear(years[nextIndex]);
      onSelectMonth(null);
    }, 2800);

    return () => clearInterval(interval);
  }, [isPlaying, years, selectedYear, onSelectYear, onSelectMonth]);

  if (years.length === 0) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 max-w-[92vw] pointer-events-auto">
      {/* Month selector if a year is picked and not in guest mode */}
      {selectedYear !== null && !isGuest && (
        <div className="flex items-center gap-1 glass-panel px-3 py-1.5 rounded-full border-cyan-500/20 animate-fade-in shadow-lg">
          <span className="text-[11px] font-semibold text-cyan-400 mr-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Luni:
          </span>
          <button
            onClick={() => onSelectMonth(null)}
            className={`px-2 py-0.5 rounded-full text-xs transition-all ${
              selectedMonth === null
                ? "bg-cyan-500 text-white font-bold shadow-glow"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            Tot anul
          </button>
          {MONTH_NAMES.map((name, idx) => (
            <button
              key={name}
              onClick={() => onSelectMonth(idx + 1)}
              className={`px-1.5 py-0.5 rounded-md text-[11px] transition-all ${
                selectedMonth === idx + 1
                  ? "bg-cyan-500 text-white font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/80"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Main Year Scrubber Bar */}
      <div className="flex items-center gap-2 glass-panel-glow px-4 py-2.5 rounded-2xl">
        {/* Play / Pause Auto-Tour Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? "Pauză tur cronologic" : "Pornește turul cronologic al globului"}
          className={`p-2 rounded-xl text-white transition-all ${
            isPlaying
              ? "bg-cyan-500 text-slate-950 shadow-glow animate-pulse"
              : "bg-slate-800/80 hover:bg-slate-700 text-cyan-300"
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* All Years Tab */}
        <button
          onClick={() => {
            onSelectYear(null);
            onSelectMonth(null);
            setIsPlaying(false);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selectedYear === null
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow"
              : "text-slate-300 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          Toate Călătoriile
        </button>

        <div className="w-px h-5 bg-slate-700/60 mx-1" />

        {/* Year Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60vw] py-0.5 no-scrollbar">
          {years.map((year) => {
            const isSelected = selectedYear === year;
            return (
              <button
                key={year}
                onClick={() => {
                  onSelectYear(isSelected ? null : year);
                  onSelectMonth(null);
                  setIsPlaying(false);
                }}
                className={`group relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 shadow-glow scale-105"
                    : "text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-700/60"
                }`}
              >
                <span>{year}</span>
                {isSelected && (
                  <span className="absolute -top-1 right-1 w-1.5 h-1.5 rounded-full bg-white ring-1 ring-cyan-300" />
                )}
              </button>
            );
          })}
        </div>

        {/* Guest Obfuscation Notice */}
        {isGuest && (
          <div
            title="În modul Guest datele sunt anonimizate la nivel de an. Autentifică-te pentru zile și luni exacte!"
            className="flex items-center gap-1 text-[11px] text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded-lg ml-1 hidden md:flex"
          >
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Filtrare pe ani (Guest)</span>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Search, X, Sparkles, MapPin, Tag } from "lucide-react";

interface GlobeSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchesCount: number;
  totalPinsCount: number;
  availableTags: string[];
}

export function GlobeSearch({
  searchQuery,
  onSearchChange,
  matchesCount,
  totalPinsCount,
  availableTags,
}: GlobeSearchProps) {
  const isFiltering = searchQuery.trim().length > 0;

  return (
    <div className="absolute top-20 left-6 z-20 w-80 max-w-[85vw] pointer-events-auto flex flex-col gap-2">
      {/* Search Input Box */}
      <div className="relative glass-panel-glow rounded-2xl flex items-center px-3.5 py-2.5 transition-all focus-within:ring-2 focus-within:ring-olive-500">
        <Search className="w-4 h-4 text-olive-700 dark:text-olive-400 mr-2.5 flex-shrink-0" aria-hidden="true" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Caută călătorii după an, oraș sau tag AI"
          placeholder="Caută an, oraș, sau obiect AI (plajă, munte)..."
          className="bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none w-full"
        />
        {isFiltering && (
          <button
            onClick={() => onSearchChange("")}
            aria-label="Șterge textul de căutare"
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-olive-500/15 transition-colors"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Filter Status & Tag suggestions */}
      <div className="flex flex-col gap-1.5">
        {isFiltering ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between text-xs px-2.5 text-olive-800 dark:text-olive-300 bg-olive-500/15 dark:bg-olive-950/70 border border-olive-500/40 rounded-xl py-1"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-olive-600 dark:text-olive-400" aria-hidden="true" />
              <span>
                {matchesCount} {matchesCount === 1 ? "loc găsit" : "locuri găsite"}
              </span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">din {totalPinsCount}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar" role="group" aria-label="Taguri sugerate">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 pl-1 flex-shrink-0">
              <Tag className="w-3 h-3 text-olive-600 dark:text-olive-400" aria-hidden="true" /> Sugestii:
            </span>
            {availableTags.slice(0, 5).map((tag) => (
              <button
                key={tag}
                onClick={() => onSearchChange(tag)}
                aria-label={`Filtrează după eticheta ${tag}`}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-olive-900/10 dark:bg-olive-950/80 border border-olive-500/30 text-olive-900 dark:text-olive-200 hover:text-olive-700 dark:hover:text-olive-300 hover:border-olive-500/60 hover:bg-olive-500/15 transition-all flex-shrink-0"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

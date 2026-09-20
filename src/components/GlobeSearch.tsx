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
      <div className="relative glass-panel-glow rounded-2xl flex items-center px-3.5 py-2.5 transition-all focus-within:ring-2 focus-within:ring-cyan-400">
        <Search className="w-4 h-4 text-cyan-400 mr-2.5 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Caută an, oraș, sau obiect AI (plajă, munte)..."
          className="bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none w-full"
        />
        {isFiltering && (
          <button
            onClick={() => onSearchChange("")}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Status & Tag suggestions */}
      <div className="flex flex-col gap-1.5">
        {isFiltering ? (
          <div className="flex items-center justify-between text-xs px-2 text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 rounded-xl py-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>
                {matchesCount} {matchesCount === 1 ? "loc găsit" : "locuri găsite"}
              </span>
            </span>
            <span className="text-[10px] text-slate-400">din {totalPinsCount}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 pl-1 flex-shrink-0">
              <Tag className="w-3 h-3 text-cyan-400" /> Sugestii:
            </span>
            {availableTags.slice(0, 5).map((tag) => (
              <button
                key={tag}
                onClick={() => onSearchChange(tag)}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-all flex-shrink-0"
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

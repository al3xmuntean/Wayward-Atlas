"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation, LANGUAGES, Language } from "@/lib/i18n/context";
import { ChevronDown, Check, Globe } from "lucide-react";

interface LanguageSelectorProps {
  isMobile?: boolean;
  onLanguageChange?: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  isMobile = false,
  onLanguageChange,
}) => {
  const { language, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
    onLanguageChange?.();
  };

  if (isMobile) {
    return (
      <div className="space-y-1.5 py-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-2">
          <Globe className="w-3.5 h-3.5 text-olive-500" aria-hidden="true" />
          {t("nav.language")}
        </span>
        <div className="grid grid-cols-2 gap-1.5 px-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              aria-label={`Selectează limba ${l.nativeName}`}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                language === l.code
                  ? "bg-olive-600 text-white shadow-sm"
                  : "glass-panel text-slate-300 hover:text-white hover:bg-slate-800/80"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{l.flag}</span>
                <span>{l.nativeName}</span>
              </span>
              {language === l.code && <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t("nav.language")}: ${currentOption.nativeName}`}
        title={`${t("nav.language")}: ${currentOption.nativeName}`}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl font-bold text-xs text-slate-800 dark:text-slate-200 glass-panel border-olive-500/20 hover:border-olive-500/50 hover:text-olive-700 dark:hover:text-olive-300 transition-all shadow-sm"
      >
        <span className="text-sm leading-none" aria-hidden="true">
          {currentOption.flag}
        </span>
        <span className="uppercase tracking-wider text-[11px]">{currentOption.code}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t("nav.language")}
          className="absolute right-0 mt-2 w-44 glass-panel rounded-2xl p-1.5 border border-olive-500/30 shadow-2xl z-50 animate-fade-in divide-y divide-slate-800/40"
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={language === l.code}
              onClick={() => handleSelect(l.code)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                language === l.code
                  ? "bg-olive-600/30 text-olive-700 dark:text-olive-300 font-bold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base leading-none" aria-hidden="true">
                  {l.flag}
                </span>
                <span>{l.nativeName}</span>
              </span>
              {language === l.code && (
                <Check className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

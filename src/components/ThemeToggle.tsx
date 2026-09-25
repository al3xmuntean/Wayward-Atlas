"use client";

import React from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n/context";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const themeLabel =
    theme === "dark"
      ? t("nav.themeDark")
      : theme === "light"
      ? t("nav.themeLight")
      : t("nav.themeSystem");

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Comută tema: ${themeLabel}`}
      title={`Temă: ${themeLabel}`}
      className={`p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-olive-700 dark:hover:text-olive-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer ${className}`}
    >
      {theme === "system" ? (
        <Laptop className="w-4 h-4 text-olive-600 dark:text-olive-400" aria-hidden="true" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="w-4 h-4 text-olive-400" aria-hidden="true" />
      ) : (
        <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
      )}
    </button>
  );
}

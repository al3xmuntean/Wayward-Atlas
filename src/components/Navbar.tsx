"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  LogOut,
  Shield,
  User as UserIcon,
  Users,
  Map as MapIcon,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  LayoutGrid,
  Globe2,
  ChevronDown,
  LogIn,
  Menu,
  X,
  Heart,
  Star,
  Eye,
  Award,
  Gift,
  BarChart3,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { SafeUser } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageSelector } from "./LanguageSelector";

export type ViewMode = "sphere" | "flat" | "gallery";

interface NavbarProps {
  user: SafeUser | null;
  onLogout: () => void;
  onOpenUpload: () => void;
  onOpenUsersModal: () => void;
  onOpenTravelPlanner: () => void;
  onOpenAuthModal: () => void;
  onOpenPassport?: () => void;
  onOpenWrapped?: () => void;
  onOpenAnalytics?: () => void;
  tripsCount: number;
  photosCount: number;
  viewMode: ViewMode;
  onSelectViewMode: (mode: ViewMode) => void;
}

export function Navbar({
  user,
  onLogout,
  onOpenUpload,
  onOpenUsersModal,
  onOpenTravelPlanner,
  onOpenAuthModal,
  onOpenPassport,
  onOpenWrapped,
  onOpenAnalytics,
  tripsCount,
  photosCount,
  viewMode,
  onSelectViewMode,
}: NavbarProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const themeLabel =
    theme === "dark" ? t("nav.themeDark") : theme === "light" ? t("nav.themeLight") : t("nav.themeSystem");

  return (
    <>
      {/* =========================================================================
          TOP NAVIGATION BAR (DESKTOP & MOBILE HEADER)
          ========================================================================= */}
      <header className="fixed md:absolute top-0 left-0 right-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3.5 pointer-events-none">
        <div className="w-full flex items-center justify-between pointer-events-auto">

          {/* -----------------------------------------------------------------------
              DESKTOP LEFT: Typographic Branding & Live Stats
              ----------------------------------------------------------------------- */}
          <div className="hidden md:flex items-center gap-3">
            <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-3 border-olive-500/20 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    <span className="text-olive-700 dark:text-olive-400">Wayward</span> Atlas
                  </h1>
                  <span
                    aria-label={`Vizualizare activă: ${viewMode === "sphere" ? t("nav.sphere") : viewMode === "flat" ? t("nav.flat") : t("nav.gallery")}`}
                    className="inline-block px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-olive-800 dark:text-olive-200 bg-olive-500/15 border border-olive-500/30 rounded-md uppercase"
                  >
                    {viewMode === "sphere" ? t("nav.sphere") : viewMode === "flat" ? t("nav.flat") : t("nav.gallery")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span>{tripsCount} {t("nav.statsTrips")}</span>
                  <span aria-hidden="true">•</span>
                  <span>{photosCount} {t("nav.statsPhotos")}</span>
                </p>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------------
              DESKTOP CENTER: Mode Switcher (Terra 3D | Hartă | Showcase)
              ----------------------------------------------------------------------- */}
          <div className="hidden md:flex items-center">
            <nav
              aria-label="Comutare mod vizualizare"
              role="tablist"
              className="flex items-center p-1 rounded-2xl glass-panel border-olive-500/20 gap-1 shadow-xs"
            >
              <button
                role="tab"
                aria-selected={viewMode !== "gallery"}
                aria-label={t("nav.sphere")}
                onClick={() => onSelectViewMode("sphere")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  viewMode !== "gallery"
                    ? "bg-olive-700 text-white dark:bg-olive-600 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-olive-500/10"
                }`}
              >
                <Globe2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Terra 3D</span>
              </button>

              <button
                role="tab"
                aria-selected={viewMode === "gallery"}
                aria-label={t("nav.gallery")}
                onClick={() => onSelectViewMode("gallery")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  viewMode === "gallery"
                    ? "bg-olive-700 text-white dark:bg-olive-600 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-olive-500/10"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Showcase</span>
              </button>
            </nav>
          </div>

          {/* -----------------------------------------------------------------------
              DESKTOP RIGHT: Features, Utilities & Profile
              ----------------------------------------------------------------------- */}
          <div className="hidden md:flex items-center gap-2">
            {/* Virtual Passport Button */}
            {onOpenPassport && (
              <button
                onClick={onOpenPassport}
                aria-label={t("nav.passport")}
                title={t("nav.passport")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-slate-800 dark:text-amber-200 glass-panel border-olive-500/20 hover:border-amber-400/40 hover:text-amber-600 dark:hover:text-amber-300 transition-all shadow-xs hover:scale-105"
              >
                <Award className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                <span>{t("nav.passport")}</span>
              </button>
            )}

            {/* Atlas Wrapped Button */}
            {onOpenWrapped && (
              <button
                onClick={onOpenWrapped}
                aria-label={t("nav.wrapped")}
                title={t("nav.wrapped")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-slate-800 dark:text-olive-200 glass-panel border-olive-500/20 hover:border-olive-400/50 hover:text-olive-700 dark:hover:text-olive-300 transition-all shadow-xs hover:scale-105"
              >
                <Gift className="w-3.5 h-3.5 text-olive-500" aria-hidden="true" />
                <span>{t("nav.wrapped")}</span>
              </button>
            )}

            {/* Travel Assist Planner Button (for Admin & Partner) */}
            {user && (user.role === "ADMIN" || user.role === "PARTNER") && (
              <button
                onClick={onOpenTravelPlanner}
                aria-label={t("nav.travelAssist")}
                title={t("nav.travelAssist")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-olive-700 to-olive-600 hover:from-olive-600 hover:to-olive-500 transition-all shadow-xs hover:scale-105"
              >
                <Sparkles className="w-3.5 h-3.5 text-olive-200" aria-hidden="true" />
                <span>{t("nav.travelAssist")}</span>
              </button>
            )}

            {/* Admin / Partner Add Trip Button (Dedicated Full-Page Studio) */}
            {user && (user.role === "ADMIN" || user.role === "PARTNER") && (
              <a
                href="/manage/trip/new"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("nav.addTrip")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs text-white bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 transition-all shadow-xs hover:scale-105"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t("nav.addTrip")}</span>
              </a>
            )}

            {/* Language Selector */}
            <LanguageSelector />

            {/* Dark / Light / System Theme Toggle */}
            <button
              onClick={cycleTheme}
              aria-label={`Comută tema: ${themeLabel}`}
              title={`Temă: ${themeLabel}`}
              className="glass-panel p-2.5 rounded-2xl text-slate-700 dark:text-slate-200 hover:text-olive-700 dark:hover:text-olive-300 transition-all border-olive-500/20 shadow-xs"
            >
              {theme === "system" ? (
                <Laptop className="w-4 h-4 text-olive-600 dark:text-olive-400" aria-hidden="true" />
              ) : resolvedTheme === "dark" ? (
                <Moon className="w-4 h-4 text-olive-400" aria-hidden="true" />
              ) : (
                <Sun className="w-4 h-4 text-amber-600" aria-hidden="true" />
              )}
            </button>

            {/* Persistent Login / User Profile Pill */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  aria-label={`Meniu cont: ${user.name} (${user.role})`}
                  className="flex items-center gap-2 glass-panel p-1.5 rounded-2xl border-olive-500/30 hover:border-olive-500/60 transition-all shadow-xs"
                >
                  {/* Role Badge */}
                  {user.role === "ADMIN" ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-olive-500/25 text-olive-900 dark:text-olive-200 border border-olive-500/40">
                      <Shield className="w-3 h-3 text-olive-700 dark:text-olive-400" aria-hidden="true" />
                      Admin
                    </span>
                  ) : user.role === "PARTNER" ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                      <Heart className="w-3 h-3 text-rose-600 dark:text-rose-400 fill-rose-600 dark:fill-rose-400" aria-hidden="true" />
                      Partener
                    </span>
                  ) : user.role === "CLOSE_FRIEND" ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      <Star className="w-3 h-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      Prieten
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-olive-500/20 text-olive-800 dark:text-olive-300 border border-olive-500/30">
                      <Eye className="w-3 h-3 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                      Viewer
                    </span>
                  )}

                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                    {user.name}
                  </span>

                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" aria-hidden="true" />
                </button>

                {/* Dropdown User Menu */}
                {isUserMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Opțiuni cont"
                    className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl p-2 border border-olive-500/30 shadow-2xl z-50 animate-fade-in"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-olive-500/15 mb-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    </div>

                    {(user.role === "ADMIN" || user.role === "PARTNER") && (
                      <>
                        <Link
                          role="menuitem"
                          href="/manage"
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-olive-500/15 hover:text-olive-800 dark:hover:text-olive-300 transition-colors text-left"
                        >
                          <Compass className="w-4 h-4 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                          <span>{t("manager.title")}</span>
                        </Link>

                        <a
                          role="menuitem"
                          href="/manage/trip/new"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-olive-500/15 hover:text-olive-800 dark:hover:text-olive-300 transition-colors text-left"
                        >
                          <Plus className="w-4 h-4 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                          <span>{t("manager.newTripBtn")} (Tab Nou)</span>
                        </a>
                      </>
                    )}

                    {(user.role === "ADMIN" || user.role === "PARTNER") && (
                      <button
                        role="menuitem"
                        onClick={onOpenTravelPlanner}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-olive-500/15 hover:text-olive-800 dark:hover:text-olive-300 transition-colors text-left"
                      >
                        <Sparkles className="w-4 h-4 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                        <span>Travel Assist (AI)</span>
                      </button>
                    )}

                    {user.role === "ADMIN" && (
                      <button
                        role="menuitem"
                        onClick={onOpenUsersModal}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-olive-500/15 hover:text-olive-800 dark:hover:text-olive-300 transition-colors text-left"
                      >
                        <Users className="w-4 h-4 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                        <span>Gestiune Roluri & Permisiuni</span>
                      </button>
                    )}

                    {user.role === "ADMIN" && onOpenAnalytics && (
                      <button
                        role="menuitem"
                        onClick={() => {
                          onOpenAnalytics();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-olive-500/15 hover:text-olive-800 dark:hover:text-olive-300 transition-colors text-left"
                      >
                        <BarChart3 className="w-4 h-4 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                        <span>Statistici & Analytics</span>
                      </button>
                    )}

                    <button
                      role="menuitem"
                      onClick={onOpenAuthModal}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-olive-500/15 hover:text-olive-800 dark:hover:text-olive-300 transition-colors text-left"
                    >
                      <UserIcon className="w-4 h-4 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                      <span>Schimbă Contul (Demo)</span>
                    </button>

                    <div className="my-1 border-t border-olive-500/15" />

                    <button
                      role="menuitem"
                      onClick={onLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      <span>{t("nav.logoutBtn")}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* When logged out: Prominent Quick Login Buttons */
              <div className="flex items-center gap-1.5">
                <a
                  href="/api/auth/google"
                  aria-label="Conectare rapidă cu contul Google"
                  title="Conectare rapidă cu Google"
                  className="glass-panel p-2 rounded-2xl border-olive-500/20 hover:border-olive-500/50 hover:bg-olive-500/10 transition-all text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shadow-xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </a>

                <button
                  onClick={onOpenAuthModal}
                  aria-label={t("nav.loginBtn")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 text-white font-bold text-xs shadow-xs transition-all hover:scale-105"
                >
                  <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t("nav.loginBtn")}</span>
                </button>
              </div>
            )}
          </div>

          {/* -----------------------------------------------------------------------
              MOBILE TOP BAR: Minimalist & Clean (Fits in 320-390px with zero clutter)
              ----------------------------------------------------------------------- */}
          <div className="flex md:hidden items-center justify-between w-full">
            {/* Brand Pill */}
            <div className="glass-panel px-3 py-1.5 rounded-2xl border-olive-500/20 flex items-center gap-2 shadow-xs">
              <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                <span className="text-olive-700 dark:text-olive-400">Wayward</span> Atlas
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-olive-500/15 text-olive-800 dark:text-olive-300 border border-olive-500/30">
                {tripsCount} ✈
              </span>
            </div>

            {/* Mobile Top Controls: Language, Theme & Full Menu Button */}
            <div className="flex items-center gap-1.5">
              {/* Language Selector */}
              <LanguageSelector />

              {/* Theme Toggle */}
              <button
                onClick={cycleTheme}
                aria-label={`Comută tema: ${themeLabel}`}
                title={`Temă: ${themeLabel}`}
                className="glass-panel p-2 rounded-xl text-slate-700 dark:text-slate-200 border-olive-500/20 shadow-xs"
              >
                {resolvedTheme === "dark" ? (
                  <Moon className="w-3.5 h-3.5 text-olive-400" aria-hidden="true" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                )}
              </button>

              {/* Menu Button with Role or Standard Label */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-nav-sheet"
                aria-label="Deschide meniul complet"
                className="glass-panel px-2.5 py-1.5 rounded-xl border border-olive-500/30 text-olive-900 dark:text-olive-200 font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                {user ? (
                  <>
                    {user.role === "ADMIN" && <Shield className="w-3.5 h-3.5 text-olive-700 dark:text-olive-400 shrink-0" />}
                    {user.role === "PARTNER" && <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />}
                    {user.role === "CLOSE_FRIEND" && <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    {user.role === "VIEWER" && <Eye className="w-3.5 h-3.5 text-olive-500 shrink-0" />}
                    <span className="max-w-[65px] truncate text-[11px]">{user.name.split(" ")[0]}</span>
                  </>
                ) : (
                  <>
                    <Menu className="w-3.5 h-3.5 text-olive-700 dark:text-olive-300" aria-hidden="true" />
                    <span className="text-[11px]">Meniu</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* =========================================================================
          MOBILE BOTTOM FLOATING DOCK (Ergonomic Thumb-Friendly App Dock)
          ========================================================================= */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <nav
          aria-label="Bara de navigare rapidă mobilă"
          className="flex items-center gap-1 px-2 py-1.5 rounded-2xl glass-panel-glow border border-olive-500/30 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-slate-950/90"
        >
          <button
            onClick={() => onSelectViewMode("sphere")}
            aria-pressed={viewMode !== "gallery"}
            className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              viewMode !== "gallery"
                ? "bg-olive-700 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Globe2 className="w-4 h-4 mb-0.5" aria-hidden="true" />
            <span>Terra 3D</span>
          </button>

          <button
            onClick={() => onSelectViewMode("gallery")}
            aria-pressed={viewMode === "gallery"}
            className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              viewMode === "gallery"
                ? "bg-olive-700 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LayoutGrid className="w-4 h-4 mb-0.5" aria-hidden="true" />
            <span>Showcase</span>
          </button>

          {onOpenPassport && (
            <button
              onClick={onOpenPassport}
              className="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 transition-all"
            >
              <Award className="w-4 h-4 mb-0.5 text-amber-500" aria-hidden="true" />
              <span>Pașaport</span>
            </button>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Deschide meniul cu toate funcționalitățile"
            className="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl text-[10px] font-bold text-olive-800 dark:text-olive-300 hover:bg-olive-500/15 transition-all"
          >
            <Menu className="w-4 h-4 mb-0.5" aria-hidden="true" />
            <span>Meniu</span>
          </button>
        </nav>
      </div>

      {/* =========================================================================
          MOBILE COMPREHENSIVE FEATURE SHEET / DRAWER (100% Items Available)
          ========================================================================= */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in pointer-events-auto md:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileMenuOpen(false);
          }}
        >
          <div
            id="mobile-nav-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Meniu complet Wayward Atlas"
            className="relative w-full max-h-[88vh] overflow-y-auto glass-panel-glow rounded-t-3xl sm:rounded-3xl p-5 border-t sm:border border-olive-500/30 shadow-2xl space-y-4 animate-scale-up"
          >
            {/* Header: Title & Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-olive-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-olive-500/20 border border-olive-500/30 flex items-center justify-center text-olive-800 dark:text-olive-300 font-black text-xs">
                  WA
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Wayward Atlas</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tripsCount} {t("nav.statsTrips")} • {photosCount} {t("nav.statsPhotos")}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Închide meniul"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Secțiunea 1: Moduri de Explorare */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-olive-800 dark:text-olive-300 uppercase tracking-wider block">
                Moduri de Explorare
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  aria-pressed={viewMode !== "gallery"}
                  onClick={() => {
                    onSelectViewMode("sphere");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-xs font-bold transition-all ${
                    viewMode !== "gallery"
                      ? "bg-olive-700 text-white border-olive-600 shadow-sm"
                      : "glass-panel border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Globe2 className="w-4 h-4 mb-1 text-olive-500" aria-hidden="true" />
                  <span>Terra 3D & Stradal</span>
                </button>

                <button
                  aria-pressed={viewMode === "gallery"}
                  onClick={() => {
                    onSelectViewMode("gallery");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-xs font-bold transition-all ${
                    viewMode === "gallery"
                      ? "bg-olive-700 text-white border-olive-600 shadow-sm"
                      : "glass-panel border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 mb-1 text-olive-500" aria-hidden="true" />
                  <span>Showcase & Retrospectivă</span>
                </button>
              </div>
            </div>

            {/* Secțiunea 2: Experiențe Speciale (Pașaport & Wrapped) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-olive-800 dark:text-olive-300 uppercase tracking-wider block">
                Experiențe & Retrospective
              </span>
              <div className="grid grid-cols-2 gap-2">
                {onOpenPassport && (
                  <button
                    onClick={() => {
                      onOpenPassport();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-2xl glass-panel border border-amber-500/30 text-left hover:border-amber-500/60 transition-all shadow-xs"
                  >
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 shrink-0">
                      <Award className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Pașaport Virtual</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Vize & Ștampile</p>
                    </div>
                  </button>
                )}

                {onOpenWrapped && (
                  <button
                    onClick={() => {
                      onOpenWrapped();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-2xl glass-panel border border-olive-500/30 text-left hover:border-olive-500/60 transition-all shadow-xs"
                  >
                    <div className="p-2 rounded-xl bg-olive-500/15 text-olive-700 dark:text-olive-300 shrink-0">
                      <Gift className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Atlas Wrapped</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Odometru Anual</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Secțiunea 3: Inteligență Artificială (Gemini AI) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-olive-800 dark:text-olive-300 uppercase tracking-wider block">
                Inteligență Artificială (AI)
              </span>
              <button
                onClick={() => {
                  onOpenTravelPlanner();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-olive-800 to-olive-700 text-white shadow-sm transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/10 text-white shrink-0">
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">Travel Assist (Gemini AI)</p>
                    <p className="text-[10px] text-olive-200">Planificator inteligent de itinerarii & bagaje</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 -rotate-90 text-olive-300" aria-hidden="true" />
              </button>
            </div>

            {/* Secțiunea 4: Manager Studio & Permisiuni (Admin / Partener) */}
            {user && (user.role === "ADMIN" || user.role === "PARTNER") && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-olive-800 dark:text-olive-300 uppercase tracking-wider block">
                  Administrare & Studio
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {user.role === "ADMIN" && (
                    <button
                      onClick={() => {
                        onOpenUpload();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 p-3 rounded-2xl bg-olive-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all text-left"
                    >
                      <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-bold">Upload Studio</p>
                        <p className="text-[9px] text-olive-200">Adaugă poze</p>
                      </div>
                    </button>
                  )}

                  {user.role === "ADMIN" && (
                    <button
                      onClick={() => {
                        onOpenUsersModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 p-3 rounded-2xl glass-panel border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold active:scale-95 transition-all text-left"
                    >
                      <Users className="w-4 h-4 text-olive-600 dark:text-olive-400 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-bold">Utilizatori</p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400">Roluri RBAC</p>
                      </div>
                    </button>
                  )}

                  {user.role === "ADMIN" && onOpenAnalytics && (
                    <button
                      onClick={() => {
                        onOpenAnalytics();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 p-3 rounded-2xl glass-panel border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold active:scale-95 transition-all text-left"
                    >
                      <BarChart3 className="w-4 h-4 text-olive-600 dark:text-olive-400 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-bold">Analytics</p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400">Vizualizări & IP-uri</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Secțiunea 5: Setări & Preferințe Locale */}
            <div className="space-y-2 pt-2 border-t border-olive-500/20">
              <span className="text-[11px] font-bold text-olive-800 dark:text-olive-300 uppercase tracking-wider block">
                Limbă & Aspect Vizual
              </span>

              {/* Selector complet de limbi */}
              <LanguageSelector isMobile onLanguageChange={() => setIsMobileMenuOpen(false)} />

              {/* Selector Temă */}
              <div className="flex items-center justify-between p-2 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 pl-1">Aspect Vizual:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      theme === "light"
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Luminos</span>
                  </button>

                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      theme === "dark"
                        ? "bg-olive-700 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Întunecat</span>
                  </button>

                  <button
                    onClick={() => setTheme("system")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      theme === "system"
                        ? "bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Sistem</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Secțiunea 6: Cont & Autentificare */}
            <div className="pt-2 border-t border-olive-500/20 space-y-2">
              <span className="text-[11px] font-bold text-olive-800 dark:text-olive-300 uppercase tracking-wider block">
                Cont & Acces
              </span>

              {user ? (
                <div className="p-3 rounded-2xl glass-panel border border-olive-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-olive-500/20 text-olive-800 dark:text-olive-300 border border-olive-500/30 uppercase">
                      {user.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        onOpenAuthModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="py-2 px-3 rounded-xl glass-panel border border-slate-300 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 hover:bg-olive-500/10 transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                      <span>Schimbă Cont</span>
                    </button>

                    <button
                      onClick={() => {
                        onLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="py-2 px-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-center gap-1.5 hover:bg-rose-500/25 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
                      <span>Deconectare</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <a
                    href="/api/auth/google"
                    aria-label="Conectare cu Google"
                    className="w-full py-2.5 px-4 rounded-xl glass-panel border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Conectare cu Contul Google</span>
                  </a>

                  <button
                    onClick={() => {
                      onOpenAuthModal();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-olive-700 hover:bg-olive-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
                  >
                    <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Autentificare pe Roluri (1-Click Demo)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

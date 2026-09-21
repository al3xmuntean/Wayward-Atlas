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
} from "lucide-react";
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
    <header className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-3 sm:px-6 py-3.5 pointer-events-none">
      {/* Left: Minimalist Typographic Branding (No Logo) & Stats */}
      <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
        <div className="glass-panel px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-2.5 sm:gap-3 border-olive-500/20">
          <div>
            <div className="flex items-center gap-2">
              {/* Pure Typography, NO Logo */}
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                <span className="text-olive-700 dark:text-olive-400">Wayward</span> Atlas
              </h1>
              <span
                aria-label={`Vizualizare activă: ${viewMode === "sphere" ? t("nav.sphere") : viewMode === "flat" ? t("nav.flat") : t("nav.gallery")}`}
                className="hidden xs:inline-block px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wider text-olive-800 dark:text-olive-200 bg-olive-500/15 border border-olive-500/30 rounded-md uppercase"
              >
                {viewMode === "sphere" ? t("nav.sphere") : viewMode === "flat" ? t("nav.flat") : t("nav.gallery")}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>{tripsCount} {t("nav.statsTrips")}</span>
              <span aria-hidden="true">•</span>
              <span>{photosCount} {t("nav.statsPhotos")}</span>
            </p>
          </div>
        </div>

        {/* View Switcher Navigation Landmark (Accessible Tabs) */}
        <nav
          aria-label="Comutare mod vizualizare"
          role="tablist"
          className="flex items-center p-1 rounded-2xl glass-panel border-olive-500/20 gap-0.5 sm:gap-1"
        >
          <button
            role="tab"
            aria-selected={viewMode === "sphere"}
            aria-label={t("nav.sphere")}
            onClick={() => onSelectViewMode("sphere")}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === "sphere"
                ? "bg-olive-700 text-white dark:bg-olive-600 shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-olive-500/10"
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t("nav.sphere")}</span>
          </button>

          <button
            role="tab"
            aria-selected={viewMode === "flat"}
            aria-label={t("nav.flat")}
            onClick={() => onSelectViewMode("flat")}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === "flat"
                ? "bg-olive-700 text-white dark:bg-olive-600 shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-olive-500/10"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t("nav.flat")}</span>
          </button>

          <button
            role="tab"
            aria-selected={viewMode === "gallery"}
            aria-label={t("nav.gallery")}
            onClick={() => onSelectViewMode("gallery")}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === "gallery"
                ? "bg-olive-700 text-white dark:bg-olive-600 shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-olive-500/10"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t("nav.gallery")}</span>
          </button>
        </nav>
      </div>

      {/* Right Controls: Theme Toggle, Language Selector & Persistent Auth */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Language Selector */}
        <LanguageSelector />

        {/* Dark / Light / System Theme Toggle */}
        <button
          onClick={cycleTheme}
          aria-label={`Comută tema: ${themeLabel}`}
          title={`Temă: ${themeLabel}`}
          className="glass-panel p-2.5 rounded-2xl text-slate-700 dark:text-slate-200 hover:text-olive-700 dark:hover:text-olive-300 transition-all border-olive-500/20 shadow-sm"
        >
          {theme === "system" ? (
            <Laptop className="w-4 h-4 text-olive-600 dark:text-olive-400" aria-hidden="true" />
          ) : resolvedTheme === "dark" ? (
            <Moon className="w-4 h-4 text-olive-400" aria-hidden="true" />
          ) : (
            <Sun className="w-4 h-4 text-amber-600" aria-hidden="true" />
          )}
        </button>

        {/* Virtual Passport Button */}
        {onOpenPassport && (
          <button
            onClick={onOpenPassport}
            aria-label={t("nav.passport")}
            title={t("nav.passport")}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-slate-800 dark:text-amber-200 glass-panel border-olive-500/20 hover:border-amber-400/40 hover:text-amber-600 dark:hover:text-amber-300 transition-all shadow-sm hover:scale-105"
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
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-slate-800 dark:text-olive-200 glass-panel border-olive-500/20 hover:border-olive-400/50 hover:text-olive-700 dark:hover:text-olive-300 transition-all shadow-sm hover:scale-105"
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
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-olive-700 to-olive-600 hover:from-olive-600 hover:to-olive-500 transition-all shadow-sm hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5 text-olive-200" aria-hidden="true" />
            <span>{t("nav.travelAssist")}</span>
          </button>
        )}

        {/* Admin Upload / Add Trip Button */}
        {user && user.role === "ADMIN" && (
          <button
            onClick={onOpenUpload}
            aria-label={t("nav.addTrip")}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs text-white bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 transition-all shadow-sm hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t("nav.addTrip")}</span>
          </button>
        )}

        {/* Persistent Login / User Menu Button */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              aria-label={`Meniu cont: ${user.name} (${user.role})`}
              className="flex items-center gap-2 glass-panel p-1.5 rounded-2xl border-olive-500/30 hover:border-olive-500/60 transition-all shadow-sm"
            >
              {/* Role Badge */}
              {user.role === "ADMIN" ? (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                  <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" aria-hidden="true" />
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

              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline max-w-[100px] truncate">
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

                {user.role === "ADMIN" && (
                  <button
                    role="menuitem"
                    onClick={onOpenUpload}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-olive-500/15 hover:text-olive-800 dark:hover:text-olive-300 transition-colors text-left"
                  >
                    <Plus className="w-4 h-4 text-olive-600 dark:text-olive-400" aria-hidden="true" />
                    <span>Manager Studio (Upload)</span>
                  </button>
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
          /* When logged out: Login Menu is ALWAYS displayed! */
          <div className="flex items-center gap-1.5">
            <a
              href="/api/auth/google"
              aria-label="Conectare rapidă cu contul Google"
              title="Conectare rapidă cu Google"
              className="glass-panel p-2 rounded-2xl border-olive-500/20 hover:border-olive-500/50 hover:bg-olive-500/10 transition-all text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shadow-sm"
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
              <span className="hidden sm:inline">Google</span>
            </a>

            <button
              onClick={onOpenAuthModal}
              aria-label={t("nav.loginBtn")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-olive-700 hover:bg-olive-800 dark:bg-olive-600 dark:hover:bg-olive-500 text-white font-bold text-xs shadow-sm transition-all hover:scale-105"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t("nav.loginBtn")}</span>
            </button>
          </div>
        )}

        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={isMobileMenuOpen ? "Închide meniul de navigare" : "Deschide meniul de navigare"}
          className="md:hidden glass-panel p-2.5 rounded-2xl text-slate-700 dark:text-slate-200 border-olive-500/20"
        >
          {isMobileMenuOpen ? (
            <X className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Menu className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <nav
          id="mobile-nav-drawer"
          aria-label="Meniu navigare mobil"
          className="absolute top-16 left-3 right-3 glass-panel rounded-3xl p-4 border border-olive-500/30 shadow-2xl z-50 pointer-events-auto md:hidden animate-fade-in space-y-3"
        >
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-olive-500/10 border border-olive-500/20">
            <button
              aria-pressed={viewMode === "sphere"}
              onClick={() => {
                onSelectViewMode("sphere");
                setIsMobileMenuOpen(false);
              }}
              className={`py-2 rounded-xl text-xs font-semibold text-center ${
                viewMode === "sphere" ? "bg-olive-700 text-white" : "text-slate-700 dark:text-slate-300"
              }`}
            >
              Terra 3D
            </button>
            <button
              aria-pressed={viewMode === "flat"}
              onClick={() => {
                onSelectViewMode("flat");
                setIsMobileMenuOpen(false);
              }}
              className={`py-2 rounded-xl text-xs font-semibold text-center ${
                viewMode === "flat" ? "bg-olive-700 text-white" : "text-slate-700 dark:text-slate-300"
              }`}
            >
              Hartă
            </button>
            <button
              aria-pressed={viewMode === "gallery"}
              onClick={() => {
                onSelectViewMode("gallery");
                setIsMobileMenuOpen(false);
              }}
              className={`py-2 rounded-xl text-xs font-semibold text-center ${
                viewMode === "gallery" ? "bg-olive-700 text-white" : "text-slate-700 dark:text-slate-300"
              }`}
            >
              Showcase
            </button>
          </div>

          {/* Quick Features: Passport & Wrapped */}
          <div className="grid grid-cols-2 gap-2">
            {onOpenPassport && (
              <button
                onClick={() => {
                  onOpenPassport();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-olive-500/15 border border-olive-500/30 text-amber-300 font-bold text-xs"
              >
                <Award className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>Pașaport Virtual</span>
              </button>
            )}
            {onOpenWrapped && (
              <button
                onClick={() => {
                  onOpenWrapped();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-olive-500/15 border border-olive-500/30 text-olive-300 font-bold text-xs"
              >
                <Gift className="w-4 h-4 text-olive-400" aria-hidden="true" />
                <span>Atlas Wrapped</span>
              </button>
            )}
          </div>

          {user && (user.role === "ADMIN" || user.role === "PARTNER") && (
            <button
              onClick={() => {
                onOpenTravelPlanner();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-olive-700 to-olive-600 text-white font-bold text-xs shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-olive-200" aria-hidden="true" />
              <span>Travel Assist (Gemini AI)</span>
            </button>
          )}

          {user && user.role === "ADMIN" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onOpenUpload();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-olive-700 text-white font-bold text-xs"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Upload Manager</span>
              </button>
              <button
                onClick={() => {
                  onOpenUsersModal();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs"
              >
                <Users className="w-4 h-4" aria-hidden="true" />
                <span>Utilizatori</span>
              </button>
            </div>
          )}

          {/* Mobile Language Selector */}
          <div className="pt-2 border-t border-olive-500/20">
            <LanguageSelector isMobile onLanguageChange={() => setIsMobileMenuOpen(false)} />
          </div>

          {!user && (
            <div className="space-y-2 pt-1 border-t border-olive-500/20">
              <a
                href="/api/auth/google"
                aria-label="Google Login"
                className="w-full py-2.5 rounded-xl glass-panel border-olive-500/30 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-olive-500/10"
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
                onClick={() => {
                  onOpenAuthModal();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-olive-700 hover:bg-olive-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t("nav.loginBtn")}</span>
              </button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}

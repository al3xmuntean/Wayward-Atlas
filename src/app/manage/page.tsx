"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Compass,
  Plus,
  Search,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Edit2,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Heart,
  Eye,
  Shield,
  Loader2,
  AlertCircle,
  Check,
  Globe2,
} from "lucide-react";
import { TripData, VisibilityRole } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function TripManagerPage() {
  const { t, language } = useTranslation();
  const { theme } = useTheme();

  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch all trips
  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trips");
      if (!res.ok) throw new Error("Nu s-au putut încărca datele călătoriilor");
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (err: any) {
      setError(err.message || "A apărut o eroare");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // Delete Trip Handler
  const handleDeleteTrip = async (id: string, tripTitle: string) => {
    if (!window.confirm(t("manager.deleteConfirm") + `\n\n"${tripTitle}"`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Eroare la ștergerea călătoriei");
      }

      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message || "A apărut o problemă la ștergere.");
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      // Role filter
      if (roleFilter === "PARTNER" && !trip.withPartner) return false;
      if (roleFilter === "PUBLIC" && trip.minRole !== "VIEWER" && trip.minRole !== "PUBLIC") return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = trip.title.toLowerCase().includes(q);
      const matchDesc = trip.description?.toLowerCase().includes(q);
      const matchYear = String(trip.year).includes(q);

      // Check translations
      let matchTrans = false;
      if (trip.translations) {
        try {
          const transObj =
            typeof trip.translations === "string"
              ? JSON.parse(trip.translations)
              : trip.translations;
          matchTrans = Object.values(transObj).some((val: any) =>
            val?.title?.toLowerCase()?.includes(q) || val?.description?.toLowerCase()?.includes(q)
          );
        } catch {}
      }

      return matchTitle || matchDesc || matchYear || matchTrans;
    });
  }, [trips, searchQuery, roleFilter]);

  // Total metrics
  const totalPhotos = useMemo(
    () => trips.reduce((acc, t) => acc + (t.photos?.length || 0), 0),
    [trips]
  );
  const totalSpots = useMemo(() => {
    const spotsSet = new Set<string>();
    trips.forEach((t) =>
      t.photos?.forEach((p) => {
        if (p.spotName) spotsSet.add(`${t.id}-${p.spotName}`);
      })
    );
    return spotsSet.size;
  }, [trips]);
  const coupleTripsCount = useMemo(
    () => trips.filter((t) => t.withPartner).length,
    [trips]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans flex flex-col">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 p-2 rounded-2xl bg-olive-700 hover:bg-olive-600 text-white shadow-md transition-all active:scale-95"
              title={t("manager.backToMap")}
            >
              <Compass className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
                <span>{t("manager.title")}</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                {t("manager.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle />

            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t("manager.backToMap")}</span>
            </Link>

            <a
              href="/manage/trip/new"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-olive-700 hover:bg-olive-600 text-white text-xs font-bold shadow-lg shadow-olive-700/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t("manager.newTripBtn")}</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-6 space-y-6">
        {/* METRICS ROW */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-olive-100 dark:bg-olive-900/40 text-olive-700 dark:text-olive-300 flex items-center justify-center font-black">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black">{trips.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                {t("manager.statsTrips")}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black">{totalPhotos}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                {t("manager.statsPhotos")}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 flex items-center justify-center font-black">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black">{totalSpots}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                {t("manager.statsSpots")}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center font-black">
              <Heart className="w-6 h-6 fill-rose-500" />
            </div>
            <div>
              <p className="text-2xl font-black">{coupleTripsCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                {t("manager.partnerTripBadge")}
              </p>
            </div>
          </div>
        </section>

        {/* CONTROLS & FILTER BAR */}
        <section className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("manager.searchPlaceholder")}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-olive-500"
            />
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: t("common.all") },
              { id: "PUBLIC", label: t("studio.rolePublic") },
              { id: "PARTNER", label: t("manager.partnerTripBadge") },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setRoleFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  roleFilter === f.id
                    ? "bg-olive-700 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* TRIPS TABLE / CARDS */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-8 h-8 animate-spin text-olive-600 mb-3" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("common.loading")}
            </p>
          </div>
        ) : error ? (
          <div className="p-12 text-center rounded-3xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Compass className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">
              {t("manager.emptyTrips")}
            </p>
            <a
              href="/manage/trip/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-olive-700 text-white font-bold text-xs shadow-md hover:bg-olive-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t("manager.newTripBtn")}</span>
            </a>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/50 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">{t("manager.colTrip")}</th>
                    <th className="py-3.5 px-4">{t("manager.colDates")}</th>
                    <th className="py-3.5 px-4">{t("manager.colSpots")}</th>
                    <th className="py-3.5 px-4">{t("manager.colVisibility")}</th>
                    <th className="py-3.5 px-4 text-right">{t("manager.colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredTrips.map((trip) => {
                    const coverPhoto = trip.photos?.[0];
                    const isDeleting = deletingId === trip.id;

                    // Localized title if available
                    let displayTitle = trip.title;
                    if (language !== "ro" && trip.translations) {
                      try {
                        const parsed =
                          typeof trip.translations === "string"
                            ? JSON.parse(trip.translations)
                            : trip.translations;
                        if (parsed[language]?.title) {
                          displayTitle = parsed[language].title;
                        }
                      } catch {}
                    }

                    return (
                      <tr
                        key={trip.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Cover + Title */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                              {coverPhoto?.thumbnailUrl || coverPhoto?.url ? (
                                <img
                                  src={coverPhoto.thumbnailUrl || coverPhoto.url}
                                  alt={displayTitle}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                                {displayTitle}
                              </h3>
                              {trip.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                  {trip.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(trip.startDate).toLocaleDateString(language, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Spots & Photos count */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-bold text-[11px] flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              {trip.photos?.length || 0}
                            </span>
                            {trip.withPartner && (
                              <span className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1">
                                <Heart className="w-3 h-3 fill-rose-500" />
                                {t("manager.partnerTripBadge")}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Visibility Pill */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold ${
                              trip.minRole === "VIEWER" || trip.minRole === "PUBLIC"
                                ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                                : trip.minRole === "CLOSE_FRIEND"
                                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                                : "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300"
                            }`}
                          >
                            {trip.minRole === "VIEWER" || trip.minRole === "PUBLIC"
                              ? t("studio.rolePublic")
                              : trip.minRole === "CLOSE_FRIEND"
                              ? t("studio.roleFriends")
                              : t("studio.rolePartner")}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View on Map */}
                            <Link
                              href={`/?trip=${trip.id}`}
                              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-olive-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title={t("manager.actionView")}
                            >
                              <Compass className="w-4 h-4" />
                            </Link>

                            {/* Edit in Studio (opens in new tab) */}
                            <a
                              href={`/manage/trip/${trip.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-olive-700 hover:text-white text-slate-800 dark:text-slate-200 font-bold transition-all text-xs"
                              title={t("manager.actionEdit")}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>{t("manager.actionEdit")}</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTrip(trip.id, displayTitle)}
                              disabled={isDeleting}
                              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-40 cursor-pointer"
                              title={t("manager.actionDelete")}
                            >
                              {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

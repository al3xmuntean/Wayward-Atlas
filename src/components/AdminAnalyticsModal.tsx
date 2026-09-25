"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  BarChart3,
  Users,
  Eye,
  Globe2,
  Calendar,
  ArrowUpDown,
  Search,
  RotateCw,
  Loader2,
  ImageIcon,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  AnalyticsSummary,
  PhotoAnalyticsItem,
  IpAnalyticsItem,
  CountryAnalyticsItem,
} from "@/lib/types";
import { useModalA11y } from "@/hooks/useModalA11y";

interface AdminAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto?: (photoId: string, tripId: string) => void;
}

type TimeRange = "24h" | "7d" | "30d" | "all";
type SortOption = "views_desc" | "unique_desc" | "views_asc" | "newest" | "title";
type ActiveTab = "photos" | "geo";

export function AdminAnalyticsModal({
  isOpen,
  onClose,
  onSelectPhoto,
}: AdminAnalyticsModalProps) {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [sortBy, setSortBy] = useState<SortOption>("views_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("photos");

  const modalRef = useRef<HTMLDivElement>(null);
  useModalA11y({ isOpen, onClose, modalRef });

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        timeRange,
        sortBy,
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/admin/analytics?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, timeRange, sortBy]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      fetchAnalytics();
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-5xl max-h-[92vh] glass-panel-glow bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-olive-500/30 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-olive-500/20 bg-slate-100/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-olive-500/10 text-olive-600 dark:text-olive-400 border border-olive-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="analytics-modal-title"
                  className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
                >
                  Atlas Analytics
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-olive-500/15 text-olive-700 dark:text-olive-300 border border-olive-500/30">
                  Admin Studio
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Vizualizări unice de imagini, jurnale de IP-uri și statistici geografice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              title="Reîmprospătează datele"
              aria-label="Reîmprospătează datele"
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              aria-label="Închide panoul de analytics"
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-olive-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 bg-slate-50/60 dark:bg-slate-950/20 border-b border-olive-500/15">
          {/* Card 1: Total Views */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-xs font-medium">
              <span>Vizualizări Totale</span>
              <Eye className="w-4 h-4 text-olive-600 dark:text-olive-400" />
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {data ? data.totalViews.toLocaleString("ro-RO") : "..."}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Toate accesările de imagini
            </span>
          </div>

          {/* Card 2: Distinct Visitors (Unique IPs) */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-olive-500/30 shadow-sm flex flex-col ring-1 ring-olive-500/20">
            <div className="flex items-center justify-between text-olive-600 dark:text-olive-400 text-xs font-bold">
              <span>Vizitatori Unici (IP)</span>
              <Users className="w-4 h-4" />
            </div>
            <span className="text-2xl font-black text-olive-700 dark:text-olive-300 mt-1">
              {data ? data.distinctVisitorsCount.toLocaleString("ro-RO") : "..."}
            </span>
            <span className="text-[10px] text-olive-600/80 dark:text-olive-400/80 mt-0.5">
              IP-uri distincte înregistrate
            </span>
          </div>

          {/* Card 3: Top Country */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-xs font-medium">
              <span>Țara Principală</span>
              <Globe2 className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-center gap-1.5 mt-1 truncate">
              <span className="text-xl">{data?.topCountry?.flag || "🌍"}</span>
              <span className="text-base font-bold text-slate-900 dark:text-white truncate">
                {data?.topCountry?.name || "N/A"}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {data?.topCountry
                ? `${data.topCountry.views} vizualizări`
                : "Fără date în interval"}
            </span>
          </div>

          {/* Card 4: Photos Tracked */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-xs font-medium">
              <span>Fotografii Active</span>
              <ImageIcon className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {data ? data.totalPhotosTracked : "..."}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Cu cel puțin 1 vizualizare
            </span>
          </div>
        </div>

        {/* Filter Controls & Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 border-b border-olive-500/15 bg-white/60 dark:bg-slate-900/60">
          {/* Main Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("photos")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === "photos"
                  ? "bg-white dark:bg-slate-900 text-olive-600 dark:text-olive-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Imagini & Vizualizări Unice ({data?.photos.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab("geo")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === "geo"
                  ? "bg-white dark:bg-slate-900 text-olive-600 dark:text-olive-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>IP-uri & Țări ({data?.ipLogs.length || 0})</span>
            </button>
          </div>

          {/* Time Filter Pills & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Time range selector */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs">
              {(
                [
                  { id: "24h", label: "24h" },
                  { id: "7d", label: "7 zile" },
                  { id: "30d", label: "30 zile" },
                  { id: "all", label: "Tot" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeRange(t.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    timeRange === t.id
                      ? "bg-olive-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown (Visible on photos tab) */}
            {activeTab === "photos" && (
              <div className="flex items-center gap-1.5">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-olive-500 outline-none cursor-pointer"
                  aria-label="Sortează imaginile"
                >
                  <option value="views_desc">🔥 Cele mai vizualizate</option>
                  <option value="unique_desc">👑 Cei mai mulți vizitatori unici (IP)</option>
                  <option value="views_asc">📉 Cele mai puține vizualizări</option>
                  <option value="newest">🕒 Cele mai recente accesări</option>
                  <option value="title">🔤 Titlu călătorie / locație</option>
                </select>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută imagine sau loc..."
                className="text-xs pl-8 pr-3 py-1.5 w-36 sm:w-44 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-olive-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Photos & Distinct Views List */}
        {activeTab === "photos" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading && !data ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-olive-500" />
                <span className="text-sm font-medium">Se generează statisticile...</span>
              </div>
            ) : data?.photos.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <ImageIcon className="w-12 h-12 mx-auto stroke-1 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nicio imagine găsită
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Încearcă să schimbi intervalul de timp sau termenul de căutare.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-olive-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:shadow-md"
                  >
                    {/* Photo Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <img
                          src={photo.thumbnailUrl || photo.url}
                          alt={photo.placeName || photo.tripTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {photo.placeName || "Fotografie fără etichetă"}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-medium text-olive-700 dark:text-olive-300 truncate">
                            {photo.tripTitle}
                          </span>
                          {photo.country && (
                            <>
                              <span>•</span>
                              <span>{photo.country}</span>
                            </>
                          )}
                        </div>

                        {/* Top countries breakdown for this photo */}
                        {photo.topCountries.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                              Țări vizitatoare:
                            </span>
                            {photo.topCountries.map((tc) => (
                              <span
                                key={tc.countryCode}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                title={`${tc.country}: ${tc.count} vizualizări`}
                              >
                                <span>{tc.flag}</span>
                                <span>{tc.count}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Unique Views Pill */}
                      <div className="flex flex-col items-center sm:items-end">
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-olive-500/15 text-olive-700 dark:text-olive-300 border border-olive-500/30 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>{photo.distinctViews} IP-uri unice</span>
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {photo.totalViews} vizualizări totale
                        </span>
                      </div>

                      {/* Quick Inspect in App */}
                      {onSelectPhoto && (
                        <button
                          onClick={() => {
                            onSelectPhoto(photo.id, photo.tripId);
                            onClose();
                          }}
                          title="Deschide în album"
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-olive-600 hover:text-white dark:hover:bg-olive-600 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: IP Logs & Country Grouping */}
        {activeTab === "geo" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Country Distribution Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-olive-600 dark:text-olive-400" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Trafic Grupat pe Țări ({data?.countryStats.length || 0})
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {data?.totalViews || 0} vizualizări agregate
                </span>
              </div>

              {data?.countryStats.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Nu există date geografice înregistrate în intervalul selectat.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {data?.countryStats.map((cs) => (
                    <div
                      key={cs.countryCode}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cs.flag}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cs.country}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-olive-700 dark:text-olive-300">
                            {cs.totalViews} vizite
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({cs.uniqueIpsCount} IP-uri • {cs.percentage}%)
                          </span>
                        </div>
                      </div>

                      {/* Visual progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-olive-600 to-olive-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, cs.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* IP Logs Table */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-olive-600 dark:text-olive-400" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Jurnal IP-uri Vizitatoare ({data?.ipLogs.length || 0})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Ordonate după volumul de vizualizări
                </span>
              </div>

              {data?.ipLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Nu există IP-uri înregistrate în acest interval.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                        <th className="pb-2.5">Adresă IP</th>
                        <th className="pb-2.5">Țară</th>
                        <th className="pb-2.5 text-center">Vizualizări</th>
                        <th className="pb-2.5 text-center">Imagini Distincte</th>
                        <th className="pb-2.5">Exemple Imagini Văzute</th>
                        <th className="pb-2.5 text-right">Ultima Accesare</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {data?.ipLogs.map((log) => (
                        <tr
                          key={log.ip}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                            {log.ip}
                          </td>
                          <td className="py-3">
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                              <span>{log.flag}</span>
                              <span>{log.country || "Necunoscut"}</span>
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full font-black text-olive-700 dark:text-olive-300 bg-olive-500/10 border border-olive-500/20">
                              {log.totalViews}
                            </span>
                          </td>
                          <td className="py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                            {log.distinctPhotosCount}
                          </td>
                          <td className="py-3 max-w-[200px] truncate text-slate-500 dark:text-slate-400">
                            {log.photoTitles.join(", ")}
                          </td>
                          <td className="py-3 text-right text-slate-400 font-medium">
                            {new Date(log.lastSeenAt).toLocaleString("ro-RO", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-olive-500/20 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-olive-600 dark:text-olive-400" />
            <span>
              Datele de trafic sunt protejate și accesibile exclusiv administratorului.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold transition-colors"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}

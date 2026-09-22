"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TripData, PhotoData, SafeUser } from "@/lib/types";
import {
  calculateCosmicTravelMetrics,
  calculatePartnerTravelMetrics,
  calculateTripDistance,
  HOME_BASE_SIBIU,
  COSMIC_SCALES,
  TravelCosmicMetrics,
  PartnerTravelMetrics,
} from "@/lib/distance";
import {
  Calendar,
  MapPin,
  Heart,
  Eye,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Plane,
  Camera,
  Star,
  Shield,
  Layers,
  Shuffle,
  Dice5,
  Moon,
  Sun,
  Rocket,
  Globe,
  Compass,
  RefreshCw,
  Milestone,
  Quote,
  Award,
  Gift,
  Share2,
  Check,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { getLocalizedTrip, formatLocalizedDate } from "@/lib/i18n/localize";

interface CssNectarShowcaseProps {
  trips: TripData[];
  onSelectTrip: (trip: TripData, photo?: PhotoData) => void;
  onFlyToLocation: (lat: number, lon: number) => void;
  currentUser: SafeUser | null;
  onOpenTravelPlanner: () => void;
  onOpenPassport?: () => void;
  onOpenWrapped?: () => void;
}

export function CssNectarShowcase({
  trips,
  onSelectTrip,
  onFlyToLocation,
  currentUser,
  onOpenTravelPlanner,
  onOpenPassport,
  onOpenWrapped,
}: CssNectarShowcaseProps) {
  const { t, language } = useTranslation();
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [randomTripIndex, setRandomTripIndex] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [spotlightFilter, setSpotlightFilter] = useState<"all" | "partner">("all");
  const [aiTrivia, setAiTrivia] = useState<{
    funFact: string;
    cosmicComparison: string;
    astronomicalTip: string;
    partnerBanter?: string;
  } | null>(null);
  const [isGeneratingTrivia, setIsGeneratingTrivia] = useState(false);
  const [rollAnnouncement, setRollAnnouncement] = useState<string>("");

  const handleShare = async (e: React.MouseEvent, tripId: string, photoId?: string) => {
    e.stopPropagation();
    const url = photoId
      ? `${window.location.origin}/?trip=${tripId}&photo=${photoId}`
      : `${window.location.origin}/?trip=${tripId}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Wayward Atlas",
          url,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShareId(photoId || tripId);
      setTimeout(() => setCopiedShareId(null), 2000);
    } catch {}
  };


  // Fallback cover if no photos in a trip
  const defaultPlaceholderImg =
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";

  const isPartnerOrAdmin = currentUser?.role === "PARTNER" || currentUser?.role === "ADMIN";

  // Separate completed expeditions and planned travels
  const completedTrips = useMemo(
    () => trips.filter((t) => t.status !== "PLANNED"),
    [trips]
  );
  const plannedTrips = useMemo(
    () => trips.filter((t) => t.status === "PLANNED"),
    [trips]
  );

  // Calculate high-precision geodesic metrics starting from Sibiu, Romania
  const cosmicMetrics: TravelCosmicMetrics = useMemo(
    () => calculateCosmicTravelMetrics(trips),
    [trips]
  );

  // Calculate dedicated partner metrics for Partner and Admin roles
  const partnerMetrics: PartnerTravelMetrics | null = useMemo(
    () => (isPartnerOrAdmin ? calculatePartnerTravelMetrics(trips) : null),
    [trips, isPartnerOrAdmin]
  );

  // Active pool of trips based on filter (All vs In Doi)
  const activeSpotlightPool = useMemo(() => {
    if (spotlightFilter === "partner" && isPartnerOrAdmin) {
      const partnerTrips = completedTrips.filter((t) => t.withPartner);
      return partnerTrips.length > 0 ? partnerTrips : completedTrips;
    }
    return completedTrips;
  }, [completedTrips, spotlightFilter, isPartnerOrAdmin]);

  // Filter photos strictly based on active user role and spotlight filter
  const getRoleSafePhoto = (trip: TripData): PhotoData | undefined => {
    if (!trip || !trip.photos || trip.photos.length === 0) return undefined;

    // When in partner mode, prioritize photos featuring the couple (people, partnerPreselected, minRole PARTNER)
    if (spotlightFilter === "partner" && isPartnerOrAdmin && trip.withPartner) {
      const couplePhotos = trip.photos.filter(
        (p) => p.hasPeople || p.partnerPreselected || p.minRole === "PARTNER"
      );
      if (couplePhotos.length > 0) {
        return couplePhotos[randomTripIndex % couplePhotos.length] || couplePhotos[0];
      }
    }

    // Public mode: only country cover, no people
    if (!currentUser) {
      return trip.photos.find((p) => p.isCountryCover) || trip.photos[0];
    }

    // Viewer mode: strictly exclude photos with people
    if (currentUser.role === "VIEWER") {
      const noPeoplePhotos = trip.photos.filter((p) => !p.hasPeople);
      return noPeoplePhotos[0] || trip.photos[0];
    }

    // Partner mode: prioritize photos preselected for partner or with partner
    if (currentUser.role === "PARTNER" && trip.withPartner) {
      const partnerPhoto = trip.photos.find((p) => p.partnerPreselected || p.minRole === "PARTNER");
      if (partnerPhoto) return partnerPhoto;
    }

    // Close friend / Admin / Partner: any allowed photo
    return trip.photos[0];
  };

  // Roll a new random trip from active pool
  const rollRandomTrip = () => {
    if (activeSpotlightPool.length <= 1) return;
    setIsRolling(true);
    setTimeout(() => {
      let nextIndex = Math.floor(Math.random() * activeSpotlightPool.length);
      if (nextIndex === randomTripIndex && activeSpotlightPool.length > 1) {
        nextIndex = (nextIndex + 1) % activeSpotlightPool.length;
      }
      setRandomTripIndex(nextIndex);
      setIsRolling(false);
      const chosen = activeSpotlightPool[nextIndex];
      if (chosen) {
        setRollAnnouncement(`S-a selectat o nouă călătorie la întâmplare: ${chosen.title}`);
      }
    }, 280);
  };

  // Fetch or refresh Gemini AI cosmic trivia based on user's real destinations and Sibiu home base
  const fetchAiTrivia = async () => {
    try {
      setIsGeneratingTrivia(true);
      setRollAnnouncement("Se generează curiozități cosmice de călătorie de la Gemini AI...");
      const topDestinations = completedTrips.slice(0, 5).map((t) => t.title);
      const partnerTripsCount = completedTrips.filter((t) => t.withPartner).length;

      const res = await fetch("/api/ai/cosmic-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalKm: cosmicMetrics.totalKm,
          equatorLaps: cosmicMetrics.equatorLaps,
          tripsCount: cosmicMetrics.tripsCount,
          countries: cosmicMetrics.countriesVisited,
          topDestinations,
          partnerTripsCount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.trivia) {
          setAiTrivia(data.trivia);
          setRollAnnouncement("Curiozitățile cosmice de călătorie au fost actualizate cu succes.");
        }
      }
    } catch (err) {
      console.warn("Failed to load AI cosmic trivia:", err);
    } finally {
      setIsGeneratingTrivia(false);
    }
  };


  // Initial load of AI trivia once metrics are available
  useEffect(() => {
    if (cosmicMetrics.totalKm > 0 && !aiTrivia) {
      fetchAiTrivia();
    }
  }, [cosmicMetrics.totalKm]);

  const handleLike = (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikes((prev) => ({
      ...prev,
      [tripId]: (prev[tripId] || 42) + 1,
    }));
  };

  const randomTrip = activeSpotlightPool[randomTripIndex] || activeSpotlightPool[0];
  const randomPhoto = randomTrip ? getRoleSafePhoto(randomTrip) : undefined;
  const localizedRandomTrip = randomTrip ? getLocalizedTrip(randomTrip, language) : { title: "", description: "" };
  const randomCoverUrl = randomPhoto?.url || defaultPlaceholderImg;
  const randomTripDistance = randomTrip ? calculateTripDistance(randomTrip) : 0;
  const randomYear = randomTrip && randomTrip.startDate ? new Date(randomTrip.startDate).getFullYear() : "";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-36 pb-28 sm:pb-20">
      {/* Intro Bar: Pure Typography, CSS Nectar Style */}
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <span className="px-3.5 py-1 rounded-full text-xs font-bold tracking-wider text-olive-800 dark:text-olive-300 bg-olive-500/15 border border-olive-500/30 uppercase mb-3 inline-block">
          {t("showcase.badge")}
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {t("showcase.title")}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
          {t("showcase.subtitle")}
        </p>
      </div>

      {/* Feature Highlights: Virtual Passport & Atlas Wrapped - Signature Frosted Glass */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {/* Card 1: Virtual Passport */}
        <div
          onClick={onOpenPassport}
          className="glass-panel p-5 rounded-3xl border border-olive-500/30 hover:border-amber-500/60 transition-all shadow-sm hover:shadow-lg hover:scale-[1.01] cursor-pointer group flex items-center justify-between gap-4 bg-gradient-to-br from-amber-500/10 via-transparent to-olive-500/10"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shrink-0">
              <Award className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                {t("showcase.passportCardTitle")}
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {t("passport.title")}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {t("showcase.passportCardDesc")}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </div>

        {/* Card 2: Atlas Wrapped */}
        <div
          onClick={onOpenWrapped}
          className="glass-panel p-5 rounded-3xl border border-olive-500/30 hover:border-olive-400/60 transition-all shadow-sm hover:shadow-lg hover:scale-[1.01] cursor-pointer group flex items-center justify-between gap-4 bg-gradient-to-br from-olive-500/15 via-transparent to-olive-600/10"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-olive-500/15 border border-olive-500/30 flex items-center justify-center text-olive-700 dark:text-olive-400 group-hover:scale-110 transition-transform shrink-0">
              <Gift className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-olive-800 dark:text-olive-300 block">
                {t("showcase.wrappedCardTitle")}
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {t("wrapped.title")}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {t("showcase.wrappedCardDesc")}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-olive-700 dark:text-olive-400 shrink-0 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </div>
      </div>

      {/* ==========================================================================
          SECTION 1: RANDOM TRAVEL SPOTLIGHT (Based on Roles)
          ========================================================================== */}
      <section className="mb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-2 border-b border-olive-500/20">
          <div className="flex items-center gap-2.5">
            <Dice5 className="w-5 h-5 text-olive-600 dark:text-olive-400" />
            <h3 className="nectar-section-header text-sm sm:text-base text-olive-800 dark:text-olive-300">
              {spotlightFilter === "partner"
                ? t("showcase.spotlightPartnerTitle")
                : t("showcase.spotlightTitle")}
            </h3>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Toggle for Partner & Admin: All vs In Doi */}
            {isPartnerOrAdmin && (
              <div
                role="group"
                aria-label="Filtrare amintire la întâmplare"
                className="flex items-center p-1 rounded-2xl bg-olive-500/10 border border-olive-500/20 gap-1"
              >
                <button
                  type="button"
                  aria-pressed={spotlightFilter === "all"}
                  onClick={() => {
                    setSpotlightFilter("all");
                    setRandomTripIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    spotlightFilter === "all"
                      ? "bg-olive-700 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {t("showcase.filterAllJournals")}
                </button>
                <button
                  type="button"
                  aria-pressed={spotlightFilter === "partner"}
                  onClick={() => {
                    setSpotlightFilter("partner");
                    setRandomTripIndex(0);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    spotlightFilter === "partner"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-500/10"
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>{t("showcase.filterPartnerMoments")}</span>
                </button>
              </div>
            )}

            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden lg:inline">
              {t("showcase.activeRole")} {currentUser?.role || t("showcase.rolePublic")}
            </span>

            <button
              type="button"
              onClick={rollRandomTrip}
              disabled={isRolling || activeSpotlightPool.length <= 1}
              aria-label={spotlightFilter === "partner" ? t("showcase.rollPartner") : t("showcase.rollRandom")}
              title={spotlightFilter === "partner" ? t("showcase.rollPartner") : t("showcase.rollRandom")}
              className="px-3 py-1.5 rounded-xl bg-olive-500/15 hover:bg-olive-500/30 text-olive-800 dark:text-olive-300 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 border border-olive-500/30"
            >
              <Shuffle className={`w-3.5 h-3.5 ${isRolling ? "animate-spin" : ""}`} aria-hidden="true" />
              <span>{spotlightFilter === "partner" ? t("showcase.rollPartner") : t("showcase.rollRandom")}</span>
            </button>
          </div>
        </div>

        {/* Screen Reader Live Region for Random Memory Roll Updates */}
        <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
          {rollAnnouncement}
        </div>

        {completedTrips.length === 0 ? (
          <div className="p-8 text-center rounded-3xl glass-panel border-olive-500/20">
            <Camera className="w-10 h-10 text-olive-600 dark:text-olive-400 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {t("showcase.noCompletedTrips")}
            </p>
          </div>
        ) : (
          <div className={`transition-opacity duration-300 ${isRolling ? "opacity-30 scale-[0.99]" : "opacity-100 scale-100"}`}>
            {randomTrip && (
              <div
                role="button"
                tabIndex={0}
                aria-label={`Deschide jurnalul complet de călătorie: ${localizedRandomTrip.title}`}
                onClick={() => onSelectTrip(randomTrip, randomPhoto)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectTrip(randomTrip, randomPhoto);
                  }
                }}
                className="nectar-card group cursor-pointer overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 border border-olive-500/30 hover:border-olive-500/60 shadow-xl transition-all rounded-3xl focus:ring-2 focus:ring-olive-500"
              >
                {/* Photo Half */}
                <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-[430px] overflow-hidden bg-slate-950">
                  <img
                    src={randomCoverUrl}
                    alt={`Coperta călătoriei: ${localizedRandomTrip.title}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/60" />

                  {/* Badges on image */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                    <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full bg-olive-700 text-white shadow-lg uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-olive-200" aria-hidden="true" />
                      {spotlightFilter === "partner" ? t("showcase.badgePartnerMoment") : t("showcase.badgeRandomSelection")}
                    </span>
                    {randomTrip.withPartner && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-rose-600 text-white shadow-lg">
                        <Heart className="w-3 h-3 fill-white" aria-hidden="true" />
                        {t("showcase.badgeInTwo")}
                      </span>
                    )}
                    {randomTrip.isCountryShowcase && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-amber-500 text-slate-950 shadow-lg">
                        <Star className="w-3 h-3 fill-slate-950" aria-hidden="true" />
                        {t("showcase.badgeCountryOfficial")}
                      </span>
                    )}
                  </div>

                  {/* Fly-to Pin Quick Button */}
                  {randomPhoto && randomPhoto.latitude && randomPhoto.longitude && (
                    <button
                      type="button"
                      aria-label={`Localizează călătoria ${localizedRandomTrip.title} pe hartă sau glob 3D`}
                      title="Localizează pe hartă / glob 3D"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlyToLocation(randomPhoto.latitude, randomPhoto.longitude);
                      }}
                      className="absolute bottom-4 left-4 p-2.5 rounded-2xl bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-all shadow-lg hover:scale-110"
                    >
                      <MapPin className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>


                {/* Details Half */}
                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between glass-panel border-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-olive-800 dark:text-olive-300 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" />
                        {randomTrip.isMaskedDate
                          ? t("showcase.tripYearMasked").replace("{year}", String(randomYear))
                          : formatLocalizedDate(randomTrip.startDate, language)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" />
                        {randomTrip.photos.length} {t("showcase.memories")}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white group-hover:text-olive-700 dark:group-hover:text-olive-400 transition-colors">
                        {localizedRandomTrip.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400 shrink-0" />
                        <span>
                          {randomPhoto?.placeName
                            ? `${randomPhoto.placeName} (${randomPhoto.city || randomPhoto.country || ""})`
                            : randomPhoto?.city || randomPhoto?.country || `${t("showcase.tripYearMasked").replace("{year}", String(randomYear))}`}
                        </span>
                      </p>
                    </div>

                    {/* Geodesic Distance of this specific trip starting from Sibiu */}
                    {randomTripDistance && (
                      <div className="p-3 rounded-2xl bg-olive-500/10 border border-olive-500/20 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-olive-800 dark:text-olive-300">
                          <Plane className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" />
                          <span>{t("showcase.tripDistanceFromSibiu")}</span>
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {randomTripDistance.totalKm.toLocaleString()} km
                          <span className="text-[10px] font-normal text-slate-500 ml-1 hidden sm:inline">
                            {t("showcase.tripFlightTransit").replace("{km}", randomTripDistance.transitKm.toLocaleString())}
                          </span>
                        </span>
                      </div>
                    )}

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {localizedRandomTrip.description ||
                        (language === "ro"
                          ? "O călătorie memorabilă plină de aventuri, peisaje autentice și descoperiri fascinante pe traseu."
                          : "A memorable journey filled with adventures, authentic landscapes and fascinating discoveries along the route.")}
                    </p>

                    {/* Partner Memory Excerpt (Only for Partner or Admin) */}
                    {randomTrip.withPartner && isPartnerOrAdmin && (
                      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                            <Heart className="w-3.5 h-3.5 fill-current" />
                            <span>{t("showcase.partnerJournalExcerpt")}</span>
                          </p>
                          {spotlightFilter === "partner" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300">
                              {t("showcase.partnerJournalTag")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs italic line-clamp-3">
                          {randomTrip.partnerNotes ||
                            (language === "ro"
                              ? "O amintire de neprețuit trăită împreună, departe de agitație."
                              : "A priceless memory experienced together, far away from everyday bustle.")}
                        </p>
                      </div>
                    )}

                    {/* Tags */}
                    {randomPhoto?.tags && randomPhoto.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {randomPhoto.tags.slice(0, 5).map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-olive-500/15 text-olive-800 dark:text-olive-300 border border-olive-500/25"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-olive-500/20 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-olive-700 dark:text-olive-400 group-hover:translate-x-1.5 transition-transform">
                      <span>{t("showcase.openFullJournal")}</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={t("common.share")}
                        title={copiedShareId === (randomPhoto?.id || randomTrip.id) ? t("common.copied") : t("common.share")}
                        onClick={(e) => handleShare(e, randomTrip.id, randomPhoto?.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-olive-600 dark:hover:text-olive-300 hover:bg-olive-500/10 transition-colors"
                      >
                        {copiedShareId === (randomPhoto?.id || randomTrip.id) ? (
                          <Check className="w-4 h-4 text-olive-500" aria-hidden="true" />
                        ) : (
                          <Share2 className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>

                      <button
                        type="button"
                        aria-label={`Apreciază călătoria ${localizedRandomTrip.title}. Total aprecieri: ${likes[randomTrip.id] || randomTrip.photos.length * 9 + 31}`}
                        title="Apreciază călătoria"
                        onClick={(e) => handleLike(randomTrip.id, e)}
                        className="flex items-center gap-1 text-slate-500 hover:text-rose-500 transition-colors px-3 py-1.5 rounded-xl hover:bg-rose-500/10 focus:ring-2 focus:ring-rose-400"
                      >
                        <Heart className="w-4 h-4 hover:fill-rose-500" aria-hidden="true" />
                        <span className="font-bold text-xs">
                          {likes[randomTrip.id] || randomTrip.photos.length * 9 + 31}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Micro Strip: 3 other suggested memories */}
            {completedTrips.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {completedTrips
                  .filter((_, i) => i !== randomTripIndex % completedTrips.length)
                  .slice(0, 3)
                  .map((trip) => {
                    const photo = getRoleSafePhoto(trip);
                    const cover = photo?.url || defaultPlaceholderImg;
                    const year = trip.year || new Date(trip.startDate).getFullYear();
                    const localizedStripTrip = getLocalizedTrip(trip, language);

                    return (
                      <div
                        key={trip.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Deschide călătoria: ${localizedStripTrip.title} (${photo?.city || photo?.country || `Anul ${year}`})`}
                        onClick={() => onSelectTrip(trip, photo)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectTrip(trip, photo);
                          }
                        }}
                        className="nectar-card group cursor-pointer flex items-center gap-3 p-3 rounded-2xl hover:border-olive-500/50 focus:ring-2 focus:ring-olive-500"
                      >
                        <img
                          src={cover}
                          alt={localizedStripTrip.title}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="overflow-hidden">
                          <h5 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-olive-700 dark:group-hover:text-olive-400">
                            {localizedStripTrip.title}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {photo?.city || photo?.country || `${t("showcase.tripYearMasked").replace("{year}", String(year))}`}
                          </p>
                          <span className="text-[10px] text-olive-700 dark:text-olive-400 font-bold mt-1 inline-block">
                            {trip.photos.length} {t("showcase.memories")} • {t("showcase.seeJournalArrow")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

          </div>
        )}
      </section>

      {/* ==========================================================================
          SECTION 2: COSMIC TRAVEL ODOMETER & GEMINI AI TRIVIA (Based in Sibiu)
          ========================================================================== */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-olive-500/20">
          <div className="flex items-center gap-2.5">
            <Rocket className="w-5 h-5 text-olive-600 dark:text-olive-400" />
            <h3 className="nectar-section-header text-sm sm:text-base text-olive-800 dark:text-olive-300">
              {t("showcase.cosmicSectionTitle")}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {t("showcase.originCity")}
          </span>
        </div>

        {/* Big Odometry Hero Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Main Kilometers Counter */}
          <div className="md:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-olive-500/30 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-olive-500/20 text-olive-800 dark:text-olive-200 border border-olive-500/30 inline-flex items-center gap-1.5 mb-3">
                  <Compass className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" />
                  {t("showcase.cumulativeGeodesic")}
                </span>
                <h4 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                  {cosmicMetrics.totalKm.toLocaleString()}{" "}
                  <span className="text-xl sm:text-2xl font-bold text-olive-700 dark:text-olive-400">km</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {t("showcase.sibiuHaversineDesc")}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-olive-500/10 text-olive-700 dark:text-olive-400">
                <Globe className="w-8 h-8" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-olive-500/20">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {t("showcase.equatorLaps")}
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {cosmicMetrics.equatorLaps} × <span className="text-xs font-semibold text-slate-500">{t("showcase.equatorLapsUnit")}</span>
                </p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {t("showcase.countriesExplored")}
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {cosmicMetrics.countriesVisited.length} <span className="text-xs font-semibold text-slate-500">{t("showcase.countriesExploredUnit")}</span>
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {t("showcase.lightSpeed")}
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {cosmicMetrics.lightSeconds} <span className="text-xs font-semibold text-slate-500">{t("showcase.lightSpeedUnit")}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Origin Badge */}
          <div className="glass-panel p-6 rounded-3xl border border-olive-500/30 flex flex-col justify-between bg-gradient-to-br from-olive-900/10 via-transparent to-olive-950/20">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-olive-800 dark:text-olive-300 uppercase tracking-wider mb-2">
                <Milestone className="w-4 h-4 text-olive-600 dark:text-olive-400" />
                <span>{t("showcase.startingPoint")}</span>
              </div>
              <h5 className="text-xl font-black text-slate-900 dark:text-white">
                {t("showcase.startingPointName")}
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {t("showcase.startingPointDesc")}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-olive-500/15 border border-olive-500/30 mt-4">
              <span className="text-[11px] font-bold text-olive-800 dark:text-olive-300 block">
                {t("showcase.apollo11Equiv")}
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {cosmicMetrics.apollo11Comparison}
              </p>
            </div>
          </div>
        </div>

        {/* Dedicated Partner Travel Distance & Milestones (Only for Partner & Admin) */}
        {isPartnerOrAdmin && partnerMetrics && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-transparent to-olive-500/10 mb-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-500/20 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-rose-600 text-white shadow-md">
                  <Heart className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h5 className="font-black text-base sm:text-xl text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{t("showcase.partnerSectionTitle")}</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                      {t("showcase.partnerSectionBadge")}
                    </span>
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("showcase.partnerSectionDesc")}
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-500/15 px-3 py-1.5 rounded-xl border border-rose-500/30 self-start sm:self-auto">
                {t("showcase.partnerPercentOfTotal").replace("{percent}", String(partnerMetrics.sharedPercentageOfTotal))}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-rose-500/20">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                  {t("showcase.partnerKmTogether")}
                </span>
                <p className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                  {partnerMetrics.sharedKm.toLocaleString()}{" "}
                  <span className="text-xs font-bold text-slate-500">km</span>
                </p>
                <span className="text-[10px] text-slate-500 mt-0.5 block">{t("showcase.partnerFromSibiuReturn")}</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-rose-500/20">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                  {t("showcase.partnerTripsTogether")}
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {partnerMetrics.sharedTripsCount}{" "}
                  <span className="text-xs font-bold text-slate-500">{t("showcase.partnerTripsUnit")}</span>
                </p>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {t("showcase.partnerPhotosTogether").replace("{count}", String(partnerMetrics.sharedPhotosCount))}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-rose-500/20">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                  {t("showcase.partnerEarthCircuits")}
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {partnerMetrics.sharedEquatorLaps} ×
                </p>
                <span className="text-[10px] text-slate-500 mt-0.5 block">{t("showcase.partnerEarthEquator")}</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-rose-500/20">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                  {t("showcase.partnerTowardsMoon")}
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {partnerMetrics.sharedMoonPercentage}%
                </p>
                <span className="text-[10px] text-slate-500 mt-0.5 block">{t("showcase.partnerMoonRoute")}</span>
              </div>
            </div>
          </div>
        )}

        {/* The 3 Cosmic Distance Scales (Moon, Sun, Proxima Centauri) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Scale 1: Distance to the Moon */}
          <div className="glass-panel p-6 rounded-3xl border border-olive-500/30 hover:border-olive-500/60 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  <Moon className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h5 className="font-black text-sm text-slate-900 dark:text-white">{t("showcase.scaleMoonTitle")}</h5>
                  <p className="text-[11px] text-slate-500">{t("showcase.scaleMoonKm")}</p>
                </div>
              </div>
              <span className="text-xs font-black text-olive-700 dark:text-olive-400">
                {cosmicMetrics.moonPercentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-olive-500/15 rounded-full overflow-hidden mb-3 p-0.5 border border-olive-500/30">
              <div
                className="h-full bg-gradient-to-r from-olive-600 to-amber-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(2, cosmicMetrics.moonPercentage))}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t("showcase.scaleMoonDesc").replace("{percent}", String(cosmicMetrics.moonPercentage))}
            </p>
          </div>

          {/* Scale 2: Distance to the Sun */}
          <div className="glass-panel p-6 rounded-3xl border border-olive-500/30 hover:border-olive-500/60 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-600">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-black text-sm text-slate-900 dark:text-white">{t("showcase.scaleSunTitle")}</h5>
                  <p className="text-[11px] text-slate-500">{t("showcase.scaleSunKm")}</p>
                </div>
              </div>
              <span className="text-xs font-black text-olive-700 dark:text-olive-400">
                {cosmicMetrics.sunPercentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-olive-500/15 rounded-full overflow-hidden mb-3 p-0.5 border border-olive-500/30">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-rose-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(1, cosmicMetrics.sunPercentage * 10))}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t("showcase.scaleSunDesc")}
            </p>
          </div>

          {/* Scale 3: Distance to Closest Star (Proxima Centauri) */}
          <div className="glass-panel p-6 rounded-3xl border border-olive-500/30 hover:border-olive-500/60 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-2xl bg-olive-500/20 text-olive-700 dark:text-olive-300">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-black text-sm text-slate-900 dark:text-white">{t("showcase.scaleProximaTitle")}</h5>
                  <p className="text-[11px] text-slate-500">{t("showcase.scaleProximaKm")}</p>
                </div>
              </div>
              <span className="text-xs font-black text-olive-700 dark:text-olive-300">
                4.25 a.l.
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-olive-500/15 rounded-full overflow-hidden mb-3 p-0.5 border border-olive-500/30">
              <div
                className="h-full bg-gradient-to-r from-olive-800 to-olive-500 rounded-full transition-all duration-1000"
                style={{ width: "3%" }}
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t("showcase.scaleProximaDesc")}
            </p>
          </div>
        </div>

        {/* Gemini AI Cosmic Trivia Box */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-olive-500/40 relative overflow-hidden bg-gradient-to-r from-olive-500/10 via-transparent to-olive-600/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-olive-500/20 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-olive-700 text-white shadow-md">
                <Sparkles className="w-4 h-4 text-olive-200" />
              </div>
              <div>
                <h5 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  {t("showcase.triviaTitle")}
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("showcase.triviaSub")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchAiTrivia}
              disabled={isGeneratingTrivia}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-olive-700 hover:bg-olive-800 text-white text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingTrivia ? "animate-spin" : ""}`} />
              <span>{isGeneratingTrivia ? t("showcase.triviaAnalyzing") : t("showcase.triviaGenerateAnother")}</span>
            </button>
          </div>

          {isGeneratingTrivia ? (
            <div className="py-8 text-center">
              <Sparkles className="w-8 h-8 text-olive-600 dark:text-olive-400 animate-pulse mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("showcase.triviaLoadingText")}
              </p>
            </div>
          ) : aiTrivia ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-olive-500/20">
                <span className="text-[11px] font-black uppercase text-olive-800 dark:text-olive-300 tracking-wider block mb-1">
                  {t("showcase.triviaEarthFact")}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {aiTrivia.funFact}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-olive-500/20">
                <span className="text-[11px] font-black uppercase text-olive-800 dark:text-olive-300 tracking-wider block mb-1">
                  {t("showcase.triviaCosmicComparison")}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {aiTrivia.cosmicComparison}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-olive-500/20">
                <span className="text-[11px] font-black uppercase text-olive-800 dark:text-olive-300 tracking-wider block mb-1">
                  {t("showcase.triviaAstronomicalTip")}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {aiTrivia.astronomicalTip}
                </p>
              </div>

              {aiTrivia.partnerBanter && (
                <div className="md:col-span-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
                  <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400 fill-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block mb-0.5">
                      {t("showcase.triviaPartnerJoke")}
                    </span>
                    <p className="text-xs italic text-slate-800 dark:text-slate-200">
                      "{aiTrivia.partnerBanter}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              {t("showcase.triviaEmptyHint")}
            </div>
          )}
        </div>
      </section>

      {/* ==========================================================================
          SECTION 3: UPCOMING EXPEDITIONS & TRAVEL ASSIST
          ========================================================================== */}
      <section>
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-olive-500/20">
          <div className="flex items-center gap-3">
            <h3 className="nectar-section-header text-sm sm:text-base text-olive-800 dark:text-olive-300">
              {t("showcase.upcomingTitle")}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {t("showcase.activePlansCount").replace("{count}", String(plannedTrips.length))}
          </span>
        </div>

        {plannedTrips.length === 0 ? (
          <div className="p-8 text-center rounded-3xl glass-panel border-olive-500/20">
            <Sparkles className="w-10 h-10 text-olive-600 dark:text-olive-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {t("showcase.noPlannedTrips")}
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {t("showcase.noPlannedTripsDesc")}
            </p>
            {(currentUser?.role === "ADMIN" || currentUser?.role === "PARTNER") && (
              <button
                onClick={onOpenTravelPlanner}
                className="px-4 py-2 rounded-xl bg-olive-700 hover:bg-olive-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t("showcase.openTravelAssist")}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {plannedTrips.map((plan) => {
              const planData = plan.planData;
              const localizedPlan = getLocalizedTrip(plan, language);
              const dateStr = formatLocalizedDate(plan.startDate, language, {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <article
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Deschide planul de călătorie: ${localizedPlan.title}`}
                  onClick={() => onSelectTrip(plan)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectTrip(plan);
                    }
                  }}
                  className="nectar-card group cursor-pointer border-dashed border-olive-500/40 focus:ring-2 focus:ring-olive-500"
                >

                  <div className="nectar-image-frame bg-gradient-to-tr from-olive-950 via-olive-900 to-olive-800 p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-olive-700 text-white shadow-sm uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 text-olive-200" />
                        {t("showcase.aiPlannerBadge")}
                      </span>
                      {planData?.days && (
                        <span className="text-xs font-bold text-olive-200">
                          {t("showcase.daysCount").replace("{days}", String(planData.days))}
                        </span>
                      )}
                    </div>

                    <div className="py-4">
                      <Plane className="w-8 h-8 text-olive-400 mb-2 transform -rotate-45" />
                      <h4 className="text-lg font-black text-white line-clamp-1">
                        {localizedPlan.title}
                      </h4>
                      <p className="text-xs text-olive-200/80 mt-1 line-clamp-2">
                        {planData?.destination || localizedPlan.description || (language === "ro" ? "Itinerar generat cu sugestii de obiective." : "Itinerary generated with sightseeing suggestions.")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-olive-300 font-semibold pt-2 border-t border-olive-700/50">
                      <span>{t("showcase.destinationLabel")} {planData?.country || t("showcase.activePlan")}</span>
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-white">
                        <span>{t("showcase.viewPlan")}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  <div className="nectar-meta-bar">
                    <span className="flex items-center gap-1 font-semibold">
                      <Calendar className="w-3 h-3 text-olive-600 dark:text-olive-400" />
                      <span>{dateStr}</span>
                    </span>
                    <span className="text-[11px] text-olive-700 dark:text-olive-400 font-bold uppercase">
                      {t("showcase.statusPlanning")}
                    </span>
                  </div>

                  <div className="nectar-content">
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {planData?.allTargetCheckpoints && planData.allTargetCheckpoints.length > 0
                        ? `${t("showcase.targetCheckpoints")} ${planData.allTargetCheckpoints.join(", ")}`
                        : t("showcase.planReadyDesc")}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { RotateCcw, ZoomIn, ZoomOut, Sparkles, Compass, Map as MapIcon } from "lucide-react";
import { TripData, PhotoData } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import { extractVisitedCountries, fetchWorldCountries, VisitedCountry } from "@/lib/passport";

export interface Globe3DRef {
  flyToLocation: (lat: number, lon: number, altitude?: number) => void;
  resetView: () => void;
}

interface Globe3DProps {
  trips: TripData[];
  filteredPhotos: Array<{ photo: PhotoData; trip: TripData }>;
  onSelectPhoto: (photo: PhotoData, trip: TripData) => void;
  selectedPhoto: PhotoData | null;
  showScratchMap?: boolean;
  onToggleScratchMap?: () => void;
}

export const Globe3D = forwardRef<Globe3DRef, Globe3DProps>(function Globe3D(
  { trips, filteredPhotos, onSelectPhoto, selectedPhoto, showScratchMap, onToggleScratchMap },
  ref
) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  const isLight = resolvedTheme === "light";

  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;

    // Dynamically import globe.gl to ensure client-side WebGL rendering
    import("globe.gl").then((GlobeModule) => {
      if (!isMounted || !containerRef.current) return;

      const Globe = GlobeModule.default;
      const width = containerRef.current.clientWidth || window.innerWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;

      // Initialize Globe with theme-aware background
      const currentIsLight = resolvedTheme === "light";
      const globe = (new (Globe as any)(containerRef.current))
        .width(width)
        .height(height)
        .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
        .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundImageUrl(
          currentIsLight ? "" : "//unpkg.com/three-globe/example/img/night-sky.png"
        )
        .backgroundColor(currentIsLight ? "rgba(0,0,0,0)" : "#030712")
        .showAtmosphere(true)
        .atmosphereColor(currentIsLight ? "#7da62b" : "#38bdf8")
        .atmosphereAltitude(currentIsLight ? 0.25 : 0.2)
        .htmlElementsData(filteredPhotos)
        .htmlLat((d: any) => d.photo.latitude)
        .htmlLng((d: any) => d.photo.longitude)
        .htmlAltitude(0.015)
        .htmlElement((d: any) => {
          const photo: PhotoData = d.photo;
          const trip: TripData = d.trip;

          const isPlanned = trip.status === "PLANNED";
          const isCountry = Boolean(trip.isCountryShowcase || photo.isCountryCover);
          const isPartner = Boolean(trip.withPartner || photo.minRole === "PARTNER");
          const pinClass = isPlanned
            ? "planned-marker"
            : isCountry
            ? "country-marker"
            : isPartner
            ? "partner-marker"
            : photo.isPrivate
            ? "private-marker"
            : "";

          const el = document.createElement("div");
          el.className = "wayward-marker group";
          el.style.pointerEvents = "auto";
          el.style.cursor = "pointer";

          const tooltipSubtitle = isPlanned
            ? "Planificat • Travel Assist (AI)"
            : isCountry
            ? `Vedere Țară • Anul ${trip.year}`
            : trip.isMaskedDate
            ? `Anul ${trip.year}`
            : new Date(photo.takenAt).toLocaleDateString("ro-RO");

          const innerIconHtml = isPlanned && (!photo.url || photo.url.startsWith("/planned"))
            ? `<div class="w-6 h-6 flex items-center justify-center text-white" style="transform: rotate(45deg);">
                 <svg class="w-3.5 h-3.5 text-emerald-100 fill-emerald-100" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
               </div>`
            : `<img src="${photo.thumbnailUrl || photo.url}" alt="" class="marker-inner-img" />`;

          el.innerHTML = `
            <div class="relative">
              <div class="marker-pin ${pinClass}">
                ${innerIconHtml}
              </div>
              <div class="marker-pulse" style="${isPlanned ? "background: rgba(16, 185, 129, 0.4); box-shadow: 0 0 8px #10b981;" : ""}"></div>

              <!-- Tooltip on hover -->
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
                <div class="glass-panel px-3 py-1.5 rounded-xl border ${isPlanned ? "border-emerald-500/60" : isCountry ? "border-amber-500/60" : "border-olive-500/50"} text-center whitespace-nowrap shadow-2xl">
                  <span class="text-xs font-bold text-slate-900 dark:text-white block">${photo.placeName || trip.title}</span>
                  <span class="text-[10px] ${isPlanned ? "text-emerald-400 font-semibold" : isCountry ? "text-amber-400" : "text-olive-600 dark:text-olive-300"} font-medium">
                    ${tooltipSubtitle}
                  </span>
                </div>
                <div class="w-2 h-2 bg-slate-900 border-r border-b ${isPlanned ? "border-emerald-500/60" : isCountry ? "border-amber-500/60" : "border-olive-500/50"} transform rotate-45 -mt-1"></div>
              </div>
            </div>
          `;

          el.onclick = (e) => {
            e.stopPropagation();
            onSelectPhoto(photo, trip);
            globe.pointOfView(
              {
                lat: photo.latitude,
                lng: photo.longitude,
                altitude: isCountry ? 1.0 : 0.6,
              },
              1800
            );
          };

          return el;
        });

      // Initial camera position facing Europe/Mediterranean
      globe.pointOfView({ lat: 40, lng: 15, altitude: 2.2 }, 1500);

      // Enable smooth auto-rotation slightly when user is idle
      const controls = globe.controls();
      if (controls) {
        controls.autoRotate = false;
        controls.autoRotateSpeed = 0.5;
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
      }

      globeInstanceRef.current = globe;
      setIsReady(true);

      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current || !globeInstanceRef.current) return;
        globeInstanceRef.current
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    });

    return () => {
      isMounted = false;
      if (globeInstanceRef.current) {
        globeInstanceRef.current._destructor?.();
      }
    };
  }, []);

  // Update HTML pin markers when filteredPhotos change
  useEffect(() => {
    if (!globeInstanceRef.current || !isReady) return;
    globeInstanceRef.current.htmlElementsData(filteredPhotos);
  }, [filteredPhotos, isReady]);

  // Dynamically update ThreeGlobe background and atmosphere on theme switch
  useEffect(() => {
    if (!globeInstanceRef.current || !isReady) return;
    const currentIsLight = resolvedTheme === "light";
    try {
      globeInstanceRef.current
        .backgroundImageUrl(
          currentIsLight ? "" : "//unpkg.com/three-globe/example/img/night-sky.png"
        )
        .backgroundColor(currentIsLight ? "rgba(0,0,0,0)" : "#030712")
        .atmosphereColor("#7da62b")
        .atmosphereAltitude(currentIsLight ? 0.25 : 0.2);
    } catch (e) {
      console.warn("Could not dynamically update globe canvas theme:", e);
    }
  }, [resolvedTheme, isReady]);

  const [internalShowCountries, setInternalShowCountries] = useState(true);
  const showCountries = showScratchMap !== undefined ? showScratchMap : internalShowCountries;
  const toggleCountries = onToggleScratchMap || (() => setInternalShowCountries((prev) => !prev));
  const [countriesGeoJson, setCountriesGeoJson] = useState<any>(null);

  // Lazy load countries GeoJSON when scratch-map polygon view is enabled
  useEffect(() => {
    if (!showCountries || countriesGeoJson) return;
    fetchWorldCountries()
      .then((features) => {
        if (features && features.length > 0) setCountriesGeoJson(features);
      })
      .catch((err) => console.warn("Could not load countries geojson:", err));
  }, [showCountries, countriesGeoJson]);

  // Update country polygons on globe
  useEffect(() => {
    if (!globeInstanceRef.current || !isReady) return;
    if (!showCountries || !countriesGeoJson) {
      globeInstanceRef.current.polygonsData([]);
      return;
    }

    const visitedCountries = extractVisitedCountries(trips);
    const visitedIsoSet = new Set(visitedCountries.map((c) => c.isoA2.toUpperCase()));
    const visitedIso3Set = new Set(visitedCountries.map((c) => c.isoA3.toUpperCase()));
    const visitedNames = new Set(visitedCountries.map((c) => c.normalizedName.toLowerCase()));
    const visitedMap = new Map<string, VisitedCountry>();
    visitedCountries.forEach((c) => {
      visitedMap.set(c.isoA2.toUpperCase(), c);
      visitedMap.set(c.isoA3.toUpperCase(), c);
      visitedMap.set(c.normalizedName.toLowerCase(), c);
    });

    const currentIsLight = resolvedTheme === "light";

    globeInstanceRef.current
      .polygonsData(countriesGeoJson)
      .polygonAltitude(0.007)
      .polygonCapColor((feat: any) => {
        const iso2 = (feat.properties?.ISO_A2 || "").toUpperCase();
        const iso3 = (feat.properties?.ISO_A3 || "").toUpperCase();
        const name = (feat.properties?.ADMIN || feat.properties?.NAME || "").toLowerCase();
        const isVisited = visitedIsoSet.has(iso2) || visitedIso3Set.has(iso3) || visitedNames.has(name);
        return isVisited
          ? currentIsLight
            ? "rgba(125, 166, 43, 0.45)"
            : "rgba(125, 166, 43, 0.35)"
          : "rgba(0, 0, 0, 0.0)";
      })
      .polygonSideColor(() => "rgba(0, 0, 0, 0.02)")
      .polygonStrokeColor((feat: any) => {
        const iso2 = (feat.properties?.ISO_A2 || "").toUpperCase();
        const iso3 = (feat.properties?.ISO_A3 || "").toUpperCase();
        const name = (feat.properties?.ADMIN || feat.properties?.NAME || "").toLowerCase();
        const isVisited = visitedIsoSet.has(iso2) || visitedIso3Set.has(iso3) || visitedNames.has(name);
        return isVisited ? "rgba(180, 220, 60, 0.8)" : "rgba(255, 255, 255, 0.04)";
      })
      .polygonLabel((feat: any) => {
        const iso2 = (feat.properties?.ISO_A2 || "").toUpperCase();
        const iso3 = (feat.properties?.ISO_A3 || "").toUpperCase();
        const name = (feat.properties?.ADMIN || feat.properties?.NAME || "").toLowerCase();
        const visitedInfo = visitedMap.get(iso2) || visitedMap.get(iso3) || visitedMap.get(name);
        if (!visitedInfo) return "";
        return `
          <div style="background: rgba(18, 28, 14, 0.92); color: white; padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; border: 1px solid rgba(125, 166, 43, 0.5); box-shadow: 0 4px 14px rgba(0,0,0,0.5); backdrop-filter: blur(8px);">
            <span>${visitedInfo.flag}</span> <span style="color: #bef264;">${visitedInfo.name}</span>
            <div style="font-size: 10px; color: #a3e635; font-weight: normal; margin-top: 2px;">
              ✓ Țară Răzuită • ${visitedInfo.tripsCount} ${visitedInfo.tripsCount === 1 ? "călătorie" : "călătorii"}
            </div>
          </div>
        `;
      });
  }, [showCountries, countriesGeoJson, trips, isReady, resolvedTheme]);

  // Expose camera methods via ref
  useImperativeHandle(ref, () => ({
    flyToLocation: (lat: number, lon: number, altitude = 0.55) => {
      if (!globeInstanceRef.current) return;
      globeInstanceRef.current.pointOfView(
        {
          lat,
          lng: lon,
          altitude,
        },
        2000
      );
    },
    resetView: () => {
      if (!globeInstanceRef.current) return;
      globeInstanceRef.current.pointOfView(
        {
          lat: 38,
          lng: 15,
          altitude: 2.2,
        },
        1800
      );
    },
  }));

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none transition-colors duration-500 ${
        isLight
          ? "bg-gradient-to-b from-[#dbe5ce] via-[#edf3e8] to-[#d0ddc4]"
          : "bg-[#050904] stars-overlay"
      }`}
    >
      {/* 3D WebGL Spherical Globe Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Controls */}
      <div className="absolute right-6 top-24 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={toggleCountries}
          aria-label={showCountries ? "Ascunde conturul țărilor vizitate" : "Evidențiază țările vizitate (Harta răzuibilă)"}
          aria-pressed={showCountries}
          title={showCountries ? "Ascunde conturul țărilor" : "Harta răzuibilă: evidențiază țările vizitate"}
          className={`p-3 rounded-2xl transition-all hover:scale-105 ${
            showCountries
              ? "bg-olive-600 text-white shadow-glow ring-2 ring-olive-400"
              : "glass-panel text-slate-700 dark:text-slate-200 hover:text-white hover:bg-olive-700"
          }`}
        >
          <MapIcon className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          onClick={() => {
            if (globeInstanceRef.current) {
              globeInstanceRef.current.pointOfView({ lat: 38, lng: 15, altitude: 2.2 }, 1800);
            }
          }}
          title="Resetare la vederea din spațiu"
          className="p-3 glass-panel-glow rounded-2xl text-olive-700 dark:text-olive-300 hover:text-white hover:bg-olive-700 transition-all hover:scale-105 shadow-glow"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            if (globeInstanceRef.current) {
              const currentPov = globeInstanceRef.current.pointOfView();
              globeInstanceRef.current.pointOfView(
                { ...currentPov, altitude: Math.max(0.3, currentPov.altitude * 0.7) },
                600
              );
            }
          }}
          title="Zoom In"
          className="p-3 glass-panel rounded-2xl text-slate-700 dark:text-slate-200 hover:text-white hover:bg-olive-700 transition-all hover:scale-105"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            if (globeInstanceRef.current) {
              const currentPov = globeInstanceRef.current.pointOfView();
              globeInstanceRef.current.pointOfView(
                { ...currentPov, altitude: Math.min(3.5, currentPov.altitude * 1.4) },
                600
              );
            }
          }}
          title="Zoom Out"
          className="p-3 glass-panel rounded-2xl text-slate-700 dark:text-slate-200 hover:text-white hover:bg-olive-700 transition-all hover:scale-105"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

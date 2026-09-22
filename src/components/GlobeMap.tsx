"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import maplibregl from "maplibre-gl";
import { Compass, RotateCcw, Layers, ZoomIn, ZoomOut, Sparkles, Map as MapIcon } from "lucide-react";
import { TripData, PhotoData } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import { extractVisitedCountries, fetchWorldCountries, getCachedWorldCountries, VisitedCountry } from "@/lib/passport";

export interface GlobeMapRef {
  flyToLocation: (lat: number, lon: number, zoom?: number) => void;
  resetView: () => void;
}

interface GlobeMapProps {
  trips: TripData[];
  filteredPhotos: Array<{ photo: PhotoData; trip: TripData }>;
  onSelectPhoto: (photo: PhotoData, trip: TripData) => void;
  selectedPhoto: PhotoData | null;
  showScratchMap?: boolean;
  onToggleScratchMap?: () => void;
}

const CARTO_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CARTO_VOYAGER = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

export const GlobeMap = forwardRef<GlobeMapRef, GlobeMapProps>(function GlobeMap(
  { trips, filteredPhotos, onSelectPhoto, selectedPhoto, showScratchMap, onToggleScratchMap },
  ref
) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const [mapStyle, setMapStyle] = useState<"dark" | "voyager">(isLight ? "voyager" : "dark");
  const [isGlobeLoaded, setIsGlobeLoaded] = useState(false);

  const [internalShowCountries, setInternalShowCountries] = useState(true);
  const showCountries = showScratchMap !== undefined ? showScratchMap : internalShowCountries;
  const toggleCountries = onToggleScratchMap || (() => setInternalShowCountries((prev) => !prev));
  const [countriesGeoJson, setCountriesGeoJson] = useState<any>(() => getCachedWorldCountries());

  // Sync internal mapStyle when user toggles global theme
  useEffect(() => {
    setMapStyle(resolvedTheme === "light" ? "voyager" : "dark");
  }, [resolvedTheme]);

  // Lazy load countries GeoJSON when scratch-map polygon view is enabled
  useEffect(() => {
    if (!showCountries || countriesGeoJson) return;
    fetchWorldCountries()
      .then((features) => {
        if (features && features.length > 0) setCountriesGeoJson(features);
      })
      .catch((err) => console.warn("Could not load countries geojson for map:", err));
  }, [showCountries, countriesGeoJson]);

  // Initialize MapLibre with 3D Globe projection
  useEffect(() => {
    if (!mapContainerRef.current) return;
    setIsGlobeLoaded(false);

    const initialStyle = resolvedTheme === "light" ? CARTO_VOYAGER : CARTO_DARK;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle === "dark" ? CARTO_DARK : CARTO_VOYAGER,
      center: [15, 38], // Mediterranean / Europe view
      zoom: 1.8, // Orbit view showing the full globe
      pitch: 15,
      bearing: 0,
    });

    // Try setting 3D globe projection if supported by maplibre version
    map.on("load", () => {
      try {
        if ((map as any).setProjection) {
          (map as any).setProjection({ name: "globe" });
        }
      } catch (err) {
        console.log("Standard map projection in use:", err);
      }
      setIsGlobeLoaded(true);
    });

    mapRef.current = map;

    return () => {
      if (hoverPopupRef.current) {
        hoverPopupRef.current.remove();
        hoverPopupRef.current = null;
      }
      markersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [mapStyle]);

  // Expose flyTo and reset methods to parent via ref
  useImperativeHandle(ref, () => ({
    flyToLocation: (lat: number, lon: number, zoom = 11) => {
      if (!mapRef.current) return;
      mapRef.current.flyTo({
        center: [lon, lat],
        zoom,
        pitch: 45,
        bearing: 0,
        essential: true,
        duration: 2500,
      });
    },
    resetView: () => {
      if (!mapRef.current) return;
      mapRef.current.flyTo({
        center: [15, 38],
        zoom: 1.8,
        pitch: 15,
        bearing: 0,
        duration: 2000,
      });
    },
  }));

  // Update Markers on map when filteredPhotos change
  useEffect(() => {
    if (!mapRef.current || !isGlobeLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;

    filteredPhotos.forEach(({ photo, trip }) => {
      if (typeof photo.latitude !== "number" || typeof photo.longitude !== "number") return;

      const isSelected = selectedPhoto?.id === photo.id;
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

      // Create custom HTML element for marker
      const el = document.createElement("div");
      el.className = "wayward-marker group";

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

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectPhoto(photo, trip);
        map.flyTo({
          center: [photo.longitude, photo.latitude],
          zoom: isCountry ? 5 : 10,
          pitch: 45,
          duration: 2200,
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([photo.longitude, photo.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [filteredPhotos, selectedPhoto, isGlobeLoaded, onSelectPhoto]);

  // Update visited countries scratch map layer on MapLibre
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isGlobeLoaded) return;

    const sourceId = "scratch-countries";
    const fillLayerId = "scratch-countries-fill";
    const lineLayerId = "scratch-countries-line";

    const updateScratchLayers = () => {
      if (!mapRef.current) return;
      const m = mapRef.current;

      if (!showCountries || !countriesGeoJson || countriesGeoJson.length === 0) {
        try {
          if (m.getLayer(lineLayerId)) m.removeLayer(lineLayerId);
          if (m.getLayer(fillLayerId)) m.removeLayer(fillLayerId);
          if (m.getSource(sourceId)) m.removeSource(sourceId);
        } catch (e) {
          // ignore cleanup errors during style switch
        }
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
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

      const visitedFeatures = countriesGeoJson
        .filter((feat: any) => {
          const iso2 = (feat.properties?.ISO_A2 || "").toUpperCase();
          const iso3 = (feat.properties?.ISO_A3 || "").toUpperCase();
          const name = (feat.properties?.ADMIN || feat.properties?.NAME || "").toLowerCase();
          return visitedIsoSet.has(iso2) || visitedIso3Set.has(iso3) || visitedNames.has(name);
        })
        .map((feat: any) => {
          const iso2 = (feat.properties?.ISO_A2 || "").toUpperCase();
          const iso3 = (feat.properties?.ISO_A3 || "").toUpperCase();
          const name = (feat.properties?.ADMIN || feat.properties?.NAME || "").toLowerCase();
          const visitedInfo = visitedMap.get(iso2) || visitedMap.get(iso3) || visitedMap.get(name);
          return {
            ...feat,
            properties: {
              ...feat.properties,
              visitedName: visitedInfo?.name || feat.properties?.ADMIN || feat.properties?.NAME,
              visitedFlag: visitedInfo?.flag || "🌍",
              visitedTrips: visitedInfo?.tripsCount || 1,
            },
          };
        });

      const geoData: any = {
        type: "FeatureCollection",
        features: visitedFeatures,
      };

      try {
        const existingSource = m.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (existingSource) {
          existingSource.setData(geoData);
        } else {
          m.addSource(sourceId, {
            type: "geojson",
            data: geoData,
          });
        }

        const isLightMode = resolvedTheme === "light";

        if (!m.getLayer(fillLayerId)) {
          m.addLayer({
            id: fillLayerId,
            type: "fill",
            source: sourceId,
            paint: {
              "fill-color": isLightMode ? "#7da62b" : "#84cc16",
              "fill-opacity": isLightMode ? 0.35 : 0.3,
            },
          });

          // Add interactive hover tooltip
          m.on("mousemove", fillLayerId, (e) => {
            if (!e.features || e.features.length === 0) return;
            m.getCanvas().style.cursor = "pointer";
            const props: any = e.features[0].properties;

            if (!hoverPopupRef.current) {
              hoverPopupRef.current = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: "scratch-country-popup",
                offset: 12,
              });
            }

            const countText = props.visitedTrips === 1 ? "călătorie" : "călătorii";
            hoverPopupRef.current
              .setLngLat(e.lngLat)
              .setHTML(`
                <div style="background: rgba(18, 28, 14, 0.92); color: white; padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; border: 1px solid rgba(125, 166, 43, 0.5); box-shadow: 0 4px 14px rgba(0,0,0,0.5); backdrop-filter: blur(8px);">
                  <span>${props.visitedFlag || "🌍"}</span> <span style="color: #bef264;">${props.visitedName || "Țară"}</span>
                  <div style="font-size: 10px; color: #a3e635; font-weight: normal; margin-top: 2px;">
                    ✓ Țară Răzuită • ${props.visitedTrips || 1} ${countText}
                  </div>
                </div>
              `)
              .addTo(m);
          });

          m.on("mouseleave", fillLayerId, () => {
            m.getCanvas().style.cursor = "";
            if (hoverPopupRef.current) {
              hoverPopupRef.current.remove();
              hoverPopupRef.current = null;
            }
          });
        } else {
          m.setPaintProperty(fillLayerId, "fill-color", isLightMode ? "#7da62b" : "#84cc16");
          m.setPaintProperty(fillLayerId, "fill-opacity", isLightMode ? 0.35 : 0.3);
        }

        if (!m.getLayer(lineLayerId)) {
          m.addLayer({
            id: lineLayerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": isLightMode ? "#65a30d" : "#bef264",
              "line-width": 1.5,
              "line-opacity": 0.85,
            },
          });
        } else {
          m.setPaintProperty(lineLayerId, "line-color", isLightMode ? "#65a30d" : "#bef264");
          m.setPaintProperty(lineLayerId, "line-opacity", 0.85);
        }
      } catch (err) {
        console.warn("Could not update scratch layers on MapLibre:", err);
      }
    };

    updateScratchLayers();

    // In case style was still completing on first tick, listen to styledata
    const handleStyleData = () => {
      if (!map.getSource(sourceId)) {
        updateScratchLayers();
      }
    };
    map.on("styledata", handleStyleData);

    return () => {
      map.off("styledata", handleStyleData);
    };
  }, [showCountries, countriesGeoJson, trips, isGlobeLoaded, resolvedTheme, mapStyle]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden transition-colors duration-500 ${
        isLight ? "bg-[#f4f7f0]" : "bg-[#060b04] stars-overlay"
      }`}
    >
      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Map Navigation Controls */}
      <div className="absolute right-6 top-24 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Toggle Scratch Map (Harta Răzuibilă) */}
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

        {/* Reset to 3D Orbit View */}
        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.flyTo({
                center: [15, 38],
                zoom: 1.8,
                pitch: 15,
                bearing: 0,
                duration: 2000,
              });
            }
          }}
          title="Resetare la vederea din orbită (Pământ 3D)"
          className="p-3 glass-panel-glow rounded-2xl text-olive-700 dark:text-olive-300 hover:text-white hover:bg-olive-700 transition-all hover:scale-105 shadow-glow"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Zoom In */}
        <button
          onClick={() => mapRef.current?.zoomIn({ duration: 600 })}
          title="Zoom In"
          className="p-3 glass-panel rounded-2xl text-slate-700 dark:text-slate-200 hover:text-white hover:bg-olive-700 transition-all hover:scale-105"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => mapRef.current?.zoomOut({ duration: 600 })}
          title="Zoom Out"
          className="p-3 glass-panel rounded-2xl text-slate-700 dark:text-slate-200 hover:text-white hover:bg-olive-700 transition-all hover:scale-105"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        {/* Toggle Style (Dark vs Light Voyager) */}
        <button
          onClick={() => setMapStyle((s) => (s === "dark" ? "voyager" : "dark"))}
          title={mapStyle === "dark" ? "Comută la harta detaliată" : "Comută la modul Dark Cosmic"}
          className="p-3 glass-panel rounded-2xl text-slate-700 dark:text-slate-200 hover:text-olive-700 dark:hover:text-olive-300 hover:bg-olive-500/20 transition-all hover:scale-105"
        >
          <Layers className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
} from "react";
import maplibregl from "maplibre-gl";
import {
  Compass,
  RotateCcw,
  Layers,
  ZoomIn,
  ZoomOut,
  Map as MapIcon,
  Globe2,
  Sparkles,
  Heart,
  Star,
  Eye,
  Info,
} from "lucide-react";
import { TripData, PhotoData, SpotPinData, SafeUser } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import {
  extractVisitedCountries,
  fetchWorldCountries,
  getCachedWorldCountries,
} from "@/lib/passport";
import { groupPhotosIntoSpots, filterSpotsByRole } from "@/lib/spatial";

export interface UnifiedAtlasMapRef {
  flyToLocation: (lat: number, lon: number, zoomLevel?: number) => void;
  resetView: () => void;
}

interface UnifiedAtlasMapProps {
  trips: TripData[];
  filteredPhotos: Array<{ photo: PhotoData; trip: TripData }>;
  onSelectPhoto: (photo: PhotoData, trip: TripData) => void;
  onSelectSpot?: (spot: SpotPinData) => void;
  selectedPhoto: PhotoData | null;
  currentUser: SafeUser | null;
  showScratchMap?: boolean;
  onToggleScratchMap?: () => void;
}

const CARTO_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CARTO_VOYAGER = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

// Threshold where transition between 3D Globe and 2D Street Map occurs
const TRANSITION_ALTITUDE_THRESHOLD = 0.38; // In globe.gl units
const TRANSITION_ZOOM_THRESHOLD = 8.5; // In maplibre units

export const UnifiedAtlasMap = forwardRef<UnifiedAtlasMapRef, UnifiedAtlasMapProps>(
  function UnifiedAtlasMap(
    {
      trips,
      filteredPhotos,
      onSelectPhoto,
      onSelectSpot,
      selectedPhoto,
      currentUser,
      showScratchMap = true,
      onToggleScratchMap,
    },
    ref
  ) {
    const { resolvedTheme } = useTheme();
    const isLight = resolvedTheme === "light";

    // Containers
    const globeContainerRef = useRef<HTMLDivElement>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Instances
    const globeInstanceRef = useRef<any>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const hoverPopupRef = useRef<maplibregl.Popup | null>(null);

    // State
    const [isGlobeReady, setIsGlobeReady] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);
    // currentActiveLayer: "globe" when looking from high altitude, "street" when zoomed in
    const [activeLayer, setActiveLayer] = useState<"globe" | "street">("globe");
    const [mapStyle, setMapStyle] = useState<"dark" | "voyager">(isLight ? "voyager" : "dark");
    const [countriesGeoJson, setCountriesGeoJson] = useState<any>(() => getCachedWorldCountries());
    const isTransitioningRef = useRef(false);

    // Group photos into physical spots
    const rawSpots = useMemo(() => {
      const photos = filteredPhotos.map((fp) => fp.photo);
      return groupPhotosIntoSpots(photos, trips, 90);
    }, [filteredPhotos, trips]);

    // Role-filtered spots
    const visibleSpots = useMemo(() => {
      return filterSpotsByRole(rawSpots, currentUser);
    }, [rawSpots, currentUser]);

    // Group spots into city/regional macro clusters for 3D Globe display
    const cityClusters = useMemo(() => {
      const cityMap = new Map<
        string,
        {
          key: string;
          cityName: string;
          country: string;
          latitude: number;
          longitude: number;
          spots: SpotPinData[];
          totalPhotos: number;
          coverPhoto: PhotoData;
          hasPartner: boolean;
        }
      >();

      visibleSpots.forEach((spot) => {
        const cityKey = spot.city?.toLowerCase() || `${Math.round(spot.latitude)}_${Math.round(spot.longitude)}`;
        const existing = cityMap.get(cityKey);

        if (!existing) {
          cityMap.set(cityKey, {
            key: cityKey,
            cityName: spot.city || spot.name,
            country: spot.country || "",
            latitude: spot.latitude,
            longitude: spot.longitude,
            spots: [spot],
            totalPhotos: spot.totalPhotosCount,
            coverPhoto: spot.coverPhoto,
            hasPartner: spot.hasPartnerPhotos,
          });
        } else {
          existing.spots.push(spot);
          existing.totalPhotos += spot.totalPhotosCount;
          if (spot.hasPartnerPhotos) existing.hasPartner = true;
        }
      });

      return Array.from(cityMap.values());
    }, [visibleSpots]);

    // Sync theme with map style
    useEffect(() => {
      setMapStyle(resolvedTheme === "light" ? "voyager" : "dark");
    }, [resolvedTheme]);

    // Preload scratch map world countries
    useEffect(() => {
      if (!showScratchMap || countriesGeoJson) return;
      fetchWorldCountries()
        .then((features) => {
          if (features && features.length > 0) setCountriesGeoJson(features);
        })
        .catch((err) => console.warn("Could not load countries geojson:", err));
    }, [showScratchMap, countriesGeoJson]);

    // =========================================================================
    // 1. INITIALIZE THREEGLOBE (3D GLOBE ENGINE)
    // =========================================================================
    useEffect(() => {
      if (!globeContainerRef.current) return;
      let isMounted = true;

      import("globe.gl").then((GlobeModule) => {
        if (!isMounted || !globeContainerRef.current) return;

        const Globe = GlobeModule.default;
        const width = globeContainerRef.current.clientWidth || window.innerWidth;
        const height = globeContainerRef.current.clientHeight || window.innerHeight;

        const currentIsLight = resolvedTheme === "light";
        const globe = (new (Globe as any)(globeContainerRef.current))
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
          .htmlLat((d: any) => d.latitude)
          .htmlLng((d: any) => d.longitude)
          .htmlAltitude(0.018)
          .htmlElement((d: any) => {
            // Render city cluster bubble
            const el = document.createElement("div");
            el.className = "wayward-marker group";
            el.style.pointerEvents = "auto";
            el.style.cursor = "pointer";

            const isPartnerSpot = Boolean(d.hasPartner && (currentUser?.role === "PARTNER" || currentUser?.role === "ADMIN"));
            const badgeClass = isPartnerSpot
              ? "border-rose-400 bg-rose-950/80 text-rose-200"
              : "border-olive-400 bg-olive-950/80 text-olive-200";

            el.innerHTML = `
              <div class="relative flex items-center justify-center">
                <div class="w-10 h-10 rounded-2xl overflow-hidden border-2 ${isPartnerSpot ? "border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)]" : "border-olive-400 shadow-[0_0_15px_rgba(132,169,40,0.6)]"} bg-slate-900 transition-transform duration-300 hover:scale-115">
                  <img src="${d.coverPhoto?.thumbnailUrl || d.coverPhoto?.url || ""}" alt="${d.cityName}" class="w-full h-full object-cover" />
                </div>
                ${d.totalPhotos > 1 ? `<span class="absolute -top-1.5 -right-2 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full border shadow-sm ${badgeClass}">${d.totalPhotos}</span>` : ""}
              </div>
              <div class="marker-tooltip glass-panel-glow">
                <p class="font-bold text-xs text-white">${d.cityName}</p>
                <p class="text-[10px] text-slate-300">${d.country ? `${d.country} • ` : ""}${d.totalPhotos} fotografii</p>
                <p class="text-[9px] text-olive-300 font-semibold mt-1">Apasă pentru zoom stradal</p>
              </div>
            `;

            // On clicking city cluster: animate camera to low altitude, triggering the 2D street transition!
            el.onclick = (e) => {
              e.stopPropagation();
              transitionToStreet(d.latitude, d.longitude, 12);
            };

            return el;
          });

        // Initial view over Europe / Sibiu
        globe.pointOfView({ lat: 45.79, lng: 24.12, altitude: 2.2 }, 1500);

        const controls = globe.controls();
        if (controls) {
          controls.autoRotate = false;
          controls.enableDamping = true;
          controls.dampingFactor = 0.05;

          // Listen to camera altitude changes for automatic zoom-in transition
          controls.addEventListener("change", () => {
            if (isTransitioningRef.current) return;
            const pov = globe.pointOfView();
            if (pov && pov.altitude !== undefined) {
              if (pov.altitude <= TRANSITION_ALTITUDE_THRESHOLD) {
                // User zoomed in past threshold -> seamless crossfade into Street Map!
                transitionToStreet(pov.lat, pov.lng, 10.5);
              }
            }
          });
        }

        globeInstanceRef.current = globe;
        setIsGlobeReady(true);

        const handleResize = () => {
          if (!globeContainerRef.current || !globeInstanceRef.current) return;
          globeInstanceRef.current
            .width(globeContainerRef.current.clientWidth)
            .height(globeContainerRef.current.clientHeight);
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

    // Update Globe city cluster markers
    useEffect(() => {
      if (!globeInstanceRef.current || !isGlobeReady) return;
      globeInstanceRef.current.htmlElementsData(cityClusters);
    }, [cityClusters, isGlobeReady]);

    // Update country scratch polygons on Globe
    useEffect(() => {
      if (!globeInstanceRef.current || !isGlobeReady) return;
      if (!showScratchMap || !countriesGeoJson) {
        globeInstanceRef.current.polygonsData([]);
        return;
      }

      const visitedCountries = extractVisitedCountries(trips);
      const visitedMap = new Map<string, any>();
      visitedCountries.forEach((vc) => {
        if (vc.isoA2) visitedMap.set(vc.isoA2.toUpperCase(), vc);
        if (vc.isoA3) visitedMap.set(vc.isoA3.toUpperCase(), vc);
      });

      const currentIsLight = resolvedTheme === "light";
      const fillColor = currentIsLight ? "rgba(125, 166, 43, 0.40)" : "rgba(132, 169, 40, 0.35)";
      const strokeColor = currentIsLight ? "rgba(77, 104, 25, 0.85)" : "rgba(197, 233, 110, 0.85)";

      globeInstanceRef.current
        .polygonsData(countriesGeoJson)
        .polygonCapColor((feat: any) => {
          const props = feat.properties || {};
          const iso2 = (props.ISO_A2 || props.iso_a2 || "").toUpperCase();
          const iso3 = (props.ISO_A3 || props.iso_a3 || "").toUpperCase();
          return visitedMap.has(iso2) || visitedMap.has(iso3) ? fillColor : "rgba(0,0,0,0)";
        })
        .polygonSideColor(() => "rgba(0,0,0,0)")
        .polygonStrokeColor((feat: any) => {
          const props = feat.properties || {};
          const iso2 = (props.ISO_A2 || props.iso_a2 || "").toUpperCase();
          const iso3 = (props.ISO_A3 || props.iso_a3 || "").toUpperCase();
          return visitedMap.has(iso2) || visitedMap.has(iso3) ? strokeColor : "rgba(0,0,0,0)";
        })
        .polygonAltitude(0.005);
    }, [trips, showScratchMap, countriesGeoJson, isGlobeReady, resolvedTheme]);

    // =========================================================================
    // 2. INITIALIZE MAPLIBRE (2D STREET ENGINE)
    // =========================================================================
    useEffect(() => {
      if (!mapContainerRef.current) return;
      setIsMapReady(false);

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapStyle === "dark" ? CARTO_DARK : CARTO_VOYAGER,
        center: [24.12, 45.79], // Initialized on Sibiu, updated during transition
        zoom: 11,
        pitch: 20,
        bearing: 0,
      });

      map.on("load", () => {
        setIsMapReady(true);
      });

      // Listen to zoom-out on 2D map to trigger seamless return to 3D Globe!
      map.on("zoomend", () => {
        if (isTransitioningRef.current) return;
        const currentZoom = map.getZoom();
        if (currentZoom < TRANSITION_ZOOM_THRESHOLD) {
          const center = map.getCenter();
          transitionToGlobe(center.lat, center.lng);
        }
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

    // Render Detailed Spot Markers on MapLibre
    useEffect(() => {
      const targetMap = mapRef.current;
      if (!targetMap || !isMapReady) return;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      visibleSpots.forEach((spot) => {
        const el = document.createElement("div");
        el.className = "wayward-marker group";
        el.style.cursor = "pointer";

        const isPartnerSpot = Boolean(spot.hasPartnerPhotos && (currentUser?.role === "PARTNER" || currentUser?.role === "ADMIN"));
        const borderStyle = isPartnerSpot
          ? "border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.7)]"
          : "border-olive-400 shadow-[0_0_12px_rgba(132,169,40,0.6)]";

        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-10 h-10 rounded-2xl overflow-hidden border-2 ${borderStyle} bg-slate-900 transition-transform duration-200 hover:scale-115 active:scale-95">
              <img src="${spot.coverPhoto?.thumbnailUrl || spot.coverPhoto?.url || ""}" alt="${spot.name}" class="w-full h-full object-cover" />
            </div>
            ${spot.totalPhotosCount > 1 ? `<span class="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-900 border border-olive-400 text-white shadow-md">+${spot.totalPhotosCount}</span>` : ""}
          </div>
          <div class="marker-tooltip glass-panel-glow">
            <p class="font-bold text-xs text-white">${spot.name}</p>
            <p class="text-[10px] text-slate-300">${spot.city ? `${spot.city} • ` : ""}${spot.totalPhotosCount} fotografii</p>
          </div>
        `;

        el.onclick = (e) => {
          e.stopPropagation();
          if (onSelectSpot) {
            onSelectSpot(spot);
          } else {
            const firstTrip = trips.find((t) => t.id === spot.tripIds[0]) || trips[0];
            onSelectPhoto(spot.coverPhoto, firstTrip);
          }
        };

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([spot.longitude, spot.latitude])
          .addTo(targetMap);

        markersRef.current.push(marker);
      });
    }, [visibleSpots, isMapReady, onSelectPhoto, onSelectSpot, trips, currentUser]);

    // =========================================================================
    // 3. SEAMLESS SMART TRANSITIONS (NO SUDDEN JUMPS)
    // =========================================================================
    const transitionToStreet = useCallback((lat: number, lon: number, targetZoom = 12) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      // 1. Move map synchronously to exact target coordinates before crossfade
      if (mapRef.current) {
        mapRef.current.jumpTo({
          center: [lon, lat],
          zoom: targetZoom - 1,
        });
      }

      // 2. Animate globe camera smoothly into position
      if (globeInstanceRef.current) {
        globeInstanceRef.current.pointOfView({ lat, lng: lon, altitude: 0.15 }, 800);
      }

      // 3. Cross-fade: Bring street map forward, then ease in final zoom
      setTimeout(() => {
        setActiveLayer("street");
        if (mapRef.current) {
          mapRef.current.easeTo({
            zoom: targetZoom,
            duration: 900,
          });
        }
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 900);
      }, 400);
    }, []);

    const transitionToGlobe = useCallback((lat: number, lon: number) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      // 1. Align globe to current street map center
      if (globeInstanceRef.current) {
        globeInstanceRef.current.pointOfView({ lat, lng: lon, altitude: 0.5 }, 0);
      }

      // 2. Cross-fade: Fade street map out, reveal 3D globe
      setActiveLayer("globe");

      // 3. Smoothly pull camera back into orbit
      setTimeout(() => {
        if (globeInstanceRef.current) {
          globeInstanceRef.current.pointOfView({ lat, lng: lon, altitude: 1.6 }, 1200);
        }
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 1200);
      }, 300);
    }, []);

    // Expose flyTo and resetView methods via Ref
    useImperativeHandle(ref, () => ({
      flyToLocation: (lat: number, lon: number, zoomLevel = 13) => {
        transitionToStreet(lat, lon, zoomLevel);
      },
      resetView: () => {
        transitionToGlobe(45.79, 24.12);
      },
    }));

    return (
      <div className="w-full h-full relative overflow-hidden bg-slate-950">
        {/* =========================================================================
            LAYER 1: THREEGLOBE (WebGL 3D Earth for Global / Regional View)
            ========================================================================= */}
        <div
          ref={globeContainerRef}
          className="absolute inset-0 w-full h-full z-10"
          style={{
            pointerEvents: activeLayer === "globe" ? "auto" : "none",
          }}
        />

        {/* =========================================================================
            LAYER 2: MAPLIBRE GL (Detailed 2D Street Vector Map) with Smooth Crossfade
            ========================================================================= */}
        <div
          ref={mapContainerRef}
          className={`absolute inset-0 w-full h-full z-20 transition-opacity duration-500 ease-in-out ${
            activeLayer === "street" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        />

        {/* =========================================================================
            LAYER 3: UNIFIED SMART TOOLBAR (Right Side)
            ========================================================================= */}
        <div className="absolute top-24 right-4 sm:right-6 z-30 flex flex-col gap-2 pointer-events-auto animate-fade-in">
          {/* Active Mode Indicator Pill */}
          <div className="glass-panel px-3 py-1.5 rounded-full border border-olive-500/30 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shadow-md">
            {activeLayer === "globe" ? (
              <>
                <Globe2 className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400 animate-spin-slow" />
                <span>Terra 3D</span>
              </>
            ) : (
              <>
                <MapIcon className="w-3.5 h-3.5 text-olive-600 dark:text-olive-400" />
                <span>Stradal Detaliat</span>
              </>
            )}
          </div>

          {/* Scratch Map Polygon Toggle */}
          {onToggleScratchMap && (
            <button
              onClick={onToggleScratchMap}
              title={showScratchMap ? "Ascunde țările vizitate" : "Arată țările vizitate (Scratch Map)"}
              className={`p-2.5 rounded-2xl glass-panel border transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center ${
                showScratchMap
                  ? "bg-olive-600/30 border-olive-400 text-olive-800 dark:text-olive-300"
                  : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MapIcon className="w-4 h-4" />
            </button>
          )}

          {/* Reset / Orbit View Button */}
          <button
            onClick={() => transitionToGlobe(45.79, 24.12)}
            title="Resetează la vedere de ansamblu (Glob)"
            className="p-2.5 rounded-2xl glass-panel border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-olive-700 dark:hover:text-white hover:border-olive-500/50 transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Zoom In */}
          <button
            onClick={() => {
              if (activeLayer === "globe") {
                const pov = globeInstanceRef.current?.pointOfView();
                if (pov) transitionToStreet(pov.lat, pov.lng, 11);
              } else {
                mapRef.current?.zoomIn();
              }
            }}
            title="Apropie (Zoom In)"
            className="p-2.5 rounded-2xl glass-panel border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-olive-700 dark:hover:text-white hover:border-olive-500/50 transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => {
              if (activeLayer === "street") {
                mapRef.current?.zoomOut();
              } else {
                const pov = globeInstanceRef.current?.pointOfView();
                if (pov) globeInstanceRef.current?.pointOfView({ altitude: pov.altitude * 1.5 }, 600);
              }
            }}
            title="Depărtează (Zoom Out)"
            className="p-2.5 rounded-2xl glass-panel border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-olive-700 dark:hover:text-white hover:border-olive-500/50 transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
);

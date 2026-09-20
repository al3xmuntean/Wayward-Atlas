"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import maplibregl from "maplibre-gl";
import { Compass, RotateCcw, Layers, ZoomIn, ZoomOut, Sparkles } from "lucide-react";
import { TripData, PhotoData } from "@/lib/types";

export interface GlobeMapRef {
  flyToLocation: (lat: number, lon: number, zoom?: number) => void;
  resetView: () => void;
}

interface GlobeMapProps {
  trips: TripData[];
  filteredPhotos: Array<{ photo: PhotoData; trip: TripData }>;
  onSelectPhoto: (photo: PhotoData, trip: TripData) => void;
  selectedPhoto: PhotoData | null;
}

const CARTO_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CARTO_VOYAGER = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

export const GlobeMap = forwardRef<GlobeMapRef, GlobeMapProps>(function GlobeMap(
  { trips, filteredPhotos, onSelectPhoto, selectedPhoto },
  ref
) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapStyle, setMapStyle] = useState<"dark" | "voyager">("dark");
  const [isGlobeLoaded, setIsGlobeLoaded] = useState(false);

  // Initialize MapLibre with 3D Globe projection
  useEffect(() => {
    if (!mapContainerRef.current) return;

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

      // Create custom HTML element for marker
      const el = document.createElement("div");
      el.className = "wayward-marker group";

      el.innerHTML = `
        <div class="relative">
          <div class="marker-pin ${photo.isPrivate ? "private-marker" : ""}">
            <img src="${photo.thumbnailUrl || photo.url}" alt="" class="marker-inner-img" />
          </div>
          <div class="marker-pulse"></div>
          
          <!-- Tooltip on hover -->
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
            <div class="glass-panel px-3 py-1.5 rounded-xl border border-cyan-500/40 text-center whitespace-nowrap shadow-2xl">
              <span class="text-xs font-bold text-white block">${photo.placeName || trip.title}</span>
              <span class="text-[10px] text-cyan-300 font-medium">
                ${trip.isMaskedDate ? `Anul ${trip.year}` : new Date(photo.takenAt).toLocaleDateString("ro-RO")}
              </span>
            </div>
            <div class="w-2 h-2 bg-slate-900 border-r border-b border-cyan-500/40 transform rotate-45 -mt-1"></div>
          </div>
        </div>
      `;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectPhoto(photo, trip);
        map.flyTo({
          center: [photo.longitude, photo.latitude],
          zoom: 10,
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

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 stars-overlay">
      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Map Navigation Controls */}
      <div className="absolute right-6 top-24 z-20 flex flex-col gap-2 pointer-events-auto">
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
          className="p-3 glass-panel-glow rounded-2xl text-cyan-300 hover:text-white hover:bg-slate-800 transition-all hover:scale-105 shadow-glow"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Zoom In */}
        <button
          onClick={() => mapRef.current?.zoomIn({ duration: 600 })}
          title="Zoom In"
          className="p-3 glass-panel rounded-2xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all hover:scale-105"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => mapRef.current?.zoomOut({ duration: 600 })}
          title="Zoom Out"
          className="p-3 glass-panel rounded-2xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all hover:scale-105"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        {/* Toggle Style (Dark vs Light Voyager) */}
        <button
          onClick={() => setMapStyle((s) => (s === "dark" ? "voyager" : "dark"))}
          title={mapStyle === "dark" ? "Comută la harta detaliată" : "Comută la modul Dark Cosmic"}
          className="p-3 glass-panel rounded-2xl text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all hover:scale-105"
        >
          <Layers className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { RotateCcw, ZoomIn, ZoomOut, Sparkles, Compass } from "lucide-react";
import { TripData, PhotoData } from "@/lib/types";

export interface Globe3DRef {
  flyToLocation: (lat: number, lon: number, altitude?: number) => void;
  resetView: () => void;
}

interface Globe3DProps {
  trips: TripData[];
  filteredPhotos: Array<{ photo: PhotoData; trip: TripData }>;
  onSelectPhoto: (photo: PhotoData, trip: TripData) => void;
  selectedPhoto: PhotoData | null;
}

export const Globe3D = forwardRef<Globe3DRef, Globe3DProps>(function Globe3D(
  { filteredPhotos, onSelectPhoto, selectedPhoto },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let isMounted = true;

    // Dynamically import globe.gl to ensure client-side WebGL rendering
    import("globe.gl").then((GlobeModule) => {
      if (!isMounted || !containerRef.current) return;

      const Globe = GlobeModule.default;
      const width = containerRef.current.clientWidth || window.innerWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;

      // Initialize Globe
      const globe = (new (Globe as any)(containerRef.current))
        .width(width)
        .height(height)
        .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
        .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
        .showAtmosphere(true)
        .atmosphereColor("#38bdf8")
        .atmosphereAltitude(0.2)
        .htmlElementsData(filteredPhotos)
        .htmlLat((d: any) => d.photo.latitude)
        .htmlLng((d: any) => d.photo.longitude)
        .htmlAltitude(0.015)
        .htmlElement((d: any) => {
          const photo: PhotoData = d.photo;
          const trip: TripData = d.trip;

          const el = document.createElement("div");
          el.className = "wayward-marker group";
          el.style.pointerEvents = "auto";
          el.style.cursor = "pointer";

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

          el.onclick = (e) => {
            e.stopPropagation();
            onSelectPhoto(photo, trip);
            globe.pointOfView(
              {
                lat: photo.latitude,
                lng: photo.longitude,
                altitude: 0.6,
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
    <div className="relative w-full h-full overflow-hidden bg-slate-950 stars-overlay select-none">
      {/* 3D WebGL Spherical Globe Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Controls */}
      <div className="absolute right-6 top-24 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={() => {
            if (globeInstanceRef.current) {
              globeInstanceRef.current.pointOfView({ lat: 38, lng: 15, altitude: 2.2 }, 1800);
            }
          }}
          title="Resetare la vederea din spațiu"
          className="p-3 glass-panel-glow rounded-2xl text-cyan-300 hover:text-white hover:bg-slate-800 transition-all hover:scale-105 shadow-glow"
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
          className="p-3 glass-panel rounded-2xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all hover:scale-105"
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
          className="p-3 glass-panel rounded-2xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all hover:scale-105"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});
